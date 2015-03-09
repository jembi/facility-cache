'use strict';

var Cache = require('./cache');
var Confit = require('confit');
var CronJob = require('cron').CronJob;
var Express = require('express');
var Middleware = require('./middleware');
var Needle = require('needle');
var Path = require('path');
var Routes = require('./routes');
var URL = require('url');
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

  // Fetch all data and add it to the cache
  function populateCache() {
    Winston.info('Populating cache');

    // Fetch the facility data
    var url = URL.resolve(config.get('dhis:url'), config.get('dhis:path'));
    Needle.get(url, function(err, res) {
      if (err) {
        return Winston.error('Fetching facility data failed', {err: err.message});
      }

      var stream = Cache.createWriteStream();
      stream.on('error', function(err) {
        Winston.error('Storing facility data failed', {err: err.message});
      });
      stream.on('close', function() {
        Winston.info('Finished populating cache');
      });

      var headers = res.body.headers;

      // Add each facility to the cache
      res.body.rows.forEach(function(row) {
        var key = row[0];
        if (!key) {
          return Winston.error('Facility missing value', {facility: row});
        }
        stream.write({key: key, value: {headers: headers, row: row}});
      });

      stream.end();
    });
  }

  // Populate the cache on startup
  populateCache();
  // Repopulate the cache based on the cron pattern
  new CronJob(config.get('cron:pattern'), populateCache, true, config.get('cron:timezone'));

  // Set up the routes
  app.use(Middleware.stats(config.get('statsd')));
  app.get(config.get('dhis:path'), Routes.facilityCodeLookup);

  // Start the server
  app.listen(config.get('port'), function() {
    Winston.info('Server started');
  });
});

module.exports = app;
