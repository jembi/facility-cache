# facility-cache [![Build Status](https://travis-ci.org/jembi/facility-cache.svg)](https://travis-ci.org/jembi/facility-cache)

Persistent cache for facility lookups.

## Deployment

### Command line

1. Clone this repository.
1. Run `npm install`.
1. Create a config file e.g. `production.json` in the `config` directory. See the [default config](https://github.com/jembi/facility-cache/blob/master/config/config.json) for the available options.
1. Make sure that your `NODE_ENV` environment variable is set correctly e.g. `export NODE_ENV=production`.
1. Run `npm start`.

### Docker

Use this command to build the Docker image: 

`docker build -t jembi/facility-cache .`

Use this command to launch the Docker container: 

`docker run -d -p 8001:8001 [--network host] [--name facility] jembi/facility-cache`
