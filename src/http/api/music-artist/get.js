const { apiResponse } = require('../../../api-io.js')
const { artistCrud, musicReleaseCrud } = require('cardinal-media-crud')

/**
 * Registers RESTful HTTP routes.
 * 
 * @param {object} serverObj - The server object.
 * @param {DatabaseService} db - Cardinal database server instance.
 */
exports.register = (base, server, db) => {
  /**
   * Returns an array of directory objects.
   */
  server.get(`${base}/:id`, async (request, response) => {
    if (!('id' in request.params)) {
      response.status(400)
      return apiResponse('Request is missing the ID.')
    }

    let id = parseInt(request.params.id)
    let artistRow = await artistCrud.getArtist(db, id)
    let artistReleases = await musicReleaseCrud.getAllMusicReleases(db, id)
    
    if (!artistRow) {
      response.status(404)
      return apiResponse()
    }
    
    let releaseObj = {
      ...artistRow,
      'releases': artistReleases
    }

    return apiResponse(releaseObj)
  })
}