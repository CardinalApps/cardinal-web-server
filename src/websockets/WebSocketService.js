const WebSockets = require('ws')
const WebSocketConnection = require('./WebSocketConnection.js')

/**
 * The WebSocketService class wraps a single WebSocket server. The app can
 * theoretically create as many WebSocketService instances as it wants (on
 * different ports).
 * 
 * Each WebSocketService instance keeps track of the connections to it.
 */
module.exports = class WebSocketService {
  constructor(host, port) {
    this.host = host
    this.port = port
    this.scheme = 'ws://'
    this.startTime = Date.now()

    // the name of the channel that the client ALWAYS gets messages from, even
    // if they aren't subscribed to it
    this.forcedChannel = 'NOCHANNEL'
    this._channelCallbacks = {}

    this.connections = []

    // init server instance
    this.serverInstance = new WebSockets.Server({
      'host': this.host,
      'port': this.port
    })

    // when a new connection is established
    this.serverInstance.on('connection', this._onServerConnection.bind(this))
  }

  /**
   * Callback for the 'connection' event of the WebSocket server.
   */
  _onServerConnection(socket, connection) {
    console.log('WebSocket server established connection with:', connection.headers['user-agent'])

    // create a new connection instance
    let connectionInstance = new WebSocketConnection(socket, connection, this, {
      'onMessage': this._onServerConnectedDeviceMessage.bind(this),
      'onClose': this._onConnectionClosed.bind(this),
    })

    // save a ref to the connection
    this.connections.push(connectionInstance)

    // immediately send the client the connection ID
    connectionInstance.send('connection-id', connectionInstance.id)

    // announce that a new device has connected. note that the first param is
    // the connection id because that's what's being sent to all subscribers of
    // this event
    this.say(connectionInstance.id, 'new-connection')
  }

  /**
   * Callback for when ANY connected device sends a message to the server
   * thorugh the WebSocketConnection listener.
   * 
   * @param {string} channel - The channel that the client chose.
   * @param {string} message - Message from client.
   * @param {WebSocketConnection} - Connection instance.
   */
  _onServerConnectedDeviceMessage(channel, message, connection) {
    //console.log(channel, message, connection)
  }

  /**
   * Callback for when any connection gets closed.
   */
  _onConnectionClosed(connection) {
    // find the connection and remove it from the internal array
    for (let index in this.connections) {
      if (this.connections[index].id === connection.id) {
        this.connections.splice(index, 1)

        // announce it
        this.say(connection.id, 'connection-closed')

        console.log(`WebSocket connection ${connection.id} closed`)
      }
    }
  } 

  /**
   * Sends a message to the client(s) over the main WebSocket.
   *
   * @param {string} message - Message to send.
   * @param {string} [channel] - The channel name. The client must have used
   * `Bridge.wsListen()` to register a listener for the channel. Set to `true`
   * to forcefully send the message even if the client did not register a
   * listener.
   * @param {string} connectionId - Client to send to. Omit to send to ALL
   * connected clients that match the channel. The following strings also work:
   * - `server` - Send to all connected server UI's.
   * - `music` - Send to all connected music apps.
   */
  say(message, channel, connectionId) {
    let recipients = []

    // no connectionId? use all active connections
    if (!connectionId) {
      recipients = this.connections
    } else if (connectionId === 'server') {
      recipients = this.connections.filter(conn => conn.deviceProfile.app.name === 'cardinalserver')
    } else if (connectionId === 'music') {
      recipients = this.connections.filter(conn => conn.deviceProfile.app.name === 'cardinalmusic')
    } else {
      recipients = this.connections.filter(conn => conn.id === connectionId)
    }

    // no clients to send message to. this can happen when there are no apps
    // running when the server closes its UI, which means last websocket
    // connection was just closed
    if (!recipients.length) {
      return
    }

    // no channel? use the forced channel to forcefully send the message
    if (channel === true) {
      channel = this.forcedChannel
    }

    for (let connection of recipients) {
      // if we are not on the forced channel, we must check if the client has
      // subscribed to it
      if (channel !== this.forcedChannel) {
        // if it didn't subscribe, don't send
        if (!connection.clientChannelListeners.includes(channel)) {
          continue
        }
      }

      try {
        console.log(`Sending WebSocket response to connection "${connectionId}" on channel "${channel}"`)
        // console.log(message)
        connection.send(channel, message)
      } catch (error) {
        console.error(`Error sending WebSocket message to "${connectionId}" on channel "${channel}"`, message)
        throw error
      }
    }
  }

  /**
   * Register a listener for a specific channel
   */
  on(channel, cb) {
    // create the channel array of callbacks if it doesn't exist
    if (!(channel in this._channelCallbacks)) {
      this._channelCallbacks[channel] = []
    }

    this._channelCallbacks[channel].push(cb)
  }
}