'use strict';

var Cache = require('./cache');
var Confit = require('confit');
var CronJob = require('cron').CronJob;
var Express = require('express');
var Needle = require('needle');
var Path = require('path');
var Routes = require('./routes');
var URL = require('url');
var Winston = require('winston');

var app = Express();

// Load the config
Confit(Path.join(__dirname, 'config')).create(function(err, config) {
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

      // Add each facility to the cache
      res.body.rows.forEach(function(row) {
        var facility = {
          value: row[0],
          uid: row[1],
          name: row[2]
        };
        if (!facility.value) {
          return Winston.error('Facility missing value', {facility: facility});
        }
        stream.write({key: facility.value, value: facility});
      });

      stream.end();
    });
  }

  // Populate the cache on startup
  populateCache();
  // Repopulate the cache based on the cron pattern
  new CronJob(config.get('cron:pattern'), populateCache, true, config.get('cron:timezone'));

  // Set up the routes
  app.get(config.get('dhis:path'), Routes.facilityCodeLookup);

  // Start the server
  app.listen(config.get('port'), function() {
    Winston.info('Server started');
  });
});

module.exports = app;
