const routesGet = require('./get.js')

/**
 * Registers RESTful HTTP routes.
 * 
 * @param {object} serverObj - The server object.
 * @param {DatabaseService} db - Cardinal database server instance.
 */
exports.register = (server, db) => {
  const base = '/api/music-track'

  routesGet.register(base, server, db)
}