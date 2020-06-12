'use strict'

const Cache = require('./cache')
const Logger = require('./logger')

const EMPTY_TEMPLATE = `{\"organisationUnits\": []}`

exports.facilityCodeLookup = function facilityCodeLookup (req, res, next) {
  if (!req.query.filter) {
    Logger.warn('Bad request: Missing query filter')
    return res.status(200).type('json').send(EMPTY_TEMPLATE)
  }

  const matches = req.query.filter.match(/^(code):eq:([a-zA-Z0-9]+)$/)
  if (!matches) {
    Logger.warn('Bad request: Missing or invalid filter value: ', { message: req.query.filter })
    return res.status(200).type('json').send(EMPTY_TEMPLATE)
  }

  const levelKey = req.path
  const subLevelCacheDB = Cache.sublevel(levelKey)
  subLevelCacheDB.get(matches[2], function (err, facility) {
    if (err) {
      if (err.notFound) {
        Logger.warn('Facility not found: ', { message: matches[2] })
        return res.status(200).type('json').send(EMPTY_TEMPLATE)
      }
      Logger.error(err)
      return next(err)
    }

    const responseData = `{\"organisationUnits\": [${facility}]}`

    res.type('json').send(responseData)
  })
}

exports.uptime = function getUptime (_req, res) {
  return res.send({
    uptime: process.uptime()
  })
}
