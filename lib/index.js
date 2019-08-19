'use strict'

const config = require('../config/config')
const express = require('express')
const Middleware = require('./middleware')
const Path = require('path')
const Routes = require('./routes')
const URL = require('url')
const Utils = require('./utils')
const Winston = require('winston')
const medUtils = require('openhim-mediator-utils')
const mediatorConfig = require('../config/mediator')

let server

function setupApp (config, appConfig) {
  const app = express()

  // Make the config accessible to all routes
  Object.defineProperty(app.locals, 'config', { value: config })

  Winston.clear()
  Winston.add(Winston.transports.Console, { timestamp: true, level: appConfig.logger.level })

  // Set up the routes
  app.get('/heartbeat', Routes.uptime)
  app.use(Middleware.stats(appConfig.statsd))

  config.routes.forEach((route) => {
    const url = URL.resolve(route.dhisUrl, route.dhisPath)

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
      return callback(err)
    }

    const apiConf = appConfig.openhim
    const port = appConfig.server.port

    if (apiConf.register) {
      medUtils.registerMediator(apiConf.api, mediatorConfig, (err) => {
        if (err) {
          Winston.error('Failed to register this mediator, check your config', err)
          process.exit(1)
        }
        apiConf.api.urn = mediatorConfig.urn
        medUtils.fetchConfig(apiConf.api, (err, newConfig) => {
          Winston.info('Received initial config:', JSON.stringify(newConfig))
          const config = newConfig
          if (err) {
            Winston.error('Failed to fetch initial config', err)
            process.exit(1)
          } else {
            Winston.info('Successfully registered mediator!')
            const app = setupApp(config, appConfig)
            server = app.listen(port, () => {
              if (apiConf.heartbeat) {
                const configEmitter = medUtils.activateHeartbeat(apiConf.api)
                configEmitter.on('error', (err) => {
                  Winston.error('Heartbeat failed', err)
                })
                configEmitter.on('config', (newConfig) => {
                  Winston.info('Received updated config:', JSON.stringify(newConfig))

                  // set new config for mediator
                  Utils.updateConfig(app, config.routes, newConfig.routes)
                })
              }
              callback(null, server)
            })
          }
        })
      })
    } else {
      // default config
      const app = setupApp(mediatorConfig.config, appConfig)
      server = app.listen(port, () => callback(null, server))
    }
  })
}
exports.start = start

function setupConfig (callback) {
  const configuration = config.configure()
  callback(null, configuration)
}
exports.setupConfig = setupConfig

function stop (callback) {
  server.close(callback)
}
exports.stop = stop

if (!module.parent) {
  // if this script is run directly, start the server
  start((err) => {
    if (err) { throw err }
    Winston.info(`Listening on ${server.address().port}...`)
  })
}
