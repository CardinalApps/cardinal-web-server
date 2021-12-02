const fs = require('fs')
const { apiResponse, sanitizeArtwork } = require('../../../api-io.js')
const { trackCrud, metaCrud, imageCrud } = require('hydra-media-crud')
const { invisibleWindowFactory } = require('hydra-electron-browser-windows')

let waveformIncrementor = 0
let waveformCreatorWindow = null

/**
 * Registers RESTful HTTP routes.
 * 
 * @param {object} serverObj - The server object.
 * @param {DatabaseService} db - Hydra database server instance.
 */
exports.register = (base, server, db) => {
  /**
   * Returns a single track object.
   */
  server.get(`${base}/:id`, async (request, response) => {
    if (!('id' in request.params)) {
      response.status(400)
      return apiResponse('Request is missing the ID.')
    }

    let id = parseInt(request.params.id)
    let trackRow = await trackCrud.getTrack(db, id)
    let trackMeta = await metaCrud.getAllMeta(db, 'music_track', id)
    let file = await db.getFile(trackRow.track_file_id)
    let artwork = null

    if (trackMeta.artwork) {
      artwork = await imageCrud.getImage(db, trackMeta.artwork)
      artwork = sanitizeArtwork(artwork)
    }

    let trackObj = {
      ...trackRow,
      'meta': trackMeta,
      'artwork': artwork,
      'file': file
    }

    return apiResponse(trackObj)
  })

  /**
   * Creates a streamable URL for a single music track, with all of the required
   * headers for playback resuming/seeking on the client, or the headers for
   * streaming a live broadcast, depending on what the client asks for.
   */
  server.get(`${base}/:id/stream`, async (request, response) => {
    if (!('id' in request.params)) {
      response.status(400)
      return apiResponse('Request is missing the ID.')
    }

    const trackId = parseInt(request.params.id)

    // get the track object
    const trackObj = await trackCrud.getTrack(db, trackId)
    if (!trackObj) {
      response.status(404)
      return apiResponse('Invalid track ID.')
    }

    // get the file object
    const file = await db.getFile(trackObj.track_file_id)
    if (!file) {
      response.status(404)
      return apiResponse('Error finding file object associated with this track.')
    }

    // ensure the file exists on the disk
    let filePath = file.file_path
    if (!fs.existsSync(filePath)) {
      response.status(404)
      return apiResponse('Could not locate file resource on the disk.')
    }

    // get the size of the file
    let stat = fs.statSync(filePath)
    if (!stat) {
      response.status(500)
      return apiResponse('Error reading file size.')
    }

    const total = stat.size

    // when the client asks for a range, send back a portion of the data
    if (request.headers.range) {
      let range = request.headers.range
      let parts = range.replace(/bytes=/, '').split('-')
      let partialStart = parts[0]
      let partialEnd = parts[1]

      let start = parseInt(partialStart, 10)
      let end = partialEnd ? parseInt(partialEnd, 10) : total-1
      let chunkSize = (end - start) + 1

      let readStream = fs.createReadStream(filePath, {'start': start, 'end': end});

      response.status(206)
      response.header('Accept-Ranges', 'bytes')
      response.header('Content-Range', `bytes ${start}-${end}/${total}`)
      response.header('Content-Length', chunkSize)
      response.header('Content-Type', 'audio/mpeg')

      response.send(readStream)
     }
     // no range, behaves like a live broadcast (no pause/resume, no seeking)
     else {
      let readStream = fs.createReadStream(filePath)

      response.status(200)
      response.header('Content-Length', total)
      response.header('Content-Type', 'audio/mpeg')

      response.send(readStream)
     }
  })

  /**
   * Returns the waveform of an audio file. Wavefroms are based on loudness.
   *
   * If the waveform exists in the databse cache, the cached value will be
   * returned, otherwise the file path is sent to the waveform process for
   * computation. A new process is spun up for each waveform, making them easy
   * to cancel.
   * 
   * Add ?debug to the URL to have the Electron main process pop up the renderer
   * window that is responsible for computing the waveform. Otherwise,
   * computation happens invisibly in the background.
   */
  server.get(`${base}/:id/waveform`, async (request, response) => {
    // TODO this will need to happen elsewhere in Docker. maybe a new thread? idk.
    const electron = require('electron')
    if (!electron) {
      response.status(400)
      return apiResponse('Waveforms currently require Electron')
    }
    
    if (!('id' in request.params)) {
      response.status(400)
      return apiResponse('Request is missing the ID.')
    }

    const trackId = parseInt(request.params.id)
    const trackObj = await trackCrud.getTrack(db, trackId)
    const fileRow = await db.getFile(trackObj.track_file_id)

    // waveforms are computed in a Chrome renderer, which doesn't support m4a.
    if (fileRow.file_extension === 'm4a') {
      response.status(500)
      return apiResponse('Waveforms for .m4a files not supported')
    }

    const path = fileRow.file_path
    const numSamples = 'samples' in request.query ? request.query.samples : 2000

    if (numSamples > 50000) {
      response.status(503)
      return apiResponse('Server refused to create waveform with >50000 samples')
    }

    // if we get a waveform request while a waveform is already being computed,
    // abort the old one by killing the process. if we don't abort, it only
    // takes about 4-5 simultanious waveforms to start locking up the server on
    // my 2019 macbook pro. I believe this has more to do with file read wait
    // times (network drive) than Node.js performance.
    if (waveformCreatorWindow !== null) {
      console.log('New waveform request came in while processing waveform - aborting old waveform')
      waveformCreatorWindow.close()
      waveformCreatorWindow = null
    }

    // each process waveform process gets an autoincrementing ID
    waveformIncrementor++
    
    // TODO refactor this into a new package once there's a plan for Docker support
    let waveformRawData = await new Promise(async (resolve, reject) => {
      // maybe use cached waveform
      let cachedWaveform = await db.getCache(`waveform-${path}-${numSamples}`)

      if (cachedWaveform) {
        console.log('Using cached waveform')
        return resolve(cachedWaveform)
      }

      // this boolean is set to true in the "waveform-created-{id}" IPC handler,
      // *before* the renderer window is closed. when the renderer window is
      // closed, it checks this to see if it was closed normally after a
      // successful waveform, or if it was closed forcefully by the abort code.
      let waveformCompleted = false
      let rendererDebug = 'debug' in request.query

      // spin up a new process
      waveformCreatorWindow = await invisibleWindowFactory.create('WaveformCreator', rendererDebug)
      
      // when the process is closed, either normally after a waveform, or by the
      // abort code
      waveformCreatorWindow.on('closed', () => {
        // was closed normally, no need to do anything
        if (waveformCompleted) return

        // resolve the waveform process with the string 'aborted', instead of
        // waveform data
        console.log('Waveform was automatically aborted because new waveform request came in')
        return resolve('aborted')
      })

      // create a one-time listener for this request ID
      electron.ipcMain.once(`waveform-created-${waveformIncrementor}`, async (event, createdWaveformObj) => {
        // cache the waveform data if it doesn't exist
        await db.saveCache(`waveform-${createdWaveformObj.path}-${numSamples}`, createdWaveformObj.waveform)
        
        // destroy the process
        waveformCompleted = true
        waveformCreatorWindow.destroy()
        waveformCreatorWindow = null

        console.log('Waveform created and cached')

        // resolve the waveform data
        return resolve(createdWaveformObj.waveform)
      })

      console.log('Sending file to waveform process:', waveformIncrementor, path)

      // tell the dedicated process to create the waveform. the results will
      // come up into the callback above
      waveformCreatorWindow.webContents.send('create-waveform-from-path', {
        'requestId': waveformIncrementor,
        'path': path,
        'samples': numSamples
      })
    })

    if (waveformRawData === 'aborted') {
      response.status(503)
      return apiResponse('Server aborted waveform computation for higher priority waveform')
    }

    return apiResponse(waveformRawData)
  })
}