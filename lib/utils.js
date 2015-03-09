'use strict';

var Cache = require('./cache');
var Needle = require('needle');
var Winston = require('winston');

// Fetch all data and add it to the cache
exports.populateCache = function populateCache(url) {
  Winston.info('Populating cache');

  // Fetch the facility data
  Needle.get(url, function(err, res) {
    if (err) {
      return Winston.error('Fetching facility data failed', {err: err.message});
    }

    var stream = Cache.createWriteStream();
    stream.on('error', function(err) {
      Winston.error('Storing facility data failed', {err: err.message});
    });
    stream.on('close', function() {
      Winston.info('Finished populating cache');
    });

    var headers = res.body.headers;

    // Add each facility to the cache
    res.body.rows.forEach(function(row) {
      var key = row[0];
      if (!key) {
        return Winston.error('Facility missing value', {facility: row});
      }
      stream.write({key: key, value: {headers: headers, row: row}});
    });

    stream.end();
  });
};
