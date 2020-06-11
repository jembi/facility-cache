'use strict'

const config = require('./config')
const express = require('express')
const Routes = require('./routes')
const URL = require('url')
const Utils = require('./utils')
const Logger = require('./logger')
const medUtils = require('openhim-mediator-utils')
const mediatorConfig = require('../config/mediator')

let server

function setupApp (config) {
  const app = express()

  // Make the config accessible to all routes
  Object.defineProperty(app.locals, 'config', { value: config })

  // Set up the routes
  app.get('/heartbeat', Routes.uptime)

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

function start (appConfig, callback) {
  const apiConf = appConfig.openhim
  const port = appConfig.server.port

  if (apiConf.register) {
    medUtils.registerMediator(apiConf.api, mediatorConfig, (err) => {
      if (err) {
        Logger.error('Failed to register this mediator, check your config', { message: err })
        process.exit(1)
      }

      const openhimConfig = Object.assign({urn: mediatorConfig.urn}, apiConf.api)

      medUtils.fetchConfig(openhimConfig, (err, newConfig) => {
        Logger.info('Received initial config: ', { message: JSON.stringify(newConfig)})
        const config = newConfig
        if (err) {
          Logger.error('Failed to fetch initial config', { message: err })
          process.exit(1)
        } else {
          Logger.info('Successfully registered mediator!')
          const app = setupApp(config)
          server = app.listen(port, () => {
            if (apiConf.heartbeat) {
              const configEmitter = medUtils.activateHeartbeat(openhimConfig)
              configEmitter.on('error', (err) => {
                Logger.error('Heartbeat failed: ', { message: err })
              })
              configEmitter.on('config', (newConfig) => {
                Logger.info('Received updated config: ', { message: JSON.stringify(newConfig) })

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
    const app = setupApp(mediatorConfig.config)
    server = app.listen(port, () => callback(null, server))
  }
}
exports.start = start

function stop (callback) {
  server.close(callback)
}
exports.stop = stop

if (!module.parent) {
  const apiConfig = config.getApiConfig()
  // if this script is run directly, start the server
  start(apiConfig, (err) => {
    if (err) { throw err }
    Logger.info('Listening on port: ', { message: server.address().port })
  })
}
