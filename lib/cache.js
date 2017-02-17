'use strict'

const LevelUp = require('level')
const Sublevel = require('level-sublevel')
const Path = require('path')

const path = Path.join(__dirname, '..', 'cache')

const db = LevelUp(path)
const sub = Sublevel(db)

module.exports = {
  sublevel: sub.sublevel.bind(sub),
  close: sub.close.bind(sub),
  open: db.open.bind(db)
}
