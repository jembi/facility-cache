'use strict';

var Confit = require('confit');
var CronJob = require('cron').CronJob;
var express = require('express');
var Middleware = require('./middleware');
var Path = require('path');
var Routes = require('./routes');
var URL = require('url');
var Utils = require('./utils');
var Winston = require('winston');
const medUtils = require('openhim-mediator-utils')
const mediatorConfig = require('../config/mediator')

let appConfig = {}
let cronJobs = {}

let addCronJob = (pattern, timezone, url) => {
  cronJobs[url] = new CronJob(pattern, Utils.populateCache.bind(null, url), true, timezone);
}

let removeCronJob = (url) => {
  //TODO
}

let addCache = (url, path) => {
  //TODO
}

let removeCache = (url, path) => {
  //TODO
}

function setupApp (config) {
  const app = express()

  // Make the config accessible to all routes
  Object.defineProperty(app.locals, 'config', { value: config });

  Winston.clear();
  Winston.add(Winston.transports.Console, { timestamp: true, level: appConfig.get('logging:level') });
  
  
  var url = URL.resolve(config.routes[0].dhisUrl, config.routes[0].dhisPath);
  // Populate the cache on startup
  Utils.populateCache(url)
  addCronJob(config.routes[0].cronPattern, config.routes[0].cronTimezone, url)

  // Set up the routes
  app.get('/heartbeat', Routes.uptime);
  app.use(Middleware.stats(appConfig.get('statsd')));
  app.get(config.routes[0].dhisPath, Routes.facilityCodeLookup);
  
  return app
}

// Load the config
function start (callback) {
  let apiConf = appConfig.get('openhim')
  
  if (apiConf.api.trustSelfSigned) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }

  if (apiConf.register) {
    medUtils.registerMediator(apiConf.api, mediatorConfig, (err) => {
      if (err) {
        Winston.error('Failed to register this mediator, check your config')
        Winston.error(err.stack)
        process.exit(1)
      }
      apiConf.api.urn = mediatorConfig.urn
      medUtils.fetchConfig(apiConf.api, (err, newConfig) => {
        Winston.info('Received initial config:')
        Winston.info(JSON.stringify(newConfig))
        let config = newConfig
        if (err) {
          Winston.error('Failed to fetch initial config')
          Winston.error(err.stack)
          process.exit(1)
        } else {
          Winston.info('Successfully registered mediator!')
          let app = setupApp(config)
          server = app.listen(appConfig.get('server:port'), () => {
            if (apiConf.heartbeat) {
              let configEmitter = medUtils.activateHeartbeat(apiConf.api)
              configEmitter.on('config', (newConfig) => {
                Winston.info('Received updated config:')
                Winston.info(JSON.stringify(newConfig))
                // set new config for mediator
                config = newConfig

                // we can act on the new config received from the OpenHIM here
                Winston.info(config)
              })
            }
            callback(server)
          })
        }
      })
    })
  } else {
    // default config
    let app = setupApp(mediatorConfig.config)
    server = app.listen(appConfig.get('server:port'), () => callback(server))
  }
}
exports.start = start

Confit(Path.join(__dirname, '..', 'config')).create(function(err, config) {
  if (err) {
    throw err;
  }
  appConfig = config
  
  if (!module.parent) {
    // if this script is run directly, start the server
    start(() => Winston.info(`Listening on ${appConfig.get('server:port')}...`))
  }
})
