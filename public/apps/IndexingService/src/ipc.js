const path = require('path')
const { ipcRenderer } = require('electron')
const { DatabaseService } = require('hydra-database')
const { IndexingService } = require('hydra-indexing-service')
const i18n = require('hydra-i18n')
const humanizeDuration = require('humanize-duration')
const { directoryCrud } = require('hydra-media-crud')

let service = null

/**
 * Listen for when the main process tells us to start the IndexingService.
 * 
 * @listens begin
 */
ipcRenderer.on('begin', async (event, beginData) => {
  console.log('BEGINDATA', beginData)
  begin(beginData.systemDir, beginData.DATABASE_NAME, beginData.IMAGE_CACHE_DIR, beginData.beginOpts)
})

/**
 * Listen for when the main process tells us to pause the IndexingService.
 * 
 * @listens pause
 */
ipcRenderer.on('pause', async (event) => {
  console.log('Main process asked for pause')
  pause()
})

/**
 * Listen for when the main process tells us to pause the IndexingService.
 * 
 * @listens resume
 */
ipcRenderer.on('resume', async (event) => {
  console.log('Main process asked for resume')
  resume()
})

/**
 * Listen for when the main process tells us to pause the IndexingService.
 * 
 * @listens resume
 */
ipcRenderer.on('isPaused', async (event) => {
  console.log('Main process asked for isPaused')
  return isPaused()
})

/**
 * Sends output to the main process and also writes it in an HTML element in the
 * invisible window for debugging purposes.
 * 
 * All of the output that reaches the main process will be forwarded to the
 * process that invoked the indexing service.
 */
function output(message) {
  console.log(message)
  //const outputEl = document.getElementById('output')

  // write message to the dom
  // if (typeof message === 'object') {
  //   outputEl.innerText = outputEl.innerText + JSON.parse(message) + '<br>'
  // } else {
  //   outputEl.innerText = outputEl.innerText + message + '<br>'
  // }

  // send message to main process
  ipcRenderer.send('IndexingService:OutputPipe', message)
}

function internalError(stack) {
  output({
    'action': 'internalError',
    'data': stack
  })
}

/**
 * Options is an object of IndexingService options
 */
async function begin(systemDir, dbName, imageCacheDir, options) {
  console.log('Beginning indexing in separate Electron BrowserWindow')
  console.log(systemDir, dbName, imageCacheDir)

  /**
   * Create a DatabaseService instance because we cannot use the one in the main
   * process.
   */
  const db = new DatabaseService({
    'systemDir': systemDir,
    'appDir': 'cardinalserver',
    'tables': 'server',
    'tablePrefix': 'server_',
    'databaseFileName': dbName,
    'imageCacheDirName': imageCacheDir
  })

  // connect to the database
  try {
    await db.connect()
    let dbVerification = await db.verify()

    if (!dbVerification) {
      internalError('IndexingService could not verify database.')
    }
  } catch (error) {
    internalError('IndexingService could not connect to database.')
    console.error(error)
    throw error
  }

  // get the directories from the database
  let rows = await directoryCrud.getAllDirectories(db)
  let dirs = rows.map(row => row.dir_path)

  /**
   * Create the service instance
   */
  service = new IndexingService({
    'db': db,
    'mode': options.mode || 'quick',
    'logging': true,
    'outputDir': path.join(db.appFilesPath, 'IndexingServiceCache'),
    'reportDir': path.join(db.appFilesPath, 'IndexingServiceReports'),
    'dirs': dirs,
    'callbacks': {
      'cantBegin': () => {
        internalError('IndexingService triggered cantBegin callback.')
      },
      'begun': () => {
        output({
          'action': 'setStatus',
          'data': 'scanning'
        })
      },
      'scanFoundFile': (service, filePath) => {
        output({
          'action': 'scanFoundFile',
          'data': service.masterList.length
        })
      },
      'scanDone': (service) => {
        output({
          'action': 'setStatus',
          'data': 'syncing'
        })
      },
      'beforeFileSync': (service, filePath) => {
        output({
          'action': 'beforeSync',
          'data': filePath
        })
      },
      'syncAddedFileToIndex': (service, filePath) => {
        output({
          'action': 'syncAddedFileToIndex',
          'data': filePath
        })
      },
      'syncDeletedFileFromIndex': (service, filePath) => {
        output({
          'action': 'syncDeletedFileFromIndex',
          'data': filePath
        })
      },
      'beforeImport': (service, obj) => {
        output({
          'action': 'beforeImport',
          'data': obj
        })
      },
      'beforeFileImport': (service, obj) => {
        output({
          'action': 'beforeFileImport',
          'data': obj
        })
      },
      'importLoopRunning': (service, filePath) => {
        output({
          'action': 'setStatus',
          'data': 'importing'
        })
      },
      'fileImported': (service, filePath) => {
        output({
          'action': 'fileImported',
          'data': filePath,
          'percentage': service.getPercentageCompleted(),
          'type': db.fileExtensionToMultimediaType(filePath.split('.').pop()),
          'props': {
            'fileName': filePath.split(/\\|\//gm).pop(),
            'timeRemaining': msToString(service.getTimeRemaining()),
            'processedLabel': i18n.string('server.index-controls.imported-file'),
            'currentCount': service.currentlyIndexingFileNum,
            'totalCount': service.masterList.length
          }
        })
      },
      'fileUpdated': (service, filePath) => {
        output({
          'action': 'fileUpdated',
          'data': filePath,
          'percentage': service.getPercentageCompleted(),
          'props': {
            'fileName': filePath.split(/\\|\//gm).pop(),
            'timeRemaining': msToString(service.getTimeRemaining()),
            'processedLabel': i18n.string('server.index-controls.updated-file'),
            'currentCount': service.currentlyIndexingFileNum,
            'totalCount': service.masterList.length
          }
        })
      },
      'fileSkipped': (service, filePath) => {
        output({
          'action': 'fileSkipped',
          'data': filePath,
          'percentage': service.getPercentageCompleted(),
          'props': {
            'fileName': filePath.split(/\\|\//gm).pop(),
            'timeRemaining': msToString(service.getTimeRemaining()),
            'processedLabel': i18n.string('server.index-controls.skipped-file'),
            'currentCount': service.currentlyIndexingFileNum,
            'totalCount': service.masterList.length
          }
        })
      },
      'fileErrored': (service, filePath) => {
        output({
          'action': 'fileErrored',
          'data': filePath,
          'percentage': service.getPercentageCompleted(),
          'props': {
            'fileName': filePath.split(/\\|\//gm).pop(),
            'timeRemaining': msToString(service.getTimeRemaining()),
            'processedLabel': i18n.string('server.index-controls.errored-file'),
            'currentCount': service.currentlyIndexingFileNum,
            'totalCount': service.masterList.length
          }
        })
      },
      'done': (service) => {
        output({
          'action': 'setStatus',
          'data': 'summary'
        })

        // send indexing summary
        output({
          'action': 'summary',
          'data': {
            'new': service.importedFiles,
            'updated': service.updatedFiles,
            'skipped': service.skippedFiles,
            'deleted': service.deletedFiles,
            'errored': service.erroredFiles,
            'report': service.reportFile
          }
        })

        // tell the main process to destroy this process
        output('CLOSEWINDOW')
      },
    }
  })

  try {
    service.begin()
  } catch (error) {
    internalError(error.stack)
  }
}

function pause() {
  service.pause()
}

function resume() {
  service.resume()
}

function isPaused() {
  ipcRenderer.send('isPaused-reply', service.paused)
}

/**
 * Convert ms to a human readable string.
 */
function msToString(ms) {
  if (ms < 10000) {
    return i18n.string('server.index-controls.importing-time-remaining-almost-done')
  } else if (ms < 60000) {
    let str = humanizeDuration(ms, {
      'units': ['s'],
      'round': true
    })
    return i18n.string('server.index-controls.importing-time-remaining').replace('{{time}}', str)
  } else {
    let str = humanizeDuration(ms, {
      'units': ['d', 'h', 'm'],
      'round': true,
      'largest': 1
    })
    return i18n.string('server.index-controls.importing-time-remaining').replace('{{time}}', str)
  }
}