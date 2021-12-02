let UAParser = require('ua-parser-js')

/**
 * Each new WebSocket connection to the server gets wrapped in this class and
 * kept in memory by a single WebSocketServer instance.
 * 
 * The client should use Bridge.js to create connections.
 */
module.exports = class WebSocketConnection {
  /**
   * @param {object} socket - `socket` variable from ws.js.
   * @param {object} connection - `connection` variable from ws.js.
   * @param {object} callbacks - An object of callback functions.
   * @param {function} callbacks.onMessage - When this connection receives a
   * message from the client.
   * @param {function} callbacks.onClose - When this connection is closed by the
   * client.
   */
  constructor(socket, connection, WebSocketService, callbacks = {}) {
    this.socket = socket
    this.connection = connection
    
    // save a ref to the WebSocketService that manages this connection
    this.WebSocketService = WebSocketService

    // channels that the client registered listenrs for (using Bridge.wsSay())
    this.clientChannelListeners = []

    // callbacks that are registered by the WebSocketService
    this.callbacks = callbacks

    this.deviceNameServer = 'cardinalserver'
    this.deviceNameMusic = 'cardinalmusic'

    this.id = this.generateId()
    this.deviceProfile = this.getDeviceProfile()

    this.socket.on('message', this._onMessage.bind(this))
    this.socket.on('close', this._onClose.bind(this))
  }

  /**
   * When the connected client sends a message to the server, it arrives here.
   * This method allows some apps to send only certain types of messages (e.g.,
   * only the server app can issue commands to client players).
   *
   * @param {string} payload - The client use Bridge.js, which sends a
   * stringified object with two keys: `channel` and `message`.
   */
  _onMessage(payload) {
    payload = JSON.parse(payload)

    if (typeof payload !== 'object') {
      console.log('Bridge sent invalid data')
      this.send(null, null)
      return
    }

    let channel = payload.channel
    let message = payload.message

    // any app that uses Bridge.wsListen('channel') will send a message on the
    // `add-channel` channel, which asks this WebSocketConnection instance to
    // add a listener on a certain channel.
    if (channel === 'add-channel') {
      this.clientChannelListeners.push(message)
      console.log(`Connected device "${this.deviceProfile.app.name}" subscribed to channel "${message}"`)
    }

    // limit certain types of messages to certain apps
    switch (this.deviceProfile.app.name) {
      case 'cardinalserver':
        this._handleServerMessage(channel, message)
        break

      case 'cardinalmusic':
      case 'cardinalphotos':
      case 'cardinalcinema':
      case 'cardinalbooks':
        this._handleClientMessage(channel, message)
        break
    }

    // forward the message to the WebSocketServer instance that manages this connection
    if ('onMessage' in this.callbacks) {
      this.callbacks.onMessage(channel, message, this)
    }
  }

  /**
   * When the connected client closes the connection.
   */
  _onClose() {
    if ('onClose' in this.callbacks) {
      this.callbacks.onClose(this)
    }
  }

  /**
   * Messages that only the server app is allowed to send.
   */
  _handleServerMessage(channel, message) {
    if (channel === 'server-to-client-instruction') {
      if (!('instruction' in message)) throw new Error('server-to-client-instruction WebSocket channel requires message.instruction')
      if (!('client' in message)) throw new Error('server-to-client-instruction WebSocket channel requires message.client')
      if (!('command' in message)) throw new Error('server-to-client-instruction WebSocket channel requires message.command')
      
      console.log(`Forwarding server-to-client-instruction to client with ID ${message.client}`)
      
      this.WebSocketService.say(message, 'server-to-client-instruction', message.client)
    }
  }

  /**
   * Messages that only client apps are allowed to send.
   */
  _handleClientMessage(channel, message) {
    if (channel === 'client-to-server-state-update') {
      console.log(`Forwarding client-to-server-state-update to server UI`)
      
      // cache the state
      this.lastKnownClientState = message

      // attach the connection ID before sending it
      message.connectionId = this.id

      this.WebSocketService.say(message, 'client-to-server-state-update', 'server')
    }
  }

  /**
   * Generates random ID's that get used for connections.
   * 
   * Format is xxxx-xxxx-xxxx-xxxx
   */
  generateId() {
    function part() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
    }

    return `${part()}-${part()}-${part()}-${part()}`
  }

  /**
   * Sends a message to the connected client.
   */
  send(channel, message) {
    this.socket.send(this.responseObject(channel, message))
  }

  /**
   * Returns the object that is given to the client with every WebSocket response.
   * 
   * @returns {object}
   */
  responseObject(channel, message) {
    return JSON.stringify({
      channel,
      message
    })
  }

  /**
   * Returns an object of information about the device that is on the other end
   * of this connection.
   * 
   * @returns {object}
   */
  getDeviceProfile() {
    const ip = this.connection.socket.remoteAddress
    const remotePort = this.connection.socket.remotePort
    const userAgent = this.connection.headers['user-agent']
    const agentInfo = new UAParser(userAgent)

    let cardinalApp = 'Unknown'
    let cardinalAppVersion = 'Unknown'

    // match Cardinal Server app UI
    if (userAgent.includes(this.deviceNameServer)) {
      cardinalApp = this.deviceNameServer
      cardinalAppVersion = 'v.' + userAgent.match(/(?:cardinalserver\/)\S+/)[0].split('/').pop()
    }
    // match Cardinal Music
    else if (userAgent.includes(this.deviceNameMusic)) {
      cardinalApp = this.deviceNameMusic
      cardinalAppVersion = 'v.' + userAgent.match(/(?:cardinalmusic\/)\S+/)[0].split('/').pop()
    }
    // match a web app
    else if (!userAgent.includes('electron')) {
      // the web app type can be determined by the URL
      if (this.connection.url.includes('music')) {
        cardinalApp = this.deviceNameMusic
        cardinalAppVersion = 'Web'
      }
    }

    return {
      'app': {
        'name': cardinalApp,
        'version': cardinalAppVersion
      },
      'userAgent': userAgent,
      'client': {
        'ip': ip,
        'browser': agentInfo.getBrowser(),
        'cpu': agentInfo.getCPU(),
        'device': agentInfo.getDevice(),
        'engine': agentInfo.getEngine(),
        'os': agentInfo.getOS(),
        'port': remotePort
      },
      'connectionHeaders': this.connection.headers,
      'url': this.connection.url,
      'connectionId': this.id
    }
  }
}