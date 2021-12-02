const { apiResponse } = require('../../../api-io.js')
const webServer = require('../../../web-server.js')
const { favoriteCrud } = require('hydra-media-crud')

/**
 * Registers RESTful HTTP routes.
 * 
 * @param {object} serverObj - The server object.
 * @param {DatabaseService} db - Hydra database server instance.
 */
exports.register = (base, server, db) => {
  /**
   * Adds a favorite to the database and returns the row object.
   */
  server.post(base, async (request, response) => {
    if (request.body === null || typeof request.body !== "object") {
      response.status(400)
      return apiResponse('Request body must be an object.')
    }

    let givenObj = request.body

    // don't allow duplicate ID's within the same multimedia type
    let existsInDb = await favoriteCrud.getFavoriteOfType(db, givenObj.favorite_thing_id, givenObj.favorite_thing_type)
    if (existsInDb) {
      response.status(409)
      return apiResponse('Duplicate favorites of the same media type are not allowed.')
    }

    let newId = await favoriteCrud.addFavorite(db, givenObj)

    // send the announcement over websockets
    let primaryServer = webServer.getServer('primary')
    primaryServer.ws.say(givenObj.favorite_thing_id, 'announcements:favorite-added', 'music')

    response.status(201)
    return apiResponse(await favoriteCrud.getFavorite(db, newId))
  })
}