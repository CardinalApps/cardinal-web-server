const HttpServerService = require('./HttpServerService.js')

/**
 * Creates and wraps a HttpServerService instance.
 */
exports.newHttpServerService = (host, port, options) => {
  console.log(`Creating HTTP server. Host: ${host}; Port: ${port};`)

  let service = new HttpServerService(host, port, options)

  console.log(`HTTP server created`)

  return service
}