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
   * Creates a directory object and returns the new ID.
   */
  server.post(base, async (request, response) => {
    if (request.body === null || typeof request.body !== "object") {
      response.status(400)
      return apiResponse('Request body must be an object.')
    }

    let givenObj = request.body

    // don't allow duplicates
    let existsInDb = await directoryCrud.getDirectory(db, givenObj.dir_path)

    if (existsInDb) {
      response.status(409)
      return apiResponse('Duplicate paths are not allowed.')
    }

    // add the new dir to the db if it
    let newId = await directoryCrud.addDirectory(db, {
      'dir_path': givenObj.dir_path,
      'dir_multimedia_type': givenObj.dir_multimedia_type,
      'dir_date_added': Date.now()
    })

    response.status(201)
    return apiResponse(await directoryCrud.getDirectory(db, newId))
  })
}