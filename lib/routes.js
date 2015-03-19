'use strict';

var Cache = require('./cache');
var Winston = require('winston');

var EMPTY_TEMPLATE = '{"title":"","headers":[],"rows":[],"width":0,"height":0}';

exports.facilityCodeLookup = function facilityCodeLookup(req, res, next) {

  if (!req.query.criteria) {
    Winston.info('Bad request: Missing query criteria');
    return res.status(200).type('json').send(EMPTY_TEMPLATE);
  }

  var matches = req.query.criteria.match(/^(value|code):(\d+)$/);

  if (!matches) {
    Winston.info('Bad request: Missing or invalid criteria value %s', req.query.criteria);
    return res.status(200).type('json').send(EMPTY_TEMPLATE);
  }

  Cache.get(matches[2], function(err, facility) {
    if (err) {
      if (err.notFound) {
        Winston.info('Facility not found: %s', matches[2]);
        return res.status(200).type('json').send(EMPTY_TEMPLATE);
      }
      Winston.error(err);
      return next(err);
    }

    res.type('json').send(facility);
  });
};
