import __ from '../node_modules/double-u/index.js'
import { Bridge } from '../node_modules/bridge.js/index.js'
import { Router } from '../node_modules/router.js/index.js'
import { getJSONFromFile } from '../node_modules/html.js/index.js'

/**
 * Register all the custom elements, they automatically register with the browser.
 */
import './elements/index.js'

/**
 * The Lagoon theme is the UI for the server. It is designed to only ever run in
 * Electron, and will never be delivered to a smartphone webview.
 */
async function initTheme() {
  // init Bridge singleton
  window.Bridge = new Bridge()
  
  // connect to IPC
  await window.Bridge.init('ipc')
  if (!window.Bridge.ipcConnectionEstablished) throw new Error('Could not establish IPC connection to Electron')
  
  // use ipc to get the info needed to init the http and ws connections
  const serverInfo = await window.Bridge.ipcAsk('get-web-server-info')

  // connect to HTTP
  await window.Bridge.init('http', serverInfo.http)
  if (!window.Bridge.httpConnectionEstablished) throw new Error('Could not establish connection to HTTP server')
  
  // establish the main socket connection
  await window.Bridge.init('ws', serverInfo.ws)
  if (!window.Bridge.wsConnectionEstablished) throw new Error('Could not establish connection to server WebSocket server')

  // init Router singleton and attach it to the window
  window.Router = new Router({
    'root': '#view',
    'mode': 'electron',
    'langs': ['en', 'fr'],
    'defaultLang': 'en',
    'cacheViews': true,
    //currentLang: await window.Bridge.ipcAsk('get-option', 'lang'),
    'currentLang': 'en',
    'routes': await getJSONFromFile('/routes.json')
  })

  // globalize i18n strings
  let i18nStrings = await window.Bridge.httpApi('/i18n')
  
  if (i18nStrings.status === 200) {
    window.i18n = i18nStrings.response
  } else {
    console.error('i18n strings HTTP route did not return with status 200')
  }
  
  // the app renders itself upon injection
  document.body.innerHTML = `<server-app id="app"></server-app>`

  if (Bridge.appDebug) {
    console.log('<server-app> injected')
  }
}

initTheme()