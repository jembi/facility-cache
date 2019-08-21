'use strict'

const Lab = require('lab')
const Utils = require('../lib/utils')
const mediatorConfig = require('../config/mediator')
const Cache = require('../lib/cache')
const HTTP = require('http')
const Level = require('level')
const Path = require('path')
const facilityCache = require('../lib')
const testConfig = require('../config/config')

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
let medConf
let fc
const server = HTTP.createServer()

lab.describe('Utils', function () {
  lab.before(Cache.open)
  lab.beforeEach(function (next) {
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
    fc = server.listen(8002, function () {
      medConf = mediatorConfig.configure()
      app = facilityCache.setupApp(medConf.config, testConfig.configure())
    })
  })

  lab.afterEach(function (next) {
    fc.close(() => {
      fc.close(() => {
        Cache.close(() => {
          Utils.resetCronJobs()
          const path = Path.join(__dirname, '..', 'cache')
          Level.destroy(path, next)
        })
      })
    })
  })

  lab.describe('Update Config', function () {
    lab.it('should update the cron and routes with the new config', function (next) {
      Utils.updateConfig(app, medConf.config.routes, config1.routes)
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/1']).to.exist()
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/2']).to.exist()
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/2'].cronTime.source).to.equal('* * * * *')
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/1'].cronTime.source).to.equal('* * * *')
      expect(Utils.cronJobs['http://admin:district@localhost:8002/staging/api/sqlViews/Cj0HSoDpa0P/data.json']).to.not.exist()
      expect(findRoute(app, '/api/sqlViews/1')).to.be.true()
      expect(findRoute(app, '/api/sqlViews/2')).to.be.true()
      expect(findRoute(app, '/staging/api/sqlViews/Cj0HSoDpa0P/data.json')).to.be.false()
      next()
    })

    lab.it('should update the cron and routes with the new config', function (next) {
      Utils.updateConfig(app, medConf.config.routes, config1.routes)
      Utils.updateConfig(app, config1.routes, config2.routes)
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/2']).to.exist()
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/3']).to.exist()
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/2'].cronTime.source).to.equal('* * * * *')
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/3'].cronTime.source).to.equal('* * * *')
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/1']).to.not.exist()
      expect(findRoute(app, '/api/sqlViews/3')).to.be.true()
      expect(findRoute(app, '/api/sqlViews/2')).to.be.true()
      expect(findRoute(app, '/api/sqlViews/1')).to.be.false()
      next()
    })

    lab.it('should update the cron and routes with the new config', function (next) {
      Utils.updateConfig(app, medConf.config.routes, config1.routes)
      Utils.updateConfig(app, config1.routes, config2.routes)
      Utils.updateConfig(app, config2.routes, config3.routes)
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/3']).to.exist()
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/2']).to.not.exist()
      expect(Utils.cronJobs['http://localhost:8000/api/sqlViews/3'].cronTime.source).to.equal('0 0 0 0 0')
      expect(findRoute(app, '/api/sqlViews/3')).to.be.true()
      expect(findRoute(app, '/api/sqlViews/2')).to.be.false()
      next()
    })
  })
})

