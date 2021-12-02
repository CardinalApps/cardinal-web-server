/**
 * @module
 *
 * Registers routes and hooks for the server.
 */
const fs = require('fs')
const path = require('path')
const mediaCrud = require('hydra-media-crud')
const { apiResponse } = require('../api-io.js')
const { onSendHook, preHandlerHook } = require('./hooks/')
const musicRoutes = require('./music/routes.js')

/**
 * Registers all RESTful routes and hooks for the server.
 * 
 * @param {object} serverObj - The server object.
 * @param {DatabaseService} db - The DatabaseService instance.
 */
exports.register = (server, db) => {
  /**
   * Register hooks.
   */
  server.addHook('onSend', onSendHook)
  server.addHook('preHandler', preHandlerHook)

  /**
   * Route: /
   *
   * This is a simple landing page letting users know that the server is
   * connectable from their device.
   */
  server.get('/', (request, response) => {
    let template = path.join(process.mainModule.path, 'src', 'renderer', 'public', 'themes', 'ServerLanding', 'src', 'index.html')
    let stream = fs.createReadStream(template)

    response.type('text/html').send(stream)
  })

  /**
   * Route: /api/status
   *
   * Designed to be used by client apps to check if the server API is online. If
   * this function can send a reply, it's online.
   */
  server.get('/api/status', async (request, response) => {
    response.status(200)
    return '200 OK'
  })

  /**
   * Route: /api/version
   * 
   * Returns the version of the server app.
   */
  server.get('/api/version', async (request, response) => {
    return process.env.HYDRA_SERVER_VERSION
  })

  /**
   * Route: /api/query
   *
   * Designed to receive queries from the front end Query.js module. Note that
   * this is a POST method to support the request body, even though this route
   * acts more like GET.
   *
   * TODO replace this with the RESTful API. This is only supposed to exist
   * during the transition from Echoes to Cardinal.
   */
  server.post('/api/query', async (request, response) => {
    try {
      let results = await db.all(request.body)
      return JSON.stringify(results)
    } catch(err) {
      response.status(400)
      return apiResponse('SQL execution failed. This is probably due to bad SQL syntax.')
    }
  })

  /**
   * Route: /api/db-api
   * 
   * Exposes low level database functionality.
   * 
   * TODO replace this with the RESTful API. This is only supposed to exist
   * during the transition from Echoes to Cardinal.
   */
  server.post('/api/db-api', async (request, response) => {
    if (!request.body) {
      response.status(400)
      return apiResponse('Missing body')
    }

    let query = request.body

    let apiResult = await db[query.fn](...query.args)

    return apiResponse(apiResult)
  })

  /**
   * Route: /api/media-api
   * 
   * Exposes the hydra-media-crud package.
   * 
   * TODO replace this with the RESTful API. This is only supposed to exist
   * during the transition from Echoes to Cardinal.
   */
  server.post('/api/media-api', async (request, response) => {
    if (!request.body) {
      response.status(400)
      return apiResponse('Missing body')
    }

    let query = request.body

    // believe it or not, there's a good explanation for the double name
    let apiResult = await mediaCrud.mediaCrud[query.fn](db, ...query.args)

    // these events get announced over IPC
    // switch(query.fn) {
    //   case 'deleteArtist':
    //   case 'deleteAlbum':
    //   case 'deleteTrack':
    //   case 'deleteGenre':
    //   case 'deletePlaylist':
    //     if (apiResult === true) {
    //       echoesApp.userBrowserWindows.mainPlayer.webContents.send(`deleted-${query.fn.replace('delete', '').toLowerCase()}`, query.args)
    //     }
    //     break
    // }

    return apiResponse(apiResult)
  })

  /**
   * Routes for web apps.
   */
  musicRoutes.register(server, db)

  /**
   * RESTful API routes.
   */
  require('./api/connected-devices/').register(server, db)
  require('./api/directories/').register(server, db)
  require('./api/directory/').register(server, db)
  require('./api/favorites/').register(server, db)
  require('./api/music-artist/').register(server, db)
  require('./api/music-release/').register(server, db)
  require('./api/music-track/').register(server, db)
  require('./api/search/').register(server, db)
}