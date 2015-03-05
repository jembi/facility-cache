'use strict';

var LevelUp = require('levelup');
var Path = require('path');

var path = Path.join(__dirname, '..', 'data');

var options = {
  valueEncoding: 'json'
};

module.exports = LevelUp(path, options);
