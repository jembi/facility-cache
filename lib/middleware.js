'use strict'

var OnFinished = require('on-finished')
var OS = require('os')
var StatsD = require('node-statsd')
var Winston = require('winston')

// Return the number of milliseconds since a start time
function millisecondsSince (start) {
  var diff = process.hrtime(start)
  return diff[0] * 1e3 + diff[1] / 1e6
}

// Record request and response metrics
exports.stats = function (options) {
  var stats = new StatsD({
    host: options.host,
    port: options.port,
    prefix: OS.hostname() + '.facility_proxy.'
  })

  return function (req, res, next) {
    var start = process.hrtime()
    stats.increment('requests')
    OnFinished(res, function (err, res) {
      if (err) {
        Winston.error(err)
        next()
      }
      stats.increment('response_codes.' + res.statusCode)
      stats.timing('response_time', millisecondsSince(start))
    })
    next()
  }
}
