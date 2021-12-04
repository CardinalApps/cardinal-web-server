const { apiResponse, sanitizeArtwork } = require('../../../api-io.js')
const { musicReleaseCrud, metaCrud, imageCrud } = require('cardinal-media-crud')

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
    let musicReleases = await musicReleaseCrud.getMusicRelease(db, id)

    if (!musicReleases.length) {
      response.status(404)
      return apiResponse()
    }

    // the api should never find more than 1 album because we are using IDs
    if (musicReleases.length > 1) {
      response.status(500)
      return apiResponse('Too many albums')
    }

    let releaseObj = {
      ...musicReleases[0],
      'artwork': null
    }

    if (releaseObj.meta.artwork) {
      releaseObj.artwork = await imageCrud.getImage(db, releaseObj.meta.artwork)
      releaseObj.artwork = sanitizeArtwork(releaseObj.artwork)
    }
    
    return apiResponse(releaseObj)
  })
}