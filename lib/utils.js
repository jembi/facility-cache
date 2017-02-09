'use strict';

var Cache = require('./cache');
var Mustache = require('mustache');
var Needle = require('needle');
var Winston = require('winston');
var CronJob = require('cron').CronJob;
var Path = require('path');
var Routes = require('./routes');
var URL = require('url');
var removeRoute = require('express-remove-route')

var template = '{"title":"{{title}}","headers":{{{headers}}},"rows":[{{{row}}}],"width":{{width}},"height":1}';
Mustache.parse(template);

// Fetch all data and add it to the cache
let populateCache = exports.populateCache = function populateCache(url) {
  Winston.info('Populating cache');

  // Fetch the facility data
  Needle.get(url, function(err, res) {
    if (err) {
      return Winston.error('Fetching facility data failed', {err: err.message});
    }

    if (res.statusCode !== 200) {
      return Winston.error('Non-200 status code: %d', res.statusCode);
    }

    var title = res.body.title;
    var headers = res.body.headers;

    var batch = Cache.batch();

    // Add each facility to the cache
    res.body.rows.forEach(function(row) {
      var key = row[0];
      if (!key) {
        return Winston.error('Facility missing value', {facility: row});
      }
      var body = Mustache.render(template, {
        title: title,
        headers: JSON.stringify(headers),
        row: JSON.stringify(row),
        width: headers.length
      });
      batch.put(key, body);
    });

    batch.write(function(err) {
      if (err) {
        return Winston.error('Storing facility data failed', {err: err.message});
      }
      Winston.info('Finished populating cache');
    });
  });
};

let cronJobs = {}


let addCronJob = exports.addCronJob = (pattern, timezone, url) => {
  cronJobs[url] = new CronJob(pattern, populateCache.bind(null, url), true, timezone);
}

let removeCronJob = (url) => {
  if(cronJobs[url]) {
    cronJobs[url].stop()
    delete cronJobs[url]
  }
}

let addCacheForRoute = exports.addCacheForRoute = (app, path) => {
  app.get(path, Routes.facilityCodeLookup)
}

let removeCacheForRoute = (app, path) => {
  removeRoute(app, path)
}

exports.updateConfig = (app, oldConf, newConf) => {
  let newConfigRoutes = {}
  let existingConfigRoutes = {}
  
  newConf.forEach((route) => {
    var url = URL.resolve(route.dhisUrl, route.dhisPath)
    if(!cronJobs[url]) {
      newConfigRoutes[url] = {
        host: route.dhisUrl,
        path: route.dhisPath,
        pattern: route.cronPattern,
        timezone: route.cronTimezone
      }
    } else {
      existingConfigRoutes[url] = {
        pattern: route.cronPattern,
        timezone: route.cronTimezone
      }
    }
  })
  
  oldConf.forEach((route) => {
    var url = URL.resolve(route.dhisUrl, route.dhisPath)
    if(!newConfigRoutes[url] && !existingConfigRoutes[url]) {
      // delete old routes and crons
      removeCacheForRoute(app, route.dhisPath)
    }
    removeCronJob(url)
  })
  
  for(var key in newConfigRoutes) {
    addCacheForRoute(app, newConfigRoutes[key].path)
    addCronJob(newConfigRoutes[key].pattern, newConfigRoutes[key].timezone, key)
  }
  
  for(var key in existingConfigRoutes) {
    addCronJob(existingConfigRoutes[key].pattern, existingConfigRoutes[key].timezone, key)
  }
}

if(process.env.NODE_ENV === 'test') {
  exports.cronJobs = cronJobs
}
