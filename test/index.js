'use strict'

const HTTP = require('http')
const Needle = require('needle')
const Cache = require('../lib/cache')
const Level = require('level')
const Path = require('path')
const assert = require('assert')

const facilityCache = require('../lib')
const testConfig = require('../lib/config')

const EXPECTED_FACILITY = ['654321', 'existing', 'za MomConnect Existing']
const EXPECTED_HEADERS = [
  {name: 'value', column: 'value', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'uid', column: 'uid', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'name', column: 'name', type: 'java.lang.String', hidden: false, meta: false}
]
const URL = 'http://admin:district@localhost:8001/api/sqlViews/1/data.json'

// Set the config options for running the tests
process.env.REGISTER_MEDIATOR = 'false'

const server = HTTP.createServer()

describe('Facility Proxy', function () {
  before(Cache.open)
  before(function (next) {
    server.on('request', function (req, res) {
      const facilityData = {
        listGrid: {
          title: 'FacilityRegistry',
          headers: EXPECTED_HEADERS,
          rows: [
            ['', 'missing', 'za MomConnect Missing'],
            EXPECTED_FACILITY
          ]
        }
      }
      res.writeHead(200, {'Content-Type': 'application/json'})
      res.end(JSON.stringify(facilityData))
    })
    server.listen(8002, function () {
      // Start the app
      let conf = testConfig.getApiConfig()
      facilityCache.start(conf, (err) => {
        if (err) { throw err }
      })
    })
    next()
  })

  after(function (next) {
    server.close(() => {
      facilityCache.stop(() => {
        Cache.close(() => {
          const path = Path.join(__dirname, '..', 'cache')
          Level.destroy(path, next)
        })
      })
    })
  })

  describe('Heartbeat', function () {
    it('should return the process uptime', function (next) {
      Needle.get('http://localhost:8001/heartbeat', function (err, res) {
        if (err) {
          return next(err)
        }
        assert.equal(typeof res.body.uptime, 'number')
        next()
      })
    })
  })

  describe('API calls', function () {
    describe('with no criteria query parameter', function () {
      it('should return a 200 response code and no facility data', function (next) {
        Needle.get(URL, function (err, res) {
          if (err) {
            return next(err)
          }
          assert.equal(res.statusCode, 200)
          assert.equal(res.body.width, 0)
          assert.deepEqual(res.body.headers, [])
          assert.equal(res.body.height, 0)
          assert.deepEqual(res.body.rows, [])
          next()
        })
      })
    })

    describe('with no criteria value', function () {
      it('should return a 200 response code and no facility data', function (next) {
        Needle.get(URL + '?criteria=fail', function (err, res) {
          if (err) {
            return next(err)
          }
          assert.equal(res.statusCode, 200)
          assert.equal(res.body.width, 0)
          assert.deepEqual(res.body.headers, [])
          assert.equal(res.body.height, 0)
          assert.deepEqual(res.body.rows, [])
          next()
        })
      })
    })

    describe('with an invalid criteria value', function () {
      it('should return a 200 response code and no facility data', function (next) {
        Needle.get(URL + '?criteria=value:fail', function (err, res) {
          if (err) {
            return next(err)
          }
          assert.equal(res.statusCode, 200)
          assert.equal(res.body.width, 0)
          assert.deepEqual(res.body.headers, [])
          assert.equal(res.body.height, 0)
          assert.deepEqual(res.body.rows, [])
          next()
        })
      })
    })

    describe('with a non-existent facility code', function () {
      it('should return a 200 response code and no facility data', function (next) {
        Needle.get(URL + '?criteria=value:123456', function (err, res) {
          if (err) {
            return next(err)
          }
          assert.equal(res.statusCode, 200)
          assert.equal(res.body.width, 0)
          assert.deepEqual(res.body.headers, [])
          assert.equal(res.body.height, 0)
          assert.deepEqual(res.body.rows, [])
          next()
        })
      })
    })

    describe('with an existing facility code queried by value', function () {
      it('should return a 200 response code and the asserted facility', function (next) {
        Needle.get(URL + '?criteria=value:654321', function (err, res) {
          if (err) {
            return next(err)
          }

          assert.equal(res.statusCode, 200)
          assert.equal(res.body.title, 'FacilityRegistry')
          assert.equal(res.body.width, 3)
          assert.deepEqual(res.body.headers, EXPECTED_HEADERS)
          assert.equal(res.body.height, 1)
          assert.deepEqual(res.body.rows[0], EXPECTED_FACILITY)
          next()
        })
      })
    })

    describe('with an existing facility code queried by code', function () {
      it('should return a 200 response code and the asserted facility', function (next) {
        Needle.get(URL + '?criteria=code:654321', function (err, res) {
          if (err) {
            return next(err)
          }
          assert.equal(res.statusCode, 200)
          assert.equal(res.body.title, 'FacilityRegistry')
          assert.equal(res.body.width, 3)
          assert.deepEqual(res.body.headers, EXPECTED_HEADERS)
          assert.equal(res.body.height, 1)
          assert.deepEqual(res.body.rows[0], EXPECTED_FACILITY)
          next()
        })
      })
    })
  })
})
