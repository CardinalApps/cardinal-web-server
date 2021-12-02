const { apiResponse } = require('../../../api-io.js')
const webServer = require('../../../web-server.js')

/**
 * Registers RESTful HTTP routes.
 * 
 * @param {object} serverObj - The server object.
 * @param {DatabaseService} db - Hydra database server instance.
 */
exports.register = (base, server, db) => {
  function connectedDeviceObj(connection) {
    return {
      ...connection.getDeviceProfile(),
      'state': {...connection.lastKnownClientState}
    }
  }

  /**
   * Returns all connected devices. Clients must have established the WebSocket
   * connection using the Bridge.
   *
   * Note that this can also include the Cardinal Server itself (the UI uses
   * WebSockets).
   */
  server.get(base, async (request, response) => {
    const primaryServer = webServer.getServer('primary')

    const devices = primaryServer.ws.connections.map((connection) => {
      return connectedDeviceObj(connection)
    })
    
    return apiResponse(devices)
  })

  /**
   * Returns the device profile for a single WebSocket connection.
   */
  server.get(`${base}/:connectionId`, async (request, response) => {
    const primaryServer = webServer.getServer('primary')
    let profile = null

    for (let connection of primaryServer.ws.connections) {
      if (connection.id === request.params.connectionId) {
        profile = connectedDeviceObj(connection)
      }
    }

    // no connection was found with that ID
    if (!profile) {
      response.status(400)
      return apiResponse('Invalid connection ID')
    }
    
    return apiResponse(profile)
  })
}