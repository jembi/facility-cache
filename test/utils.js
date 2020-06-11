'use strict'

const Utils = require('../lib/utils')
const mediatorConfig = require('../config/mediator')
const Cache = require('../lib/cache')
const HTTP = require('http')
const Level = require('level')
const Path = require('path')
const facilityCache = require('../lib')
const testConfig = require('../lib/config')
const assert = require('assert')

const EXPECTED_FACILITY = ['654321', 'existing', 'za MomConnect Existing']
const EXPECTED_HEADERS = [
  {name: 'value', column: 'value', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'uid', column: 'uid', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'name', column: 'name', type: 'java.lang.String', hidden: false, meta: false}
]

const config1 = {
  routes: [{
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/api/sqlViews/1',
    'cronPattern': '* * * * *',
    'cronTimezone': 'Africa/Johannesburg'
  }, {
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/api/sqlViews/2',
    'cronPattern': '* * * * *',
    'cronTimezone': 'Africa/Johannesburg'
  }]
}

const config2 = {
  routes: [{
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/api/sqlViews/3',
    'cronPattern': '* * * * *',
    'cronTimezone': 'Africa/Johannesburg'
  }, {
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/api/sqlViews/2',
    'cronPattern': '* * * * *',
    'cronTimezone': 'Africa/Johannesburg'
  }]
}

const config3 = {
  routes: [{
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/api/sqlViews/3',
    'cronPattern': '2 0 * * *',
    'cronTimezone': 'Africa/Johannesburg'
  }]
}

// express 4.14.1 specific
function findRoute(app, path) {
  const stack = app._router.stack
  let flag = false
  stack.forEach((layer) => {
    if(layer && layer.route && layer.route.path === path) {
      flag = true
    }
  })
  return flag
}

let app
let mockServer
const server = HTTP.createServer()

describe('Utils', function () {
  before(Cache.open)
  beforeEach(function (next) {
    server.once('request', function (req, res) {
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
      next()
    })
    mockServer = server.listen(8002, function () {
      app = facilityCache.setupApp(mediatorConfig.config, testConfig.getApiConfig())
    })
  })

  afterEach(function (next) {
    mockServer.close(() => {
      Cache.close(() => {
        Utils.resetCronJobs()
        const path = Path.join(__dirname, '..', 'cache')
        Level.destroy(path, next)
      })
    })
  })

  describe('Update Config', function () {
    it('should update the cron and routes with the new config', function (next) {
      Utils.updateConfig(app, mediatorConfig.config.routes, config1.routes)
      assert.equal(Utils.cronJobs['http://localhost:8000/api/sqlViews/2'].cronTime.source, '* * * * *')
      assert.equal(Utils.cronJobs['http://localhost:8000/api/sqlViews/1'].cronTime.source, '* * * * *')
      assert.equal(Utils.cronJobs['http://admin:district@localhost:8002/staging/api/sqlViews/Cj0HSoDpa0P/data.json'], null)
      assert.equal(findRoute(app, '/api/sqlViews/1'), true)
      assert.equal(findRoute(app, '/api/sqlViews/2'), true)
      assert.equal(findRoute(app, '/staging/api/sqlViews/Cj0HSoDpa0P/data.json'), false)
      next()
    })

    it('should update the cron and routes with the new config', function (next) {
      Utils.updateConfig(app, mediatorConfig.config.routes, config1.routes)
      Utils.updateConfig(app, config1.routes, config2.routes)
      assert.equal(Utils.cronJobs['http://localhost:8000/api/sqlViews/2'].cronTime.source, '* * * * *')
      assert.equal(Utils.cronJobs['http://localhost:8000/api/sqlViews/3'].cronTime.source, '* * * * *')
      assert.equal(Utils.cronJobs['http://localhost:8000/api/sqlViews/1'], null)
      assert.equal(findRoute(app, '/api/sqlViews/3'), true)
      assert.equal(findRoute(app, '/api/sqlViews/2'), true)
      assert.equal(findRoute(app, '/api/sqlViews/1'), false)
      next()
    })

    it('should update the cron and routes with the new config', function (next) {
      Utils.updateConfig(app, mediatorConfig.config.routes, config1.routes)
      Utils.updateConfig(app, config1.routes, config2.routes)
      Utils.updateConfig(app, config2.routes, config3.routes)
      assert.equal(Utils.cronJobs['http://localhost:8000/api/sqlViews/2'], null)
      assert.equal(Utils.cronJobs['http://localhost:8000/api/sqlViews/3'].cronTime.source, '2 0 * * *')
      assert.equal(findRoute(app, '/api/sqlViews/3'), true)
      assert.equal(findRoute(app, '/api/sqlViews/2'), false)
      next()
    })
  })
})

