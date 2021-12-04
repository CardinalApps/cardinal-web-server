const { ipcRenderer } = require('electron')
import { createWaveform } from './create.js'

/**
 * Listen for when the main process sends a waveform path to process. Expects an
 * object like:
 * 
 * {
 *  requestId: (int),
 *  path: (string)
 * }
 * 
 * @listens create-waveform-from-path
 */
ipcRenderer.on('create-waveform-from-path', async (event, request) => {
  console.log('Creating waveform from path:', request.path)

  const waveform = await createWaveform(request.path, request.samples)

  console.log('Created waveform:', waveform)

  ipcRenderer.send(`waveform-created-${request.requestId}`, {
    'requestId': request.requestId,
    'waveform': waveform,
    'path': request.path
  })

})