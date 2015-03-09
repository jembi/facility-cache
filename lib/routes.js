'use strict';

var Cache = require('./cache');
var Mustache = require('mustache');
var Winston = require('winston');

var template = '{"title":"FacilityRegistry","headers":{{{headers}}},"rows":[{{{row}}}],"width":{{width}},"height":1}';
Mustache.parse(template);

exports.facilityCodeLookup = function facilityCodeLookup(req, res, next) {

  if (!req.query.criteria) {
    Winston.info('Bad request: Missing query criteria');
    return res.status(400).send('Missing query criteria');
  }

  var matches = req.query.criteria.match(/^value:(\d+)$/);

  if (!matches) {
    Winston.info('Bad request: Missing or invalid criteria value %s', req.query.criteria);
    return res.status(400).send('Missing or invalid criteria value');
  }

  Cache.get(matches[1], function(err, facility) {
    if (err) {
      if (err.notFound) {
        Winston.info('Facility not found: %s', matches[1]);
        return res.status(404).send();
      }
      Winston.error(err);
      return next(err);
    }

    var context = {
      headers: JSON.stringify(facility.headers),
      row: JSON.stringify(facility.row),
      width: facility.headers.length
    };
    var body = Mustache.render(template, context);
    res.type('json').send(body);
  });
};
