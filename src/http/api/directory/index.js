const routesHead = require('./head.js')
const routesGet = require('./get.js')
const routesPost = require('./post.js')
const routesDelete = require('./delete.js')

/**
 * Registers RESTful HTTP routes.
 * 
 * @param {object} serverObj - The server object.
 * @param {DatabaseService} db - Hydra database server instance.
 */
exports.register = (server, db) => {
  const base = '/api/directory'

  routesHead.register(base, server, db)
  routesGet.register(base, server, db)
  routesPost.register(base, server, db)
  routesDelete.register(base, server, db)
}