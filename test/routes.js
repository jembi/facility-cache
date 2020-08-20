'use strict'

const routes = require('../lib/routes')
const assert = require('assert')

describe('Routes', function () {
  describe('look up code', function () {
    it('should fail when filter value is missing', function (next) {
      const request = {
        query: {}
      }

      const response = {
        status: (status) => {
          assert.equal(status, 200)
          return {
            type: (type) => {
              assert.equal(type, 'json')
              return {
                send: (data) => {
                  assert.equal(data, `{\"organisationUnits\": []}`)
                }
              }
            }
          }
        }
      }
      routes.facilityCodeLookup(request, response, () => {})
      next()
    })

    it('should fail when code contains invalid characters', function (next) {
      const request = {
        query: {
          filter: 'code:eq:*invalid'
        }
      }

      const response = {
        status: (status) => {
          assert.equal(status, 200)
          return {
            type: (type) => {
              assert.equal(type, 'json')
              return {
                send: (data) => {
                  assert.equal(data, `{\"organisationUnits\": []}`)
                }
              }
            }
          }
        }
      }
      routes.facilityCodeLookup(request, response, () => {})
      next()
    })
  })
})
