'use strict'

const HTTP = require('http')
const Path = require('path')
const Level = require('level')
const assert = require('assert')

const Cache = require('../lib/cache')
const Utils = require('../lib/utils')

const URL1 = 'http://localhost:8002/api/test/1'
const URL2 = 'http://localhost:8002/api/test/2'

const EXPECTED_FACILITYS1 = [['111111', 'existing', 'Test Facility 1']]
const EXPECTED_FACILITYS2 = [['222222', 'existing', 'Test Facility 2']]

const EXPECTED_HEADERS = [
  {name: 'value', column: 'value', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'uid', column: 'uid', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'name', column: 'name', type: 'java.lang.String', hidden: false, meta: false}
]

function createCache(server, facilities, url, callback) {
  server.once('request', function (req, res) {
    const facilityData = {
      listGrid: {
        title: 'FacilityRegistry',
        headers: EXPECTED_HEADERS,
        rows: facilities
      }
    }
    res.writeHead(200, {'Content-Type': 'application/json'})
    res.end(JSON.stringify(facilityData))
    callback()
  })
  Utils.populateCache(url)
}

function cacheLookup(levelKey, matches, callback) {
  const subLevelCacheDB = Cache.sublevel(levelKey)
  subLevelCacheDB.get(matches[2], function (err, facility) {
    if (err) {
      callback(err)
    }
    callback(null, facility)
  })
}

describe('Facility Proxy', function () {
  before(Cache.open)

  let server
  before(function (next) {
    server = HTTP.createServer()
    createCache(server, EXPECTED_FACILITYS1, URL1, () => {
      createCache(server, EXPECTED_FACILITYS2, URL2, next)
    })
    server.listen(8002)
  })

  after(function (next) {
    server.close(() => {
      Cache.close(() => {
        const path = Path.join(__dirname, '..', 'cache')
        Level.destroy(path, next)
      })
    })
  })

  describe('Cache', function () {
    it('should correctly populate cache with two lists of facilities', function (next) {
      const levelKey1 = '/api/test/1'
      const levelKey2 = '/api/test/2'

      const matches1 = [0, 0, '111111']
      const matches2 = [0, 0, '222222']

      cacheLookup(levelKey1, matches1, (err, result) => {
        if(err) {
          throw err
        }
        result = JSON.parse(result)
        assert.equal(result.rows[0][0], '111111')

        cacheLookup(levelKey2, matches2, (err, result) => {
          if(err) {
            throw err
          }
          result = JSON.parse(result)
          assert.equal(result.rows[0][0], '222222')
          next()
        })
      })
    })
  })
})


