'use strict'

const cache = require('./cache')
const config = require('./config').getApiConfig()
const logger = require('./logger')

const EMPTY_TEMPLATE = `{\"organisationUnits\": []}`

exports.facilityCodeLookup = function facilityCodeLookup(req, res, next) {
  const facilityCode = getFacilityCode(req.query.filter)

  if (facilityCode == null) {
    return res.status(200).type('json').send(EMPTY_TEMPLATE)
  }

  const subLevelCacheDB = cache.sublevel(req.path)
  subLevelCacheDB.get(facilityCode, function (err, facility) {
    if (err) {
      if (err.notFound) {
        logger.warn('Facility not found: ', { message: facilityCode })
        return res.status(200).type('json').send(EMPTY_TEMPLATE)
      }
      logger.error(err)
      return next(err)
    }

    const responseData = `{\"organisationUnits\": [${facility}]}`

    res.status(200).type('json').send(responseData)
  })
}

function getFacilityCode(filter) {
  if (!filter) {
    logger.warn('Bad request: Missing query filter')
    return
  }

  const matches = filter.match(new RegExp(config.codeRegex))
  if (!matches) {
    logger.warn('Bad request: Missing or invalid filter value: ', {
      message: filter
    })
    return
  }
  console.log('Matches: ', matches[2])
  return matches[2]
}

exports.uptime = function getUptime(_req, res) {
  return res.send({
    uptime: process.uptime()
  })
}
