'use strict'

const Cache = require('./cache')
const Winston = require('winston')

const EMPTY_TEMPLATE = '{"title":"","headers":[],"rows":[],"width":0,"height":0}'

exports.facilityCodeLookup = function facilityCodeLookup (req, res, next) {
  if (!req.query.criteria) {
    Winston.info('Bad request: Missing query criteria')
    return res.status(200).type('json').send(EMPTY_TEMPLATE)
  }

  const matches = req.query.criteria.match(/^(value|code):(\d+)$/)

  if (!matches) {
    Winston.info('Bad request: Missing or invalid criteria value %s', req.query.criteria)
    return res.status(200).type('json').send(EMPTY_TEMPLATE)
  }

  const levelKey = req.url.split('sqlViews/')[1].split('?')[0] // levelKey = <UID>.json
  Cache.getSubLevelCacheDB(levelKey, (subLevelDB) => {
    
    subLevelDB.get(matches[2], function (err, facility) {
      if (err) {
        if (err.notFound) {
          Winston.info('Facility not found: %s', matches[2])
          return res.status(200).type('json').send(EMPTY_TEMPLATE)
        }
        Winston.error(err)
        return next(err)
      }

      res.type('json').send(facility)
    })
  })
}

exports.uptime = function getUptime (req, res) {
  return res.send({
    uptime: process.uptime()
  })
}
