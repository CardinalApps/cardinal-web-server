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
   * Deletes a single directory object.
   */
  server.delete(`${base}/:id`, async (request, response) => {
    if (!request.params.id) {
      response.status(400)
      return apiResponse('Request is missing ID.')
    }

    let success = await directoryCrud.removeDirectory(db, Number(request.params.id))
    
    if (success) {
      return apiResponse()
    } else {
      response.status(500)
      return apiResponse(`Something went wrong when trying to delete the media directory with ID ${request.params.id}`)
    }
  })
}