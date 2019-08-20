'use strict'

function configure () {
  return Object.freeze({
    "urn": "urn:mediator:facility-cache",
    "version": "1.0.0",
    "name": "OpenHIM Facility Cache Mediator",
    "description": "OpenHIM Mediator for facility cache",
    "endpoints": [
      {
        "name": "Facility Cache Mediator",
        "host": process.env.SERVER_HOSTNAME || "localhost",
        "port": process.env.SERVER_PORT || "8001",
        "type": "http"
      }
    ],
    "configDefs": Object.freeze([
      {
        "param": "routes",
        "displayName": "Routes",
        "description": "Locations of facilities to cache",
        "type": "struct",
        "array": true,
        "template": Object.freeze([
          {
            "param": "dhisUrl",
            "displayName": "DHIS Url",
            "description": "DHIS url",
            "type": "string"
          }, {
            "param": "dhisPath",
            "displayName": "DHIS Path",
            "description": "DHIS sql view path. NB! Please ensure that no two DHIS Path's are the same, as the cache will be overwritten by the other",
            "type": "string"
          }, {
            "param": "cronPattern",
            "displayName": "Cron Pattern",
            "description": "Cron pattern",
            "type": "string"
          }, {
            "param": "cronTimezone",
            "displayName": "Cron Timezone",
            "description": "Timezone of the cron",
            "type": "string"
          }
        ])
      }
    ]),
    "config": Object.freeze({
      "routes": Object.freeze([
        {
          "dhisUrl": "http://admin:district@localhost:8002",
          "dhisPath": "/api/sqlViews/1/data.json",
          "cronPattern": "00 00 12 * * *",
          "cronTimezone": "Africa/Johannesburg"
        }
      ])
    })
  })
}

exports.configure = configure
