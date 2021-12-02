const routesGet = require('./get.js')
const routesPost = require('./post.js')
const routesDelete = require('./delete.js')

/**
 * Registers RESTful HTTP routes.
 * 
 * @param {object} serverObj - The server object.
 * @param {DatabaseService} db - Cardinal database server instance.
 */
exports.register = (server, db) => {
  const base = '/api/favorites'

  routesGet.register(base, server, db)
  routesPost.register(base, server, db)
  routesDelete.register(base, server, db)
}