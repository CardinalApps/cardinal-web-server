import Lowrider from '../../../node_modules/lowrider.js/index.js'
import __ from '../../../node_modules/double-u/index.js'
import { html } from '../../../node_modules/html.js/index.js'

export class ConnectedDevices extends Lowrider {
  /**
   * Spawn
   */
  onSpawn() {
    this.watchAttr('show-connected-server-uis', () => {
      this.removeConnectedDevices()
      this.sync()
    })
  }

  /**
   * Build
   */
  async onBuild() {
    this.innerHTML = await html('/elements/connected-devices/connected-devices.html')
  }

  /**
   * Loaded
   */
  async onLoad() {
    this.listEl = this.querySelector('.device-list')

    await this.sync()

    // when the server announces that a new device has connected, add it to the
    // list. it will manage itself afterwards
    Bridge.wsListen('new-connection', (connectionId) => {
      console.log('Server says new device connected', connectionId)
      this.insertConnectedDevice(connectionId, 'top')
    })

    // when the server announces that a new device has disconnected, remove it
    // from the list
    Bridge.wsListen('connection-closed', (connectionId) => {
      console.log('Server says device disconnected', connectionId)
      this.removeConnectedDevice(connectionId)
    })
  }

  /**
   * Removed
   */
  onRemoved() {
  
  }

  /**
   * Queries the UI for the connected devices and adds the ones to the UI that
   * aren't already there. They manage themselves afterwards.
   */
  async sync() {
    console.log('Syncing connected devices')

    let apiResponse = await Bridge.httpApi('/connected-devices')

    if (apiResponse.statusRange !== 2) {
      this.showError('Could not reach server.')
      return
    }

    for (let device of apiResponse.response) {
      // the cardinal server UI connects via WebSockets too; maybe dont show it
      // as a client device
      if (!__(this).attr('show-connected-server-uis') && device.app.name === 'cardinalserver') {
        continue
      }

      if (!__(this).find(`[connection-id="${device.connectionId}"]`).els.length) {
        this.insertConnectedDevice(device.connectionId)
      }
    }

    this.updateNumDevices()
  }

  /**
   * Appends a single connected device to the list.
   * 
   * @param {object} connectionId - A connection ID.
   * @param {string} [position] - Where to insert.
   */
  insertConnectedDevice(connectionId, position = 'bottom') {
    let componentHtml = /*html*/`<connected-device connection-id="${connectionId}"></connected-device>`
    
    if (position === 'top') {
      __(this.listEl).prependHtml(componentHtml)
    } else if (position === 'bottom') {
      __(this.listEl).appendHtml(componentHtml)
    }

    this.updateNumDevices()
  }

  /**
   * Removes a device from the list.
   * 
   * @param {object} connectionId - A connection ID.
   */
  removeConnectedDevice(connectionId) {
    __(this).find(`connected-device[connection-id="${connectionId}"]`).remove()
    this.updateNumDevices()
  }

  /**
   * Removes all devices from the list.
   */
  removeConnectedDevices() {
    __(this).find(`connected-device`).remove()
    this.updateNumDevices()
  }

  /**
   * Called when something goes wrong with the connection to the server in the
   * main process.
   */
  showError(message) {
    this.listEl.innerHTML = `<p class="error-message">${message}</p>`
    __(this).addClass('error')
  }

  /**
   * Updates the current number of devices in the attribute.
   */
  updateNumDevices() {
    __(this).attr('num-devices', __(this).find('connected-device').els.length)
  }
}