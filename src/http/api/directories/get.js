const { apiResponse } = require('../../../api-io.js')
const { directoryCrud } = require('hydra-media-crud')

/**
 * Registers RESTful HTTP routes.
 * 
 * @param {object} serverObj - The server object.
 * @param {DatabaseService} db - Hydra database server instance.
 */
exports.register = (base, server, db) => {
  /**
   * Returns an array of directory objects.
   */
  server.get(base, async (request, response) => {
    let rows = await directoryCrud.getAllDirectories(db)
    return apiResponse(rows)
  })
}