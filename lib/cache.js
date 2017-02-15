'use strict'

const LevelUp = require('level')
const Sublevel = require('level-sublevel')
const Path = require('path')

const path = Path.join(__dirname, '..', 'cache')

// main cache DB path
module.exports = Sublevel(LevelUp(path))

