'use strict'

const Cache = require('./cache')
const Logger = require('./logger')
const URL = require('url')

const EMPTY_TEMPLATE = '{"title":"","headers":[],"rows":[],"width":0,"height":0}'

exports.facilityCodeLookup = function facilityCodeLookup (req, res, next) {
  if (!req.query.criteria) {
    Logger.info('Bad request: Missing query criteria')
    return res.status(200).type('json').send(EMPTY_TEMPLATE)
  }

  const matches = req.query.criteria.match(/^(value|code):([a-zA-Z0-9]+)$/)
  if (!matches) {
    Logger.info('Bad request: Missing or invalid criteria value %s', req.query.criteria)
    return res.status(200).type('json').send(EMPTY_TEMPLATE)
  }

  const levelKey = req.path
  const subLevelCacheDB = Cache.sublevel(levelKey)
  subLevelCacheDB.get(matches[2], function (err, facility) {
    if (err) {
      if (err.notFound) {
        Logger.info('Facility not found: %s', matches[2])
        return res.status(200).type('json').send(EMPTY_TEMPLATE)
      }
      Logger.error(err)
      return next(err)
    }

    res.type('json').send(facility)
  })
}

exports.uptime = function getUptime (req, res) {
  return res.send({
    uptime: process.uptime()
  })
}
