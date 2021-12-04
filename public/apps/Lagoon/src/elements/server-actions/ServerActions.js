import Lowrider from '../../../node_modules/lowrider.js/index.js'
import __ from '../../../node_modules/double-u/index.js'
import { html } from '../../../node_modules/html.js/index.js'

export class ServerActions extends Lowrider {
  /**
   * Spawn
   */
  onSpawn() {
    if (!('httpServer' in Bridge)) {
      console.warn('ServerActions cannot render because Bridge is missing the httpServer property')
      return false
    }
  }

  /**
   * Build
   */
  async onBuild() {
    this.innerHTML = await html('/elements/server-actions/server-actions.html')
  }

  /**
   * Loaded
   */
  async onLoad() {
    this.quitBtn = this.querySelector('button[name="quit"]')
    this.registerEventHandlers()
  }

  /**
   * Removed
   */
  onRemoved() {
    
  }

  /**
   * Registers event handlers for this instance.
   */
  registerEventHandlers() {
    this.quitBtn.addEventListener('click', () => {
      Bridge.ipcSay('quit')
    })
  }
}