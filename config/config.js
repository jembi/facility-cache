'use strict'

function configure () {
  return Object.freeze({
    "server": Object.freeze({
      "hostname": process.env.SERVER_HOSTNAME || "localhost",
      "port": process.env.SERVER_PORT || 8001
    }),

    "logger": Object.freeze({
      "level": "info"
    }),

    "statsd": Object.freeze({
      "host": process.env.STATSD_HOST || "localhost",
      "port": process.env.STATSD_PORT || 8125
    }),

    "openhim": Object.freeze({
      "api" : {
        "username": process.env.OPENHIM_USERNAME || "root@openhim.org",
        "password": process.env.OPENHIM_PASSWORD || "openhim-password",
        "apiURL": process.env.OPENHIM_URL || "https://localhost:8080",
        "trustSelfSigned": process.env.TRUSTED_SELF_SIGNED || true
      },
      "register": true,
      "heartbeat": true
    })
  })
}

exports.configure = configure