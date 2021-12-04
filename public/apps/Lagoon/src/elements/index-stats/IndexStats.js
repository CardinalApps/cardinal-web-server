import Lowrider from '../../../node_modules/lowrider.js/index.js'
import __ from '../../../node_modules/double-u/index.js'
import { html } from '../../../node_modules/html.js/index.js'

export class IndexStats extends Lowrider {
  /**
   * Spawn
   */
  onSpawn() {
    
  }

  /**
   * Build
   */
  async onBuild() {
    this.innerHTML = await html('/elements/index-stats/index-stats.html')
  }

  /**
   * Loaded
   */
  async onLoad() {
    this.refresh()

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
   * Get the latest counts from the server and refresh the numbers in the UI.
   */
  async refresh() {
    let latestStats = await Bridge.httpApi('/indexing-service/stats')
    
    this.props.numMusicFiles = latestStats.response.music
    this.props.numPhotoFiles = latestStats.response.photos
    this.props.numCinemaFiles = latestStats.response.cinema
    this.props.numBookFiles = latestStats.response.books
  }

  /**
   * When the IndexingService announced that something was indexed, increment
   * the number here.
   * 
   * TODO decrementing when deleting
   */
  onIndexingServiceAnnouncement(message) {
    if (message.action === 'fileImported') {
      let numEl = __(this).find(`[data-type="${message.type}"] .num`).el()
      let num = parseInt(numEl.innerHTML) + 1
      
      numEl.innerHTML = num
    }
  }
}