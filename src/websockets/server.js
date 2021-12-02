const WebSocketService = require('./WebSocketService.js')

/**
 * Creates a WebSocket server that listens on an IP and port.
 */
exports.newWebSocketService = (host, port) => {
  console.log(`Creating WebSocket server. Host: ${host}; Port: ${port};`)

  let service = new WebSocketService(host, port)

  console.log(`WebSocket server created`)

  return service
}