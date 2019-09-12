# facility-cache

[![Build Status](https://travis-ci.org/jembi/facility-cache.svg)](https://travis-ci.org/jembi/facility-cache)

Compatible DHIS versions:

* [![DHIS2.30 Build](https://img.shields.io/badge/DHIS-2.30-brightgreen.svg)](https://launchpad.net/dhis2/+milestone/2.30)

Persistent cache for facility lookups.

## Deployment

### Command line

1. Clone this repository.
1. Run `npm install`.
1. Set environment variables.
1. Make sure that your `NODE_ENV` environment variable is set correctly e.g. `export NODE_ENV=production`.
1. Run `npm start`.

### Docker

Use this command to build the Docker image:

```sh
docker build -t facility-cache .
```

Use this command to launch the Docker container:

```sh
docker run -d -p 8001:8001 [--name facility-cache] facility-cache
```

Useful Flags:

* `--network {openhim-network-name}` connect to a docker bridge network to allow communicating with dockerised OpenHIM
* `--rm` to remove the container when stopped (Useful during development)

## Environment variables

| Key | Default value | Description |
| --- | --- | --- |
| **Server** | | |
| SERVER_HOSTNAME | `localhost` | Mediator host address |
| SERVER_PORT | `3500` | Mediator port number |
| **OpenHIM** | | |
| OPENHIM_USERNAME | `root@openhim.org` | OpenHIM API username |
| OPENHIM_PASSWORD | `openhim-password` | OpenHIM API password |
| OPENHIM_URL | `https://localhost:8080` | OpenHIM API address |
| TRUSTED_SELF_SIGNED | `false` | Trust the OpenHIM's Self-signed certificate |
| **Cache** | | |
| LOGGING_LEVEL | `info` | |
| REGISTER_MEDIATOR | `true` | Register the mediator with the OpenHIM |
