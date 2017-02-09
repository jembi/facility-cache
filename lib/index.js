'use strict'

const Confit = require('confit')
const express = require('express')
const Middleware = require('./middleware')
const Path = require('path')
const Routes = require('./routes')
const URL = require('url')
const Utils = require('./utils')
const Winston = require('winston')
const medUtils = require('openhim-mediator-utils')
const mediatorConfig = require('../config/mediator')
const Cache = require('./cache')

var server

function setupApp (config, appConfig) {
  const app = express()

  // Make the config accessible to all routes
  Object.defineProperty(app.locals, 'config', { value: config })

  Winston.clear()
  Winston.add(Winston.transports.Console, { timestamp: true, level: appConfig.get('logging:level') })

  // Set up the routes
  app.get('/heartbeat', Routes.uptime)
  app.use(Middleware.stats(appConfig.get('statsd')))

  config.routes.forEach((route) => {
    var url = URL.resolve(route.dhisUrl, route.dhisPath)

    // Populate cache on startup
    Utils.populateCache(url)
    Utils.addCronJob(route.cronPattern, route.cronTimezone, url)
    Utils.addRoute(app, route.dhisPath)
  })
  return app
}
exports.setupApp = setupApp

// Load the config
function start (callback) {
  setupConfig((err, appConfig) => {
    if (err) {
      callback(err)
    }

    let apiConf = appConfig.get('openhim')
    let port = appConfig.get('server:port')

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
            let app = setupApp(config, appConfig)
            server = app.listen(port, () => {
              if (apiConf.heartbeat) {
                let configEmitter = medUtils.activateHeartbeat(apiConf.api)
                configEmitter.on('config', (newConfig) => {
                  Winston.info('Received updated config:')
                  Winston.info(JSON.stringify(newConfig))
                  // set new config for mediator

                  Utils.updateConfig(app, config, newConfig)
                })
              }
              callback(null, port, server)
            })
          }
        })
      })
    } else {
      // default config
      let app = setupApp(mediatorConfig.config, appConfig)
      server = app.listen(port, () => callback(null, port, server))
    }
  })
}
exports.start = start

function setupConfig (callback) {
  Confit(Path.join(__dirname, '..', 'config')).create(function (err, config) {
    if (err) {
      return callback(err)
    }
    callback(null, config)
  })
}
exports.setupConfig = setupConfig

function stop (callback) {
  server.on('close', () => {
    Cache.close(callback)
  })
  server.close()
}
exports.stop = stop

if (!module.parent) {
  // if this script is run directly, start the server
  start((err, port) => {
    if (err) { throw err }
    Winston.info(`Listening on ${port}...`)
  })
}
