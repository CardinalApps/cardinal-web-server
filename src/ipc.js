const webServer = require('./web-server.js')

/**
 * Registers all main process IPC listeners for this module.
 */
exports.register = () => {
  const { ipcMain } = require('electron')
  
  console.log('Registering web-server IPC handlers')

  /**
   * Returns infomation about the web server.
   *
   * @listens get-init-data
   */
  ipcMain.handle('get-web-server-info', async (event, arg) => {
    console.info('ipcMain received: get-web-server-info')

    try {
      let serverData = webServer.getServerInfo('primary')

      return serverData
    } catch (err) {
      return new Error('Could not get the theme init data')
    }
  })
}