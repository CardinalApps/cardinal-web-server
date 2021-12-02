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
   * Returns a single directory object based on the given directory path. Use
   * the URL arg `path` to supply the path.
   */
  server.get(base, async (request, response) => {
    if (!('path' in request.query) || typeof request.query.path !== 'string') {
      response.status(400)
      return apiResponse('Request is missing the path.')
    }

    let row = await directoryCrud.getDirectory(db, request.query.path)

    if (!row) {
      response.status(404)
      return apiResponse('Directory not found.')
    }

    return apiResponse(row)
  })

  /**
   * Returns a single directory object based on a given directory ID.
   */
  server.get(`${base}/:id`, async (request, response) => {
    if (!request.params.id) {
      response.status(400)
      return apiResponse('Request is missing ID.')
    }

    let row = await directoryCrud.getDirectory(db, Number(request.params.id))
    return apiResponse(row)
  })
}