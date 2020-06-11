'use strict'

const HTTP = require('http')
const Needle = require('needle')
const Cache = require('../lib/cache')
const Level = require('level')
const Path = require('path')
const assert = require('assert')

const facilityCache = require('../lib')
const testConfig = require('../lib/config')

const URL = 'http://admin:district@localhost:8001/api/sqlViews/1/data.json'
const EXPECTED_FACILITY = {
  code: '654321',
  displayName: 'za MomConnect Existing',
  id: 'facility1'
}

// Set the config options for running the tests
process.env.REGISTER_MEDIATOR = 'false'

const server = HTTP.createServer()

describe('Facility Proxy', function () {
  before(Cache.open)
  before(function (next) {
    server.on('request', function (_req, res) {
      res.writeHead(200, {'Content-Type': 'application/json'})
      res.end(JSON.stringify({
        organisationUnits: [ EXPECTED_FACILITY ]
      }))
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
    describe('with no filter query parameter', function () {
      it('should return a 200 response code and no facility data', function (next) {
        Needle.get(URL, function (err, res) {
          if (err) {
            return next(err)
          }
          assert.equal(res.statusCode, 200)
          assert.deepEqual(res.body.organisationUnits, [])
          next()
        })
      })
    })

    describe('with invalid filter value', function () {
      it('should return a 200 response code and no facility data', function (next) {
        Needle.get(URL + '?filter=fail', function (err, res) {
          if (err) {
            return next(err)
          }
          assert.equal(res.statusCode, 200)
          assert.deepEqual(res.body.organisationUnits, [])
          next()
        })
      })
    })

    describe('with an invalid filter value', function () {
      it('should return a 200 response code and no facility data', function (next) {
        Needle.get(URL + '?filter=code:eq:--invalid_characters--', function (err, res) {
          if (err) {
            return next(err)
          }
          assert.equal(res.statusCode, 200)
          assert.deepEqual(res.body.organisationUnits, [])
          next()
        })
      })
    })

    describe('with a non-existent facility code', function () {
      it('should return a 200 response code and no facility data', function (next) {
        Needle.get(URL + '?filter=code:eq:123456', function (err, res) {
          if (err) {
            return next(err)
          }
          assert.equal(res.statusCode, 200)
          assert.deepEqual(res.body.organisationUnits, [])
          next()
        })
      })
    })

    describe('with an existing facility code queried by code', function () {
      it('should return a 200 response code and the asserted facility', function (next) {
        Needle.get(URL + '?filter=code:eq:654321', function (err, res) {
          if (err) {
            return next(err)
          }
          assert.equal(res.statusCode, 200)
          assert.equal(res.body.organisationUnits[0].displayName, 'za MomConnect Existing')
          assert.equal(res.body.organisationUnits[0].id, 'facility1')
          next()
        })
      })
    })
  })
})
