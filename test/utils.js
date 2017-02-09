'use strict'

const Lab = require('lab')
const Utils = require('../lib/utils')
const mediatorConfig = require('../config/mediator')
const Cache = require('../lib/cache')
const HTTP = require('http')
const findRoute = require('express-remove-route').findRoute

const EXPECTED_FACILITY = ['654321', 'existing', 'za MomConnect Existing']
const EXPECTED_HEADERS = [
  {name: 'value', column: 'value', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'uid', column: 'uid', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'name', column: 'name', type: 'java.lang.String', hidden: false, meta: false}
]

var expect = Lab.assertions
var lab = exports.lab = Lab.script()

let config1 = {
  routes: [{
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/api/sqlViews/1',
    'cronPattern': '* * * *',
    'cronTimezone': 'UCT'
  }, {
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/api/sqlViews/2',
    'cronPattern': '* * * * *',
    'cronTimezone': 'UCT'
  }]
}

let config2 = {
  routes: [{
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/api/sqlViews/3',
    'cronPattern': '* * * *',
    'cronTimezone': 'UCT'
  }, {
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/api/sqlViews/2',
    'cronPattern': '* * * * *',
    'cronTimezone': 'UCT'
  }]
}

var app
var facilityCache
var facilityCacheServer
var server = HTTP.createServer()

lab.describe('Utils', function () {
  lab.before(function (next) {
    server.once('request', function (req, res) {
      var facilityData = {
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
      facilityCache = require('../lib')
      facilityCache.setupConfig((err, appConfig) => {
        if (err) {
          throw err
        }
        app = facilityCache.setupApp(mediatorConfig.config, appConfig)
        facilityCacheServer = app.listen(8001, {})
      })
    })
  })

  lab.after(function (next) {
    facilityCacheServer.on('close', () => {
      Cache.close(next)
    })
    server.close(() => {
      facilityCacheServer.close()
    })
  })

  lab.describe('Update Config', function () {
    lab.it('should update the cron and routes with the new config', function (next) {
      Utils.updateConfig(app, mediatorConfig.config.routes, config1.routes)
      // console.log(Utils.cronJobs)
      expect(Object.keys(Utils.cronJobs)[0]).to.equal('http://localhost:8000/api/sqlViews/1')
      expect(Object.keys(Utils.cronJobs)[1]).to.equal('http://localhost:8000/api/sqlViews/2')
      expect(findRoute(app, '/api/sqlViews/1').route.route.path).to.equal('/api/sqlViews/1')
      expect(findRoute(app, '/api/sqlViews/2').route.route.path).to.equal('/api/sqlViews/2')
      expect(findRoute(app, '/staging/api/sqlViews/Cj0HSoDpa0P/data.json').route.route).to.not.exist()
      next()
    })

    lab.it('should update the cron and routes with the new config', function (next) {
      Utils.updateConfig(app, config1.routes, config2.routes)
      expect(Object.keys(Utils.cronJobs)[0]).to.equal('http://localhost:8000/api/sqlViews/3')
      expect(Object.keys(Utils.cronJobs)[1]).to.equal('http://localhost:8000/api/sqlViews/2')
      expect(findRoute(app, '/api/sqlViews/3').route.route.path).to.equal('/api/sqlViews/3')
      expect(findRoute(app, '/api/sqlViews/2').route.route.path).to.equal('/api/sqlViews/2')
      expect(findRoute(app, '/api/sqlViews/1').route.route).to.not.exist()
      next()
    })
  })
})
