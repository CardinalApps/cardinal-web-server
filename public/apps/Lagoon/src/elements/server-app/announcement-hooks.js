/**
 * @file
 * 
 * These are the actions that can be triggered by the main process through the 'announcements'
 * ipc channel to make the theme do things.
 */
import __ from '../../../node_modules/double-u/index.js'

/**
 * Directly called by the ipc listener for the 'announcements' channel.
 */
export async function announcementHandler(announcement, event) {
  console.log(`%c${announcement.action}`, 'color:#f39a11;')

  // all possible hooks
  switch (announcement.action) {
    case 'openSettings':
      __('fullsize-settings').el().openSettingsPanel()
      break 

    case 'zoom-in':
      // zoom is controlled manually in Electron
      if (Bridge.ipcConnectionEstablished) {
        const { webFrame } = require('electron')
        webFrame.setZoomLevel(webFrame.getZoomLevel() + 0.5)
      }
      break

    case 'zoom-out':
      // zoom is controlled manually in Electron
      if (Bridge.ipcConnectionEstablished) {
        const { webFrame } = require('electron')
        webFrame.setZoomLevel(webFrame.getZoomLevel() - 0.5)
      }
      break

    case 'reset-zoom':
      // zoom is controlled manually in Electron
      if (Bridge.ipcConnectionEstablished) {
        const { webFrame } = require('electron')
        webFrame.setZoomLevel(0)
      }
      break
  }
}