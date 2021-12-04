/**
 * @module web-server
 * 
 * This module oversees both HTTP web servers (Fastify) and WebSocket servers (ws.js).
 */

const nodeIp = require('ip')
const { newHttpServerService } = require('./http/server.js')
const { newWebSocketService } = require('./websockets/server.js')
const httpRoutes = require('./http/routes.js')

// TODO remove when media-api endpoint is removed

/**
 * Holds references to all active servers. Use `getServerInfo()` to retreive
 * references to these servers.
 */
exports.servers = {}

/**
 * Creates everything needed to run the Cardinal web server(s). Calling this will
 * create a HTTP server and a WebSocket server. This will fire up the websocket
 * server, but not the HTTP server because it would prevent routes from being
 * registered. You must call `listen()` to actually start the HTTP server.
 *
 * @param {string} name - Give the server a name that can be used to reference
 * it later.
 * @param {string} [host] - IP address to host the web server on. Defaults to
 * 'auto'. When using 'auto', it will automatically use the IP address of this
 * computer on the local network so that the web server is accessible on the
 * local network.
 * @param {(number|string)} [port] - Port that the HTTP server should listen on.
 * Defaults to 'auto'. The WebSocket sever will automatically use the HTTP port
 * + 1.
 * @param {string} [httpDriver] - The npm library to use to handle the HTTP
 * server. Defaults to `fastify`. New drivers must be installed with npm first.
 * The WebSockets server always uses `ws.js`.
 * @returns {object} Returns the web server object.
 */
exports.create = (name, host = 'auto', port = 'auto') => {
  if (!name) throw new Error('Name is required')
  if (name in this.servers) throw new Error(`Cannot create server with name ${name} because it is already used`)
  
  if (host === 'auto') {
    // when running on the users machine, get the machines public IP
    if (process.env.HYDRA_RUN_MODE === 'bundle') {
      host = nodeIp.address()
    }
    // when running as source code (aka dev mode) use localhost to avoid
    // conflict with the running production app on the same machine
    else if (process.env.HYDRA_RUN_MODE === 'source') {
      host = 'localhost'
    }
  }

  // uncomment to use prod IP in dev
  // host = nodeIp.address()
  
  if (port === 'auto') {
    port = 3080
  } else {
    // ensure that the given port is an integer if it's not "auto", becauase we
    // need to increment it to get the websocket port
    port = parseInt(port)
  }

  let serverObj = {
    'http': null,
    'ws': null
  }

  // create http and ws server instances
  try {
    serverObj.http = newHttpServerService(host, port)
    serverObj.ws = newWebSocketService(host, port + 1)
  } catch (error) {
    throw error
  }

  this.servers[name] = serverObj

  return serverObj
}

/**
 * Tells the HTTP server to start listening.
 */
exports.listen = (name) => {
  if (!name) throw new Error('listen() requires a server name')
  this.servers[name].http.listen()
}

/**
 * Returns a reference to a complete server object.
 */
exports.getServer = (name) => {
  if (!name) throw new Error('getServer() requires a server name')
  return this.servers[name]
}

/**
 * Returns stringify-able information about a single web server.
 * 
 * @param {string} name - Internal server name (e.g., "primary").
 * @returns {object}
 */
exports.getServerInfo = (name) => {
  let copy = {...this.servers[name]}

  // remove the server instance refs, it can't be stringified for IPC/WS usage
  delete copy.http.server
  delete copy.ws.server

  return copy
}

/**
 * Function that registers the primary routes, aka the main server app (API
 * routes and all that stuff).
 */
exports.registerPrimaryRoutes = (serverName, db, publicDir) => {
  // the serverName is probably also "primary"
  let server = this.getServer(serverName)

  httpRoutes.register(server.http.server, db, publicDir)
}