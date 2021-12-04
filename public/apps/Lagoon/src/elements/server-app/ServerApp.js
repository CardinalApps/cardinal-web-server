import __ from '../../../node_modules/double-u/index.js'
import { html } from '../../../node_modules/html.js/index.js'
import { announcementHandler } from './announcement-hooks.js'
import AppBase from '../../../node_modules/cardinal-shared-components/app-base/AppBase.js'

const { shell } = require('electron')

export class ServerApp extends AppBase {
  /**
   * Spawn
   */
  async onSpawn() {
    if (__().enforceSingleton('server-app', this)) return

    const userSelectedLang = await Bridge.ipcAsk('get-option', 'lang')

    // the app is hardcoded to start in english when the router is inited,
    // but if the user selected a lang other than that, we'll quickly switch the
    // lang.
    if (Router.currentLang === 'en' && userSelectedLang !== 'en') {
      Router.setLang(userSelectedLang)
    }

    this.boundAnnouncementListener = announcementHandler.bind(this)
    this.boundOnOptionChange = this.onOptionChange.bind(this)

    // @listens announcements
    Bridge.ipcListen('announcements', this.boundAnnouncementListener)

     // @listens option-change
     Bridge.ipcListen('option-change', this.boundOnOptionChange)

    __(this).attr('color-theme', 'dark')
  }

  /**
   * Build
   */
  async onBuild() {
    await this.preLoadQueries()
    
    this.innerHTML = await html('/elements/server-app/server-app.html')
  }

  /**
   * Loaded
   */
  onLoad() {
    this.registerEventHandlers()

    window.Router.go('/overview', true)
  }

  /**
   * Removed
   */
  onRemoved() {
    Bridge.removeListener('announcements', this.boundAnnouncementListener)
  }

  /**
   * Registers event handlers for this instance.
   */
  registerEventHandlers() {
    /**
     * Opens external links in the users default browser.
     */
    __('a.external').on('click', this, function(event) {
      event.preventDefault()

      let href = __(this).attr('href')
      
      Bridge.ipcSay('open-url', href)
    })

    /**
     * Opens file paths in the system's file explorer.
     */
    __('a.file-path').on('click', this, function(event) {
      event.preventDefault()

      let href = __(this).attr('href')
      
      shell.showItemInFolder(href)
    })

    /**
     * Slidetoggles
     */
    __('.slidetoggle .label').on('click', this, function(event) {
      __(this).closest('.slidetoggle').toggleClass('open')
    })

    window.addEventListener('blur', (event) => {
      if (localStorage.getItem('close-window-on-blur') === '1') {
        window.close()
      }
    })
  }

  /**
   * When a database option changes.
   */
  onOptionChange(optionChange) {
    // when the custom CSS changes, reinject it
    if (optionChange.option === 'custom_css') {
      this.injectCustomCss()
    }

    // add a class when developer mode is enabled
    if (optionChange.option === 'developer_mode') {
      this.enableDeveloperMode(optionChange.newValue)
    }
  }

  /**
   * Called before loadApp(), this will perform db lookups for things that we
   * need before the app can load.
   */
  async preLoadQueries() {
    // inject custom css early to prevent flash of unstyled content
    await this.injectCustomCss()

    // theme color & accent color
    await this.setColors()
  }
}