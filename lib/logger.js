'use strict'
const winston = require('winston')
const config = require('./config').getApiConfig()

module.exports = winston.createLogger({
  level: config.logger.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [new winston.transports.Console()]
})
