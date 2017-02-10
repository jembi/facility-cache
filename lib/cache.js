'use strict'

const LevelUp = require('level')
const Path = require('path')

const path = Path.join(__dirname, '..', 'data')

module.exports = LevelUp(path)
