const { apiResponse } = require('../../../api-io.js')
const { search } = require('cardinal-media-crud')

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
  server.get(base, async (request, response) => {
    if (!('q' in request.query)) {
      response.status(400)
      return apiResponse('Request is missing the "q" query arg.')
    }

    let query = request.query.q
    let searchResults = await search.search(db, query)

    return apiResponse(searchResults)
  })
}