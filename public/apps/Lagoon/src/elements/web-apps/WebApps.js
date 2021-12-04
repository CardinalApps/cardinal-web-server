import Lowrider from '../../../node_modules/lowrider.js/index.js'
import __ from '../../../node_modules/double-u/index.js'
import { html } from '../../../node_modules/html.js/index.js'

export class WebApps extends Lowrider {
  /**
   * Spawn
   */
  onSpawn() {
    this.musicUrl = `${Bridge.httpServer.scheme}${Bridge.httpServer.host}:${Bridge.httpServer.port}/music`
  }

  /**
   * Build
   */
  async onBuild() {
    this.innerHTML = await html('/elements/web-apps/web-apps.html', {
      'musicUrl': this.musicUrl
    })
  }

  /**
   * Loaded
   */
  async onLoad() {
    this.registerEventHandlers()

    this.props.musicUrl = this.musicUrl
  }

  /**
   * Removed
   */
  onRemoved() {
    
  }

  /**
   * Register event handlers for this instance.
   */
  registerEventHandlers() {
    this.querySelector('.info-btn').addEventListener('click', (event) => {
      __(this).find('.help').toggleClass('open')
    })
  }
}