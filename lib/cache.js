'use strict'

const Winston = require('winston')
const LevelUp = require('level')
const Sublevel = require('level-sublevel')
const Path = require('path')

const path = Path.join(__dirname, '..', 'cache')

const leveldb = LevelUp(path)
// main cache DB path
const db = Sublevel(leveldb)

exports.addSubLevelCacheDB = (levelKey) => {
  return db.sublevel(levelKey)
}

exports.getSubLevelCacheDB = (levelKey, callback) => {
  callback(db.sublevel(levelKey))
}

exports.deleteSubLevelCacheDB = (levelKey, callback) => {
  const subdb = db.sublevel(levelKey)

  db.del(levelKey, (err) => {
    if (err) {
      return Winston.error('Error while closing Cache DB: %d', err)
    }

    Winston.info(`Clearing Cache for sublevel: ${levelKey}`)
    callback()
  })
}

exports.db = leveldb
