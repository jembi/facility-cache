'use strict'

const Cache = require('./cache')
const Mustache = require('mustache')
const Needle = require('needle')
const Winston = require('winston')
const CronJob = require('cron').CronJob
const Routes = require('./routes')
const URL = require('url')
const removeRouteDep = require('express-remove-route')

const template = '{"title":"{{title}}","headers":{{{headers}}},"rows":[{{{row}}}],"width":{{width}},"height":1}'
Mustache.parse(template)

// Fetch all data and add it to the cache
function populateCache (url) {
  // Fetch the facility data
  Needle.get(url, function (err, res) {
    if (err) {
      return Winston.error('Fetching facility data failed', {err: err.message})
    }

    if (res.statusCode !== 200) {
      return Winston.error('Non-200 status code: %d', res.statusCode)
    }

    const levelKey = url.split('sqlViews/')[1] // levelKey = <UID>.json
    Cache.deleteSubLevelCacheDB(levelKey, () => { // clear the existing cache before add new data
      Winston.info('Populating cache')

      const title = res.body.title
      const headers = res.body.headers

      const subLevelCacheDB = Cache.addSubLevelCacheDB(levelKey)
      const facilities = []

      // Add each facility to the cache
      res.body.rows.forEach(function (row) {
        const key = row[0]
        if (!key) {
          return Winston.error('Facility missing value', {facility: row})
        }
        const body = Mustache.render(template, {
          title: title,
          headers: JSON.stringify(headers),
          row: JSON.stringify(row),
          width: headers.length
        })
        facilities.push({key: key, value: body, type: 'put', prefix: subLevelCacheDB})
      })

      subLevelCacheDB.batch(facilities, function (err) {
        if (err) {
          return Winston.error('Storing facility data failed', {err: err.message})
        }
        Winston.info('Finished populating cache')
      })
    })
  })
}

const cronJobs = {}

function addCronJob (pattern, timezone, url) {
  cronJobs[url] = new CronJob(pattern, populateCache.bind(null, url), true, timezone)
}

function removeCronJob (url) {
  if (cronJobs[url]) {
    cronJobs[url].stop()
    delete cronJobs[url]
  }
}

function addRoute (app, path) {
  app.get(path, Routes.facilityCodeLookup)
}

function removeRoute (app, path) {
  removeRouteDep(app, path)
}

function updateConfig (app, oldConf, newConf) {
  const newRoutes = {}
  const existingRoutes = {}

  newConf.forEach((route) => {
    const url = URL.resolve(route.dhisUrl, route.dhisPath)
    if (cronJobs[url]) {
      removeCronJob(url)
      addCronJob(route.cronPattern, route.cronTimezone, url)
      existingRoutes[url] = true
    } else {
      addRoute(app, route.dhisPath)
      addCronJob(route.cronPattern, route.cronTimezone, url)
      populateCache(url)
      newRoutes[url] = true
    }
  })

  oldConf.forEach((route) => {
    const url = URL.resolve(route.dhisUrl, route.dhisPath)
    if (!newRoutes[url] && !existingRoutes[url]) {
      // delete old routes and crons
      removeRoute(app, route.dhisPath)
      removeCronJob(url)
    }
  })
}

exports.populateCache = populateCache
exports.addCronJob = addCronJob
exports.addRoute = addRoute
exports.updateConfig = updateConfig

if (process.env.NODE_ENV === 'test') {
  exports.cronJobs = cronJobs
}
