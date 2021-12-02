const { apiResponse } = require('../../../api-io.js')
const { favoriteCrud } = require('cardinal-media-crud')

/**
 * Registers RESTful HTTP routes.
 * 
 * @param {object} serverObj - The server object.
 * @param {DatabaseService} db - Cardinal database server instance.
 */
exports.register = (base, server, db) => {
  /**
   * Returns an array of favorites. Omit the "type" param to return favorites of
   * all types.
   */
   server.get(`${base}`, async (request, response) => {
    let returnArray = await favoriteCrud.getAllFavorites(db)

    if (!Array.isArray(returnArray)) {
      response.status(500)
      return apiResponse('Something went wrong when getting favorites.')
    }

    return apiResponse(returnArray)
  })

  /**
   * Returns an array of favorites. Omit the "type" param to return favorites of
   * all types.
   */
  server.get(`${base}/:type`, async (request, response) => {
    if (!('type' in request.params)) {
      response.status(400)
      return apiResponse('Favorite type required.')
    }

    let returnArray = await favoriteCrud.getFavoritesOfType(db, request.params.type)

    if (!Array.isArray(returnArray)) {
      response.status(500)
      return apiResponse('Something went wrong when getting favorites.')
    }

    return apiResponse(returnArray)
  })
}