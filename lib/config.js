'use strict'

function configure () {
  return Object.freeze({
    "server": Object.freeze({
      "hostname": process.env.SERVER_HOSTNAME || "localhost",
      "port": process.env.SERVER_PORT || 8001
    }),

    "logger": Object.freeze({
      "level": process.env.LOGGING_LEVEL || "info"
    }),

    "openhim": {
      "api" : {
        "username": process.env.OPENHIM_USERNAME || "root@openhim.org",
        "password": process.env.OPENHIM_PASSWORD || "openhim-password",
        "apiURL": process.env.OPENHIM_URL || "https://localhost:8080",
        "trustSelfSigned": process.env.TRUSTED_SELF_SIGNED || true
      },
      "register": process.env.REGISTER_MEDIATOR || true,
      "heartbeat": true
    }
  })
}

exports.configure = configure
