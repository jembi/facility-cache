'use strict';

var LevelUp = require('level');
var Path = require('path');

var path = Path.join(__dirname, '..', 'data');

module.exports = LevelUp(path);
