const { apiResponse } = require('../../../api-io.js')
const { directoryCrud } = require('cardinal-media-crud')

/**
 * Registers RESTful HTTP routes.
 * 
 * @param {object} serverObj - The server object.
 * @param {DatabaseService} db - Cardinal database server instance.
 */
exports.register = (base, server, db) => {
  /**
   * Checks if a directory path already exists in the database.
   */
  server.head(base, async (request, response) => {
    if (!('path' in request.query) || typeof request.query.path !== 'string') {
      response.status(400)
      return apiResponse('Request is missing the path.')
    }

    let row = await directoryCrud.getDirectory(db, request.query.path)

    if (!row) {
      response.status(404)
      return apiResponse('Directory not found.')
    }

    return apiResponse()
  })
}