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

const EXPECTED_FACILITY = {
  code: '654321',
  displayName: 'za MomConnect Existing',
  id: 'facility1'
}

const config1 = {
  routes: [{
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/2.31/api/organisationUnits',
    'cronPattern': '* * * * *',
    'cronTimezone': 'Africa/Johannesburg'
  }, {
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/2.32/api/organisationUnits',
    'cronPattern': '* * * * *',
    'cronTimezone': 'Africa/Johannesburg'
  }]
}

const config2 = {
  routes: [{
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/2.33/api/organisationUnits',
    'cronPattern': '* * * * *',
    'cronTimezone': 'Africa/Johannesburg'
  }, {
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/2.32/api/organisationUnits',
    'cronPattern': '* * * * *',
    'cronTimezone': 'Africa/Johannesburg'
  }]
}

const config3 = {
  routes: [{
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/2.33/api/organisationUnits',
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
    server.once('request', function (_req, res) {
      const facilityData = {
        organisationUnits: [EXPECTED_FACILITY]
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
    it('should update the cron and routes with the new config once', function (next) {
      Utils.updateConfig(app, mediatorConfig.config.routes, config1.routes)
      assert.equal(Utils.cronJobs['http://localhost:8000/2.32/api/organisationUnits'].cronTime.source, '* * * * *')
      assert.equal(Utils.cronJobs['http://localhost:8000/2.31/api/organisationUnits'].cronTime.source, '* * * * *')
      // Default url cronjob should be removed
      assert.equal(Utils.cronJobs['http://admin:district@localhost:8002/api/organisationUnits.json'], null)
      assert.equal(findRoute(app, '/2.31/api/organisationUnits'), true)
      assert.equal(findRoute(app, '/2.32/api/organisationUnits'), true)
      // Default url route should be removed
      assert.equal(findRoute(app, '/api/organisationUnits.json'), false)
      next()
    })

    it('should update the cron and routes with the new config twice', function (next) {
      Utils.updateConfig(app, mediatorConfig.config.routes, config1.routes)
      Utils.updateConfig(app, config1.routes, config2.routes)
      assert.equal(Utils.cronJobs['http://localhost:8000/2.32/api/organisationUnits'].cronTime.source, '* * * * *')
      assert.equal(Utils.cronJobs['http://localhost:8000/2.33/api/organisationUnits'].cronTime.source, '* * * * *')
      assert.equal(Utils.cronJobs['http://localhost:8000/2.31/api/organisationUnits'], null)
      assert.equal(findRoute(app, '/2.33/api/organisationUnits'), true)
      assert.equal(findRoute(app, '/2.32/api/organisationUnits'), true)
      assert.equal(findRoute(app, '/2.31/api/organisationUnits'), false)
      next()
    })

    it('should update the cron and routes with the new config thrice', function (next) {
      Utils.updateConfig(app, mediatorConfig.config.routes, config1.routes)
      Utils.updateConfig(app, config1.routes, config2.routes)
      Utils.updateConfig(app, config2.routes, config3.routes)
      assert.equal(Utils.cronJobs['http://localhost:8000/2.32/api/organisationUnits'], null)
      assert.equal(Utils.cronJobs['http://localhost:8000/2.33/api/organisationUnits'].cronTime.source, '2 0 * * *')
      assert.equal(findRoute(app, '/2.33/api/organisationUnits'), true)
      assert.equal(findRoute(app, '/2.32/api/organisationUnits'), false)
      next()
    })
  })
})

