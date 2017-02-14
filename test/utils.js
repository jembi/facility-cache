'use strict'

const Lab = require('lab')
const Utils = require('../lib/utils')
const mediatorConfig = require('../config/mediator')
const Cache = require('../lib/cache')
const HTTP = require('http')
const findRoute = require('express-remove-route').findRoute
const Level = require('level')
const Path = require('path')
const facilityCache = require('../lib')

const EXPECTED_FACILITY = ['654321', 'existing', 'za MomConnect Existing']
const EXPECTED_HEADERS = [
  {name: 'value', column: 'value', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'uid', column: 'uid', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'name', column: 'name', type: 'java.lang.String', hidden: false, meta: false}
]

const expect = Lab.assertions
const lab = exports.lab = Lab.script()

const config1 = {
  routes: [{
    'dhisUrl': 'http://localhost:8000',
    'dhisPath': '/api/sqlViews/1',
    'cronPattern': '* * * *',
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
    'cronPattern': '* * * *',
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
    'cronPattern': '0 0 0 0 0',
    'cronTimezone': 'Africa/Johannesburg'
  }]
}

let app
let facilityCacheServer
const server = HTTP.createServer()

lab.describe('Utils', function () {
  lab.before(function (next) {
    server.once('request', function (req, res) {
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
      facilityCache.setupConfig((err, appConfig) => {
        if (err) {
          throw err
        }
        app = facilityCache.setupApp(mediatorConfig.config, appConfig)
        facilityCacheServer = app.listen(8003)
      })
    })
  })

  lab.after(function (next) {
    server.close(() => {
      facilityCacheServer.close(() => {
        Cache.db.close(() => {
          const path = Path.join(__dirname, '..', 'data')
          Level.destroy(path, next)
        })
      })
    })
  })

  lab.describe('Update Config', function () {
    lab.it('should update the cron and routes with the new config', function (next) {
      Utils.updateConfig(app, mediatorConfig.config.routes, config1.routes)
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/1']).to.exist()
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/2']).to.exist()
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/2'].cronTime.source).to.equal('* * * * *')
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/1'].cronTime.source).to.equal('* * * *')
      expect(Utils.cronJobs['http://admin:district@localhost:8002/staging/api/sqlViews/Cj0HSoDpa0P/data.json']).to.not.exist()
      expect(findRoute(app, '/api/sqlViews/1').route.route.path).to.equal('/api/sqlViews/1')
      expect(findRoute(app, '/api/sqlViews/2').route.route.path).to.equal('/api/sqlViews/2')
      expect(findRoute(app, '/staging/api/sqlViews/Cj0HSoDpa0P/data.json').route.route).to.not.exist()
      next()
    })

    lab.it('should update the cron and routes with the new config', function (next) {
      Utils.updateConfig(app, config1.routes, config2.routes)
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/2']).to.exist()
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/3']).to.exist()
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/2'].cronTime.source).to.equal('* * * * *')
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/3'].cronTime.source).to.equal('* * * *')
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/1']).to.not.exist()
      expect(findRoute(app, '/api/sqlViews/3').route.route.path).to.equal('/api/sqlViews/3')
      expect(findRoute(app, '/api/sqlViews/2').route.route.path).to.equal('/api/sqlViews/2')
      expect(findRoute(app, '/api/sqlViews/1').route.route).to.not.exist()
      next()
    })

    lab.it('should update the cron and routes with the new config', function (next) {
      Utils.updateConfig(app, config2.routes, config3.routes)
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/3']).to.exist()
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/2']).to.not.exist()
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/3'].cronTime.source).to.equal('0 0 0 0 0')
      expect(findRoute(app, '/api/sqlViews/3').route.route.path).to.equal('/api/sqlViews/3')
      expect(findRoute(app, '/api/sqlViews/2').route.route).to.not.exist()
      next()
    })
  })
})

