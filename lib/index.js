'use strict';

var Confit = require('confit');
var CronJob = require('cron').CronJob;
var Express = require('express');
var Middleware = require('./middleware');
var Path = require('path');
var Routes = require('./routes');
var URL = require('url');
var Utils = require('./utils');
var Winston = require('winston');

var app = Express();

// Load the config
Confit(Path.join(__dirname, '..', 'config')).create(function(err, config) {
  if (err) {
    throw err;
  }

  // Make the config accessible to all routes
  Object.defineProperty(app.locals, 'config', {value: config});

  Winston.clear();
  Winston.add(Winston.transports.Console, {timestamp: true, level: config.get('logging:level')});

  var url = URL.resolve(config.get('dhis:url'), config.get('dhis:path'));
  // Populate the cache on startup
  Utils.populateCache(url);
  // Repopulate the cache based on the cron pattern
  new CronJob(config.get('cron:pattern'), Utils.populateCache.bind(null, url), true, config.get('cron:timezone'));

  // Set up the routes
  app.use(Middleware.stats(config.get('statsd')));
  app.get(config.get('dhis:path'), Routes.facilityCodeLookup);

  // Start the server
  app.listen(config.get('port'), function() {
    Winston.info('Server started');
  });
});

module.exports = app;
