'use strict'

const HTTP = require('http')
const Lab = require('lab')
const Needle = require('needle')
const Cache = require('../lib/cache')
const Level = require('level')
const Path = require('path')

const facilityCache = require('../lib')
const testConfig = require('../lib/config')

const EXPECTED_FACILITY = ['654321', 'existing', 'za MomConnect Existing']
const EXPECTED_HEADERS = [
  {name: 'value', column: 'value', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'uid', column: 'uid', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'name', column: 'name', type: 'java.lang.String', hidden: false, meta: false}
]
const URL = 'http://admin:district@localhost:8001/api/sqlViews/1/data.json'

const expect = Lab.assertions
const lab = exports.lab = Lab.script()
const server = HTTP.createServer()

console.log('process.env.TRUSTED_SELF_SIGNED='+process.env.TRUSTED_SELF_SIGNED)
console.log('process.env.REGISTER_MEDIATOR='+process.env.REGISTER_MEDIATOR)

lab.describe('Facility Proxy', function () {
  lab.before(Cache.open)
  lab.before(function (next) {
    server.on('request', function (req, res) {
      const facilityData = {
        title: 'FacilityRegistry',
        headers: EXPECTED_HEADERS,
        rows: [
          ['', 'missing', 'za MomConnect Missing'],
          EXPECTED_FACILITY
        ]
      }
      res.writeHead(200, {'Content-Type': 'application/json'})
      res.end(JSON.stringify(facilityData))
      next()
    })
    server.listen(8002, function () {
      // Start the app
      let conf = testConfig.configure()
      facilityCache.start(conf, (err) => {
        if (err) { throw err }
      })
    })
  })

  lab.after(function (next) {
    server.close(() => {
      facilityCache.stop(() => {
        Cache.close(() => {
          const path = Path.join(__dirname, '..', 'cache')
          Level.destroy(path, next)
        })
      })
    })
  })

  lab.describe('Heartbeat', function () {
    lab.it('should return the process uptime', function (next) {
      Needle.get('http://localhost:8001/heartbeat', function (err, res) {
        if (err) {
          return next(err)
        }
        expect(res.body.uptime).to.be.a.number()
        next()
      })
    })
  })

  lab.describe('API calls', function () {
    lab.describe('with no criteria query parameter', function () {
      lab.it('should return a 200 response code and no facility data', function (next) {
        Needle.get(URL, function (err, res) {
          if (err) {
            return next(err)
          }
          expect(res.statusCode).to.equal(200)
          expect(res.body.width).to.equal(0)
          expect(res.body.headers).to.be.empty()
          expect(res.body.height).to.equal(0)
          expect(res.body.rows).to.be.empty()
          next()
        })
      })
    })

    lab.describe('with no criteria value', function () {
      lab.it('should return a 200 response code and no facility data', function (next) {
        Needle.get(URL + '?criteria=fail', function (err, res) {
          if (err) {
            return next(err)
          }
          expect(res.statusCode).to.equal(200)
          expect(res.body.width).to.equal(0)
          expect(res.body.headers).to.be.empty()
          expect(res.body.height).to.equal(0)
          expect(res.body.rows).to.be.empty()
          next()
        })
      })
    })

    lab.describe('with an invalid criteria value', function () {
      lab.it('should return a 200 response code and no facility data', function (next) {
        Needle.get(URL + '?criteria=value:fail', function (err, res) {
          if (err) {
            return next(err)
          }
          expect(res.statusCode).to.equal(200)
          expect(res.body.width).to.equal(0)
          expect(res.body.headers).to.be.empty()
          expect(res.body.height).to.equal(0)
          expect(res.body.rows).to.be.empty()
          next()
        })
      })
    })

    lab.describe('with a non-existent facility code', function () {
      lab.it('should return a 200 response code and no facility data', function (next) {
        Needle.get(URL + '?criteria=value:123456', function (err, res) {
          if (err) {
            return next(err)
          }
          expect(res.statusCode).to.equal(200)
          expect(res.body.width).to.equal(0)
          expect(res.body.headers).to.be.empty()
          expect(res.body.height).to.equal(0)
          expect(res.body.rows).to.be.empty()
          next()
        })
      })
    })

    lab.describe('with an existing facility code queried by value', function () {
      lab.it('should return a 200 response code and the expected facility', function (next) {
        Needle.get(URL + '?criteria=value:654321', function (err, res) {
          if (err) {
            return next(err)
          }

          expect(res.statusCode).to.equal(200)
          expect(res.body.title).to.equal('FacilityRegistry')
          expect(res.body.width).to.equal(3)
          expect(res.body.headers).to.eql(EXPECTED_HEADERS)
          expect(res.body.height).to.equal(1)
          expect(res.body.rows[0]).to.eql(EXPECTED_FACILITY)
          next()
        })
      })
    })

    lab.describe('with an existing facility code queried by code', function () {
      lab.it('should return a 200 response code and the expected facility', function (next) {
        Needle.get(URL + '?criteria=code:654321', function (err, res) {
          if (err) {
            return next(err)
          }
          expect(res.statusCode).to.equal(200)
          expect(res.body.title).to.equal('FacilityRegistry')
          expect(res.body.width).to.equal(3)
          expect(res.body.headers).to.eql(EXPECTED_HEADERS)
          expect(res.body.height).to.equal(1)
          expect(res.body.rows[0]).to.eql(EXPECTED_FACILITY)
          next()
        })
      })
    })
  })
})
