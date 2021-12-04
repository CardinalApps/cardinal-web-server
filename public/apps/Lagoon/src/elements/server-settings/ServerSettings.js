import Lowrider from '../../../node_modules/lowrider.js/index.js'
import __ from '../../../node_modules/double-u/index.js'
import { html } from '../../../node_modules/html.js/index.js'
import * as forms from '../../../node_modules/cardinal-forms/index.js'
import { AppSettings } from '../../../node_modules/cardinal-shared-components/app-settings/AppSettings.js'

export class ServerSettings extends AppSettings {
  /**
   * Spawn
   */
  onSpawn() {
    if (__().enforceSingleton('server-settings', this)) return
  }

  /**
   * Build
   */
  async onBuild() {
    let globalTemplates = this.getFieldTemplates()
    this.innerHTML = await html('/elements/server-settings/server-settings.html', globalTemplates)
  }

  /**
   * Loaded
   */
  async onLoad() {
    this.formSetup()
  }

  /**
   * Removed
   */
  onRemoved() {
    this.removeEventHandlers()
  }
}