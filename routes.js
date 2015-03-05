'use strict';

var Cache = require('./cache');
var Mustache = require('mustache');

var template = '{"title":"FacilityRegistry","headers":[{"name":"value","column":"value","type":"java.lang.String","hidden":false,"meta":false},{"name":"uid","column":"uid","type":"java.lang.String","hidden":false,"meta":false},{"name":"name","column":"name","type":"java.lang.String","hidden":false,"meta":false}],"rows":[["{{value}}","{{uid}}","{{name}}"]],"width":3,"height":1}';
Mustache.parse(template);

exports.facilityCodeLookup = function facilityCodeLookup(req, res, next) {

  if (!req.query.criteria) {
    return res.status(400).send('Missing query criteria');
  }

  var matches = req.query.criteria.match(/^value:(\d+)$/);

  if (!matches) {
    return res.status(400).send('Missing or invalid value criteria');
  }

  Cache.get(matches[1], function(err, facility) {
    if (err) {
      if (err.notFound) {
        return res.status(404).send();
      }
      return next(err);
    }

    var body = Mustache.render(template, facility);
    res.type('json').send(body);
  });
};
