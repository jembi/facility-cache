'use strict'

const Cache = require('./cache')
const needle = require('needle')
const Logger = require('./logger')
const CronJob = require('cron').CronJob
const Routes = require('./routes')
const URL = require('url')

// Fetch all data and add it to the cache
function populateCache (url) {
  // Change from DHIS 2.30. SQL views no longer return all data by default therefore
  // API calls now need to specify what size data they want
  const params = {
    paging: 'false',
    fields: 'code,id,displayName'
  }
  Logger.info('Populating cache')

  // Fetch the facility data
  needle.request('get', url, params, function (err, res) {
    if (err) {
      return Logger.error('Fetching facility data failed: ', { message: err.message })
    }

    if (res.statusCode !== 200) {
      return Logger.error('Non-200 status code: ', { message: res.statusCode })
    }

    const parsedURL = URL.parse(url)
    const levelKey = parsedURL.pathname

    const subLevelCacheDB = Cache.sublevel(levelKey)
    const batch = []

    // Add each facility to the cache
    res.body.organisationUnits.forEach(function (organisationUnit) {
      const key = organisationUnit.code
      if (!key) {
        return Logger.error(`Facility missing value: ${JSON.stringify(organisationUnit)}`)
      }
      batch.push({
        key: key,
        value: JSON.stringify({
          id: organisationUnit.id,
          displayName: organisationUnit.displayName
        }),
        type: 'put'
      })
    })

    subLevelCacheDB.batch(batch, function (err) {
      if (err) {
        return Logger.error('Storing facility data failed: ', { message: err.message })
      }
      Logger.info('Finished populating cache')
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

// express 4.14.1 specific
function removeRoute (app, path) {
  let counter = 0
  const stack = app._router.stack
  stack.forEach((layer) => {
    if(layer && layer.route && layer.route.path === path) {
      stack.splice(counter, 1)
    }
    counter++
  })
}

function updateConfig (app, oldConf, newConf) {
  const newConfRoutes = {}

  newConf.forEach((route) => {
    const url = URL.resolve(route.dhisUrl, route.dhisPath)
    newConfRoutes[url] = true
    // if the route already exists reset cron job, else add new route and cron job
    if (cronJobs[url]) {
      removeCronJob(url)
      addCronJob(route.cronPattern, route.cronTimezone, url)
    } else {
      addRoute(app, route.dhisPath)
      addCronJob(route.cronPattern, route.cronTimezone, url)
      populateCache(url)
    }
  })

  oldConf.forEach((route) => {
    const url = URL.resolve(route.dhisUrl, route.dhisPath)
    // remove routes and crons that are not in the new config
    if (!newConfRoutes[url]) {
      removeRoute(app, route.dhisPath)
      removeCronJob(url)
    }
  })
}

function resetCronJobs () {
  Object.keys(cronJobs).forEach(k => delete cronJobs[k])
}

exports.populateCache = populateCache
exports.addCronJob = addCronJob
exports.addRoute = addRoute
exports.updateConfig = updateConfig

if (process.env.NODE_ENV === 'test') {
  exports.cronJobs = cronJobs
  exports.resetCronJobs = resetCronJobs
}
