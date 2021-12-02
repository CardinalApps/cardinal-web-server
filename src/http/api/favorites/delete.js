const { apiResponse } = require('../../../api-io.js')
const webServer = require('../../../web-server.js')
const { favoriteCrud } = require('cardinal-media-crud')

/**
 * Registers RESTful HTTP routes.
 * 
 * @param {object} serverObj - The server object.
 * @param {DatabaseService} db - Cardinal database server instance.
 */
exports.register = (base, server, db) => {
  /**
   * Removes a single favorite.
   */
  server.delete(`${base}/:type/:id`, async (request, response) => {
    if (!request.params.id || !request.params.type) {
      response.status(400)
      return apiResponse('Request requires the favorite thing ID and the favorite thing type.')
    }

    let success = await favoriteCrud.removeFavoriteOfType(db, request.params.id, request.params.type)
    
    if (success) {
      // send the announcement over websockets
      let primaryServer = webServer.getServer('primary')
      primaryServer.ws.say(request.params.id, 'announcements:favorite-removed', 'music')

      return apiResponse()
    } else {
      response.status(500)
      return apiResponse(`Something went wrong when trying to delete the favorite with favId ${request.params.id} and type ${request.params.type}`)
    }
  })
}