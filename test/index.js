'use strict';

var Chai = require('chai');
var HTTP = require('http');
var Lab = require('lab');
var LevelDown = require('leveldown');
var Needle = require('needle');
var Path = require('path');

var EXPECTED_FACILITY = ['654321', 'existing', 'za MomConnect Existing'];
var EXPECTED_HEADERS = [
  {name: 'value', column: 'value', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'uid', column: 'uid', type: 'java.lang.String', hidden: false, meta: false},
  {name: 'name', column: 'name', type: 'java.lang.String', hidden: false, meta: false}
];
var URL = 'http://localhost:8001/staging/api/sqlViews/Cj0HSoDpa0P/data.json';

var expect = Chai.expect;
var lab = exports.lab = Lab.script();

lab.describe('Facility Proxy', function() {

  lab.before(function(next) {
    var path = Path.join(__dirname, '..', 'data');
    LevelDown.destroy(path, next);
  });

  lab.before(function(next) {
    var server = HTTP.createServer();
    server.once('request', function(req, res) {
      var facilityData = {
        headers: EXPECTED_HEADERS,
        rows: [
          ['', 'missing', 'za MomConnect Missing'],
          EXPECTED_FACILITY
        ]
      };
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(facilityData));
      next();
    });
    server.listen(8002, function() {
      // Start the app
      require('../lib');
    });
  });

  lab.describe('API calls', function() {

    lab.describe('with no criteria query parameter', function() {

      lab.it('should return a 400 reponse code', function(next) {
        Needle.get(URL, function(err, res) {
          if (err) {
            return next(err);
          }
          expect(res.statusCode).to.equal(400);
          expect(res.body).to.equal('Missing query criteria');
          next();
        });
      });
    });

    lab.describe('with no criteria value', function() {

      lab.it('should return a 400 reponse code', function(next) {
        Needle.get(URL + '?criteria=fail', function(err, res) {
          if (err) {
            return next(err);
          }
          expect(res.statusCode).to.equal(400);
          expect(res.body).to.equal('Missing or invalid criteria value');
          next();
        });
      });
    });

    lab.describe('with an invalid criteria value', function() {

      lab.it('should return a 400 reponse code', function(next) {
        Needle.get(URL + '?criteria=value:fail', function(err, res) {
          if (err) {
            return next(err);
          }
          expect(res.statusCode).to.equal(400);
          expect(res.body).to.equal('Missing or invalid criteria value');
          next();
        });
      });
    });

    lab.describe('with a non-existent facility code', function() {

      lab.it('should return a 404 reponse code', function(next) {
        Needle.get(URL + '?criteria=value:123456', function(err, res) {
          if (err) {
            return next(err);
          }
          expect(res.statusCode).to.equal(404);
          next();
        });
      });
    });

    lab.describe('with an existing facility code', function() {

      lab.it('should return a 200 reponse code and the expected facility', function(next) {
        Needle.get(URL + '?criteria=value:654321', function(err, res) {
          if (err) {
            return next(err);
          }
          expect(res.statusCode).to.equal(200);
          expect(res.body.headers).to.deep.equal(EXPECTED_HEADERS);
          expect(res.body.rows[0]).to.deep.equal(EXPECTED_FACILITY);
          next();
        });
      });
    });
  });
});
