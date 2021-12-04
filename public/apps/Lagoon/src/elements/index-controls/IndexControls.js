import Lowrider from '../../../node_modules/lowrider.js/index.js'
import __ from '../../../node_modules/double-u/index.js'
import i18n from '../../../node_modules/i18n.js/index.js'
import { html } from '../../../node_modules/html.js/index.js'
import Query from '../../../node_modules/sqleary.js/index.js'
import * as forms from '../../../node_modules/cardinal-forms/index.js'

export class IndexControls extends Lowrider {
  /**
   * Spawn
   */
  async onSpawn() {
    
  }

  /**
   * Build
   */
  async onBuild() {
    this.innerHTML = await html('/elements/index-controls/index-controls.html')
  }

  /**
   * Loaded
   */
  async onLoad() {
    this.bigButtonEl = this.querySelector('.big-button')
    this.stateEl = this.querySelector('.state')
    this.progressBar = __(this).find('.progress .fill')

    await this.syncWithLastKnownState()

    this.registerEventHandlers()
    forms.prepare(this.querySelector('#indexing-options'))

    // register the IPC listener that reacts to indexing updates
    this.indexingServiceReplyChannel = 'IndexingService:Announcements'
    this.boundIndexingServiceListener = this.onIndexingServiceAnnouncement.bind(this)
    Bridge.ipcListen(this.indexingServiceReplyChannel, this.boundIndexingServiceListener)
  }

  /**
   * Removed
   */
  onRemoved() {
    Bridge.removeIpcListener(this.indexingServiceReplyChannel, this.boundIndexingServiceListener)
  }

  /**
   * Registers event handlers for this instance
   */
  registerEventHandlers() {
    // on click of the big button
    this.bigButtonEl.addEventListener('click', (event) => {
      switch(this.getStatus()) {
        // clicking the button while inactive will start the service
        case 'inactive':
          this.startIndexing()
          break

        // clicking the button while in these states cannot pause the operation
        case 'starting':
        case 'scanning':
        case 'syncing':
          if (!__(this.bigButtonEl).hasClass('glow-red')) {
            __(this.bigButtonEl).addClass('glow-red')
            setTimeout(() => {
              __(this.bigButtonEl).removeClass('glow-red')
            }, 1000)
          }
          break

        // clicking the button while importing
        case 'importing':
          this.pauseIndexing()
          break

        // clicking the button while paused
        case 'paused':
          this.resumeIndexing()
          break

        // start a new indexing run
        case 'summary':
          this.setStatus('inactive')
          this.startIndexing()
          break
      }
    })
  }

  /**
   * Fetches the last known indexing state from the main process and sync the UI
   * with it. This is only needed once on load, in case the user closed the UI
   * while the indexing service was paused and/or finished while the UI was closed.
   */
  async syncWithLastKnownState() {
    let state = await Bridge.ipcAsk('IndexingService:GetState')
    console.log('lastKnownState', state)

    if (state.paused) {
      this.setStatus('paused')
    }

    if (state.lastIndexingServiceAnnouncement) {
      this.onIndexingServiceAnnouncement(state.lastIndexingServiceAnnouncement)
    }
  }

  /**
   * Returns the status that's saved in the attribute.
   */
  getStatus() {
    return __(this).attr('status')
  }

  /**
   * Sets the indicators of the server status. Does not change the actual server
   * status.
   * 
   * @param {string} status - inactive | indexing
   */
  setStatus(status) {
    __(this).attr('status', status)
    __(this).find(`.state .single-state`).removeClass('show')
    __(this).find(`.state .single-state.${status}`).addClass('show')

    switch (status) {
      // these statuses have a wide layout
      case 'starting':
      case 'scanning':
      case 'syncing':
      case 'importing':
      case 'summary':
      case 'paused':
        __(this).addClass('wide')
        break

      default:
        __(this).removeClass('wide')
        break
    }
  }

  /**
   * If the user has indexed files at once point, then removes ALL of their
   * directories, then starts an indexing run, the natural behavior will be that
   * the indexing service deindexes everything. This will check for that
   * scenario and ask for confirmation.
   * 
   * @returns {boolean} - Returns true if the user confirmed, OR there was
   * nothing to confirm. Aka, the indexing may proceed. Returns false if the
   * user was prompted and declined.
   * 
   * TODO as more media types are added (photos, books, etc), we should check
   * for at least one of those media types too
   */
  async maybeConfirmDangerousIndexingOperation() {
    let dirsApi = await Bridge.httpApi('/directories')

    // the user has directories, no need to confirm anything. (the indexing
    // service may still delete things, but it won't just delete everything)
    if (dirsApi.response.length) return true

    // look for a track
    let anyTracksQuery = await new Query({
      'table': 'music_tracks',
      'itemsPerPage': 1
    })

    // there is at least 1 track, ask for confirmation
    if (anyTracksQuery.results.length) {
      return confirm(i18n('server.index-directories.no-dirs-warning'))
    }

    return true
  }

  /**
   * Tells the server to start the indexing. Must not already be indexing.
   */
  async startIndexing() {
    if (this.getStatus() !== 'inactive') {
      console.warn('Cannot start indexing while already indexing')
      return
    }

    if (!await this.maybeConfirmDangerousIndexingOperation()) {
      return
    }

    this.setStatus('starting')

    console.log('starting indexing')

    // tell the IndexingService to start indexing. once it's started, it will
    // pipe messages through the `IndexingService:Announcement` ws channel
    let confirmed = await Bridge.ipcAsk('IndexingService:Begin', {
      'mode': __(this).find('.option [name="mode"]').value() || 'quick'
    })

    // ipcMain must return true to let us know the window has been launched and
    // is now running the IndexingService. all further IndexingService output will
    // come through another channel
    if (!confirmed) {
      this.handleInternalError('Something went wrong when starting the IndexingService.')
    }

    return confirmed
  }

  /**
   * Tells the server to pause the indexing. Must currently be indexing.
   */
  async pauseIndexing() {
    if (this.getStatus() !== 'importing') {
      console.warn('Cannot pause the indexer unless it is importing')
      return
    }

    let paused = await Bridge.ipcAsk('IndexingService:Pause')

    if (paused) {
      this.setStatus('paused')
      console.log('Pausing importing')
    }
  }

  /**
   * Tells the server to pause the indexing. Must currently be indexing.
   */
  async resumeIndexing() {
    if (this.getStatus() !== 'paused') {
      console.warn('Cannot resume the indexer unless it is paused')
      return
    }

    let resumed = await Bridge.ipcAsk('IndexingService:Resume')

    if (resumed) {
      this.setStatus('importing')
      console.log('Resuming importing')
    }
  }

  /**
   * Invoked when the indexing service in the main process does something.
   */
  onIndexingServiceAnnouncement(message) {
    console.log('IndexingService Announcement', message)

    // if the main process sent a props object, apply the values
    if (typeof message === 'object' && 'props' in message) {
      for (let [prop, val] of Object.entries(message.props)) {
        this.props[prop] = val
      }
    }

    switch (message.action) {
      case 'internalError':
        this.handleInternalError(message.data)
        break

      case 'setStatus':
        this.setStatus(message.data)
        break

      case 'scanFoundFile':
        this.setStatus('scanning')
        this.props.scannedFile = i18n('server.index-controls.scanned-count').replace('{{n}}', message.data)
        break

      case 'syncAddedFileToIndex':
        this.setStatus('syncing')
        __(this).find('.syncing').removeClass('removed').addClass('added')
        let addedFileName = message.data.split(/\\|\//gm).pop()
        this.props.addedFile = addedFileName
        break

      case 'syncDeletedFileFromIndex':
        this.setStatus('syncing')
        __(this).find('.syncing').removeClass('added').addClass('removed')
        let removedFileName = message.data.split(/\\|\//gm).pop()
        this.props.removedFile = removedFileName
        break

      case 'fileImported':
      case 'fileSkipped':
      case 'fileUpdated':
      case 'fileErrored':
        // when the user presses pause, the currently processing item will be
        // allowed to finish, then the pause will happen. this if-statement
        // prevents the last item from switching the UI back out of paused mode.
        if (this.getStatus() !== 'paused') {
          this.setStatus('importing')
        }

        this.updateProgressBar(message.percentage)
        break

      case 'summary':
        __(this.bigButtonEl).addClass('glow-off')
        this.setStatus('summary')
        this.props.numNew = message.data.new.length
        this.props.numUpdated = message.data.updated.length
        this.props.numSkipped = message.data.skipped.length
        this.props.numDeleted = message.data.deleted.length
        this.props.numErrored = message.data.errored.length
        __(this).find('.report-summary-path').attr('href', message.data.report)
        break
    }
  }

  /**
   * Updates the UI when an internal error happens in the IndexingService.
   */
  handleInternalError(message) {
    console.log(message)
    __(this).addClass('has-internal-error')
    this.props.internalErrorMessage = message
  }

  /**
   * Calculates the current import percentage and updates the progress bar.
   */
  updateProgressBar(percentage) {
    this.progressBar.css({
      'width': `${percentage}%`
    })
  }
}