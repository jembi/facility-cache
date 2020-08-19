'use strict'

const cache = require('./cache')
const logger = require('./logger')

const EMPTY_TEMPLATE = `{\"organisationUnits\": []}`

exports.facilityCodeLookup = function facilityCodeLookup (req, res, next) {
  if (!req.query.filter) {
    logger.warn('Bad request: Missing query filter')
    return res.status(200).type('json').send(EMPTY_TEMPLATE)
  }

  const matches = req.query.filter.match(/^(code):eq:([a-zA-Z0-9]+)$/)
  if (!matches) {
    logger.warn('Bad request: Missing or invalid filter value: ', { message: filter })
    return res.status(200).type('json').send(EMPTY_TEMPLATE)
  }

  const levelKey = req.path
  const subLevelCacheDB = cache.sublevel(levelKey)
  subLevelCacheDB.get(matches[2], function (err, facility) {
    if (err) {
      if (err.notFound) {
        logger.warn('Facility not found: ', { message: matches[2] })
        return res.status(200).type('json').send(EMPTY_TEMPLATE)
      }
      logger.error(err)
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
