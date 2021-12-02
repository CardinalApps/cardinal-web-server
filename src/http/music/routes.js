const path = require('path')
const fastifyStatic = require('fastify-static')

exports.register = (server, db) => {
  /**
   * Static path for cached music artwork.
   */
  server.register(fastifyStatic, {
    'root': path.join(db.appFilesPath, 'IndexingServiceCache'),
    'prefix': '/image-cache/',
    'decorateReply': false,
    'cacheControl': false,
    'setHeaders': (res, path, stat) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    }
  })

  /**
   * Redirect /music to /music/ to force the trailing slash for easy
   * compatibility with file paths that are intended to work both on the web and
   * in Electron.
   *
   * For example, when a script is embedded like this
   *
   *     <script src="./file.js"></script>
   *
   * In Electron, this will load the file with a XHR request using the file://
   * scheme which Electron handles.
   *
   * On the web, it will load the file with a XHR request using http://, but the
   * browser will only prepend '/music' to the resource URL if there is a
   * trailing slash.
   */
  server.get('/music', (request, response) => {
    response.code(301)
    response.redirect('/music/')
  })

  /**
   * Static route for serving the Music app. These files are bundled in the
   * asar archive.
   */
  server.register(fastifyStatic, {
    'root': path.join(process.mainModule.path, 'src', 'renderer', 'public', 'themes', 'Andromeda', 'src'),
    'prefix': '/music',
    'prefixAvoidTrailingSlash': false,
    'decorateReply': false,
  })

  /**
   * **In dev env only**, serve the theme node_modules statically so that the
   * client can run unbundled.
   *
   * In prod, this is not served statically, and the modules that live in
   * the theme's node_modules get bundled into the main client bundle.
   */
  if (process.env.HYDRA_RUN_MODE === 'source') {
    server.register(fastifyStatic, {
      'root': path.join(process.mainModule.path, 'src', 'renderer', 'public', 'themes', 'Andromeda', 'node_modules'),
      'prefix': '/node_modules',
      'prefixAvoidTrailingSlash': true,
      'decorateReply': false
    })
  }

  /**
   * **In prod only**, redirect requests for andromeda.js to bundle.js. This is
   * just to let the browser which file to use when the app is running in
   * bundled mode.
   *
   * Note that the file andromeda.js doesn't get packaged with the app, so if
   * this redirect ever breaks, the user will see a 404 instead of leaked source
   * code.
   */
  if (process.env.HYDRA_RUN_MODE === 'bundle') {
    server.get('/music/andromeda.js', (request, response) => {
      response.code(301)
      response.redirect('/music/bundle.js')
    })
  }
}