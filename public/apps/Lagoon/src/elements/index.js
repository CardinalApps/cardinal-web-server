import Lowrider from '../../node_modules/lowrider.js/index.js'


/**
 * server-app
 */
import { ServerApp } from './server-app/ServerApp.js'
Lowrider.register('server-app', ServerApp)

/**
 * server-status
 */
import { ServerStatus } from './server-status/ServerStatus.js'
Lowrider.register('server-status', ServerStatus)

/**
 * server-status
 */
import { ServerActions } from './server-actions/ServerActions.js'
Lowrider.register('server-actions', ServerActions)

/**
 * server-settings
 */
import { ServerSettings } from './server-settings/ServerSettings.js'
Lowrider.register('server-settings', ServerSettings)

/**
 * index-controls
 */
import { IndexControls } from './index-controls/IndexControls.js'
Lowrider.register('index-controls', IndexControls)

/**
 * index-stats
 */
import { IndexStats } from './index-stats/IndexStats.js'
Lowrider.register('index-stats', IndexStats)

/**
 * index-directories
 */
import { IndexDirectories } from './index-directories/IndexDirectories.js'
Lowrider.register('index-directories', IndexDirectories)

/**
 * connected-devices
 */
import { ConnectedDevices } from './connected-devices/ConnectedDevices.js'
Lowrider.register('connected-devices', ConnectedDevices)

/**
 * connected-device
 */
import { ConnectedDevice } from './connected-device/ConnectedDevice.js'
Lowrider.register('connected-device', ConnectedDevice)

/**
 * connected-device
 */
import { WebApps } from './web-apps/WebApps.js'
Lowrider.register('web-apps', WebApps)