import Lowrider from '../../../node_modules/lowrider.js/index.js'
import __ from '../../../node_modules/double-u/index.js'
import { html } from '../../../node_modules/html.js/index.js'

export class ServerStatus extends Lowrider {
  /**
   * Spawn
   */
  onSpawn() {
    this.setStatus('loading')
    this.uptimeIncrementer = null
  }

  /**
   * Build
   */
  async onBuild() {
    this.innerHTML = await html('/elements/server-status/server-status.html')
  }

  /**
   * Loaded
   */
  async onLoad() {
    if (!('httpServer' in Bridge)) {
      console.warn('ServerStatus detected malformed server information in window.Bridge')
      this.setStatus('offline')
      return
    }

    let online = await this.testConnection()

    if (online) {
      this.setStatus('online')
    } else {
      this.setStatus('offline')
    }
  }

  /**
   * Removed
   */
  onRemoved() {
    
  }

  /**
   * Sets the indicators of the server status. Does not change the actual server
   * status.
   * 
   * @param {string} status - loading | connecting | offline | online
   */
  async setStatus(status) {
    __(this).attr('status', status)

    this.stopUptimeIncrementing()

    let urlLink = __(this).find('.info .url a')

    // specific changes per status type
    switch(status) {
      case 'online':
        this.props.url = `${Bridge.httpServer.host}:${Bridge.httpServer.port}`
        urlLink.attr('href', `${Bridge.httpServer.scheme}${Bridge.httpServer.host}:${Bridge.httpServer.port}`)
        this.props.uptime = this.calcUptime() // trigger the first uptime calc immediately
        this.props.version = await this.getVersion()
        this.startUptimeIncrementing()
        break

      case 'offline':
        this.props.url = 'javascript:;'
        urlLink.attr('href', 'N/A')
    }
  }

  /**
   * Attempts to connect to a public test route of the web server.
   * 
   * @returns {boolean} Returns true if the server is online and returned a 200 status
   * for the `/status` API route. False otherwise.
   */
  async testConnection() {
    this.setStatus('connecting')

    let statusResponse = await Bridge.httpApi('/status')

    return statusResponse.status === 200
  }

  /**
   * Sets the version of the server app if it hasn't already been set.
   */
  async getVersion() {
    // no need to recheck... updating the server forced a restart anyway
    if (this.version) return this.version

    let versionReq = await Bridge.httpApi('/version')
    this.version = versionReq.statusRange === 2 ? versionReq.response : '(Unknown)'

    return this.version
  }

  /**
   * Creates an interval that updates the uptime.
   */
  startUptimeIncrementing() {
    this.uptimeIncrementer = setInterval(() => {
      this.props.uptime = this.calcUptime()
    }, 1000)
  }

  /**
   * Destroys the interval that was created by `startUptimeIncrementing()`.
   */
  stopUptimeIncrementing() {
    this.props.uptime = '-'
    clearInterval(this.uptimeIncrementer)
  }

  /**
   * Calculates the uptime of the server and returns a human readable string.
   */
  calcUptime() {
    if (!('startTime' in Bridge.httpServer)) {
      console.warn('Cannot calculate uptime because Bridge does not have HTTP server start time')
      return '-'
    }

    let ms = Date.now() - Bridge.httpServer.startTime
    let seconds = Number(ms / 1000)

    let d = Math.floor(seconds / (3600*24))
    let h = Math.floor(seconds % (3600*24) / 3600)
    let m = Math.floor(seconds % 3600 / 60)
    let s = Math.floor(seconds % 60)

    // less than 1 minute, return seconds
    if (ms < 60000) {
      return `${s}s`
    }
    // less than 1 hour, return minutes and seconds
    else if (ms < 3600000) {
      return `${m}m ${s}s`
    }
    // less than 1 day, return minutes, hours, and seconds
    else if (ms < 86400000) {
      return `${h}h ${m}m ${s}s`
    } 
    // more than 1 day
    else if (ms >= 86400000) {
      return `${d}d ${h}h ${m}m ${s}s`
    }
  }
}