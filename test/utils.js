'use strict';

var Lab = require('lab');
var Utils = require('../lib/utils')
const mediatorConfig = require('../config/mediator')
var Level = require('level');
var Path = require('path');
var Cache = require('../lib/cache');
var HTTP = require('http');

var EXPECTED_FACILITY = ['654321', 'existing', 'za MomConnect Existing'];
var EXPECTED_HEADERS = [
  {name: 'value', column: 'value', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'uid', column: 'uid', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'name', column: 'name', type: 'java.lang.String', hidden: false, meta: false}
];
var URL = 'http://localhost:8001/staging/api/sqlViews/Cj0HSoDpa0P/data.json';

var expect = Lab.assertions;
var lab = exports.lab = Lab.script();

let newConfig = [{
  "dhisUrl": "http://localhost:8000",
  "dhisPath": "/api/sqlViews/2",
  "cronPattern": "* * * *",
  "cronTimezone": "UCT"
}, {
  "dhisUrl": "http://localhost:8000",
  "dhisPath": "/api/sqlViews/2",
  "cronPattern": "* * * * *",
  "cronTimezone": "UCT"
}]

var app
var facilityCache
var facilityCacheServer
var server = HTTP.createServer();

lab.describe('Utils', function() {
  
  lab.before(function(next) {
    server.once('request', function(req, res) {
      var facilityData = {
        title: 'FacilityRegistry',
        headers: EXPECTED_HEADERS,
        rows: [
          ['', 'missing', 'za MomConnect Missing'],
          EXPECTED_FACILITY
        ]
      };
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(facilityData));
      next();
    });
    server.listen(8002, function() {
      facilityCache = require('../lib')
      facilityCache.setupConfig((err, appConfig) => {
        if(err) {
          throw err
        }
        app = facilityCache.setupApp(mediatorConfig.config, appConfig)
        facilityCacheServer = app.listen(8001, {})
      })
    });
  });
  
  lab.after(function(next) {
    facilityCacheServer.on('close', () => {
      var path = Path.join(__dirname, '..', 'data');
      Cache.close(next);
    })
    server.close(() => {
      facilityCacheServer.close()
    })
  })

  lab.describe('Update Config', function() {

    lab.it('should update the cron jobs with the new config', function(next) {
      Utils.updateConfig(app, mediatorConfig.config, newConfig)
      console.log(Utils.cronJobs)
      next();
    });
    
    lab.it('should update the express routes with the new config', function(next) {
      Utils.updateConfig(app, mediatorConfig.config, newConfig)
      console.log(Utils.cronJobs)
      next();
    });
  });
});

