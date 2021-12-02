const { dialog } = require('electron')
const fastifyServerFactory = require('fastify')

module.exports = class HttpServerService {
  constructor(host, port) {
    this.server = fastifyServerFactory({
      //'logging': true
    })

    this.host = host
    this.port = port
    this.scheme = 'http://'
    this.startTime = Date.now()

    // internally keep track of all routes that get registered. this allows us to
    // easily return a master list of all routes for the API onces all modules
    // have finished registering their routes.
    this.server.addHook('onRoute', (routeOptions) => {
      if (!('registeredRoutes' in this)) {
        this.registeredRoutes = []
      }

      this.registeredRoutes.push(routeOptions)
    })
  }

  /**
   * Listen
   */
  listen() {
    // error handler for the server (not for routes)
    this.server.server.on('error', (error) => {
      dialog.showMessageBoxSync({
        'type': 'error',
        'message': `Cannot start the app because an error occured while creating the server.`,
        'detail': error.message
      })

      process.exit(1)
    })

    this.server.listen(this.port, this.host, (error, address) => {
      if (error) {
        this.server.log.error(error)
        process.exit(1)
      }
    })
  }
}