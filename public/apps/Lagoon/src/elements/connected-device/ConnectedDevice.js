import Lowrider from '../../../node_modules/lowrider.js/index.js'
import __ from '../../../node_modules/double-u/index.js'
import i18n from '../../../node_modules/i18n.js/index.js'
import { html } from '../../../node_modules/html.js/index.js'

export class ConnectedDevice extends Lowrider {
  /**
   * Spawn
   */
  async onSpawn() {
    this.connectionId = __(this).attr('connection-id')

    // this component must spawn with a connection ID
    if (!this.connectionId) {
      throw new Error('Connection ID required')
    }

    this.state = null
    this._currentTimeInterval = null

    // get device profile on spawn
    let apiResponse = await Bridge.httpApi(`/connected-devices/${this.connectionId}`)
    
    if (apiResponse.statusRange !== 2) {
      this.showError(apiResponse.response)
      return
    }

    if (apiResponse.response.connectionId !== this.connectionId) {
      throw new Error("Somehow, the connection ID's do not match")
    }

    this._boundStateUpdateListener = this.onDeviceStateChange.bind(this)

    // @listens client-to-server-state-update
    Bridge.wsListen('client-to-server-state-update', this._boundStateUpdateListener)

    this.deviceProfile = apiResponse.response
    this.state = apiResponse.response.state
  }

  /**
   * Disable caching for this component.
   */
  shouldBuild() {
    return true
  }

  /**
   * Build
   */
  async onBuild() {
    __(this).attr('app', this.deviceProfile.app.name)

    // the connected device is the server UI
    if (this.deviceProfile.app.name === 'cardinalserver') {
      this._buildServerConnection()
    }
    // the connected device is a music app
    else if (this.deviceProfile.app.name === 'cardinalmusic') {
      this._buildMusicConnection()
    }
  }

  /**
   * Builds the general info a connection that applies to all connection types
   * (IP, version, etc).
   */
  _buildGeneralInfo() {
    this.props.ip = this.deviceProfile.client.ip
    this.props.version = this.deviceProfile.app.version

    __(this).attr('os', this.deviceProfile.client.os.name.toLowerCase().replace(' ', ''))
    //__(this).attr('device', this.deviceProfile.client.device)
  }

  /**
   * Builds the HTML for a connected server app. Note that this connection type
   * is hidden by default because there would always be one there... it's the
   * very UI that the user is using.
   */
  async _buildServerConnection() {
    const templateVars = {
      'appName': i18n('cardinalserver')
    }

    this.innerHTML = await html('/elements/connected-device/server.html', templateVars)
    this._buildGeneralInfo()

    __(this).find('.icon img').attr('src', 'images/logo-server.svg')
  }

  /**
   * Builds the HTML for a connected music app.
   */
  async _buildMusicConnection() {
    const templateVars = {
      'appName': i18n('cardinalmusic')
    }

    this.innerHTML = await html('/elements/connected-device/music.html', templateVars)
    this._buildGeneralInfo()

    __(this).find('.icon img').attr('src', 'images/logo-music.svg')

    // the default state is "stopped" until the websockets tell us otherwise
    __(this).attr('playback-state', 'stopped')

    this.updateClientState()
  }

  /**
   * Loaded
   */
  async onLoad() {
    __(this).find('[data-control]').each((el) => {
      el.addEventListener('click', (event) => {
        let command = __(el).attr('data-control')
  
        console.log('Sending playback instruction to client', command)
  
        Bridge.wsSay('server-to-client-instruction', {
          'client': __(this).attr('connection-id'),
          'instruction': 'remote-playback-control',
          'command': command
        })
      })
    })
  }

  /**
   * Removed
   */
  onRemoved() {
    Bridge.removeWsListener('client-to-server-state-update', this._boundStateUpdateListener)
  }

  refresh() {

  }

  /**
   * Triggered when ANY connected client app updates its state.
   */
  onDeviceStateChange(message) {
    //console.log('onDeviceStateChange()', message)

    // filter down to the state updates for this connection only
    if (this.getAttribute('connection-id') !== message.connectionId) {
      return
    }

    this.state = message
    this.updateClientState()
  }

  /**
   * Updates the state of the HTML using the instance's internal state object.
   */
  updateClientState() {
    console.log('updateClientState()', this.state)

    // if the client hasnt sent it's state yet, this happens on client
    // connection because the messages come in on different channels
    if (!this.state) {
      return
    }

    __(this).attr('playback-state', this.state.state)
    __(this).attr('playback-method', this.state.method)

    if (this.state.state === 'playing' || this.state.state === 'paused') {
      this.props.track = this.state.track.track_title
      this.props.release = this.state.track.meta.album
      this.props.artist = this.state.track.meta.artist
      this.props.currentTime = this.state.currentTime
      this.props.totalTime = this.state.totalTime
      this.beginTimeUpdating()
    } else {
      this.stopTimeUpdating()
    }
  }

  /**
   * Called when something goes wrong with the connection to the server in the
   * main process.
   */
  showError(message) {
    this.innerHTML = `<p class="error-message">${message}</p>`
    __(this).addClass('error')
  }

  /**
   * Invoking this function will create an interval that updates the current
   * playback time and the scrubber bar in the UI. The interval is saved to the
   * class property `_currentTimeInterval`.
   */
  beginTimeUpdating() {
    let timerEl = this.querySelector('[data-prop="currentTime"]')

    // clear the previous timer
    this.stopTimeUpdating()

    // UI update interval. this must run while music is paused as well, in order
    // to restore the correct state after playing with the seek bar
    this._currentTimeInterval = setInterval(() => {
      // do nothing if the music is not playing
      if (this.state.state === 'stopped') throw new Error('Interval should be destroyed when the music is stopped, find your bug.')
      
      this.state.currentSeconds++
      this.state.currentTime = __().convertSecondsToHHMMSS(this.state.currentSeconds)

      // update time
      __(timerEl).html(this.state.currentTime)
    }, 1000)
  }

  /**
   * Deletes the interval that updates the time and progress bar in the UI.
   */
  stopTimeUpdating() {
    clearInterval(this._currentTimeInterval)
  }
}