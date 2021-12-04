import Lowrider from '../../../node_modules/lowrider.js/index.js'
import __ from '../../../node_modules/double-u/index.js'
import { html } from '../../../node_modules/html.js/index.js'

export class IndexDirectories extends Lowrider {
  /**
   * Spawn
   */
  onSpawn() {
    
  }

  /**
   * Build
   */
  async onBuild() {
    this.innerHTML = await html('/elements/index-directories/index-directories.html')
  }

  /**
   * Loaded
   */
  async onLoad() {
    await this.showDirsInDb()
    this.enableDropArea(this.querySelector('.droparea'), this.dropAreaHandler.bind(this))
  }

  /**
   * Removed
   */
  onRemoved() {
    
  }

  /**
   * Checks if the path does not already exist in the database, and if not, adds
   * it to the database and the UI.
   */
  async addPath(path) {
    let existingResponse = await Bridge.httpApi(`/directory?path=${encodeURIComponent(path)}`, 'HEAD')
    
    //console.log('existingResponse', existingResponse)
    
    // if the resourse already exists, stop
    if (existingResponse.status !== 404) {
      return
    }

    let addedResponse = await Bridge.httpApi('/directory', 'POST', {
      'dir_path': path,
      'dir_multimedia_type': 'music' // TODO make this user configurable
    })

    //console.log('addedResponse', addedResponse)

    if (addedResponse.status === 201) {
      this.insertPathIntoDOM(addedResponse.response)
    }
  }

  /**
   * Removes a path from the database and the DOM. Called when the user clicks
   * on the delete button for a path.
   */
  async removePath(id) {
    let deleteResponse = await Bridge.httpApi(`/directory/${id}`, 'DELETE')

    if (deleteResponse.status !== 200) {
      console.error(deleteResponse.response)
      return
    }

    this.removePathFromDOM(id)
  }

  /**
   * Used internally to insert file paths into the DOM.
   * 
   * @paths {object} row - Database row.
   */
  async insertPathIntoDOM(row) {
    let template = __(this).getTemplate('.dir')

    template = await html(template, {
      'path': row.dir_path,
      'pathId': row.id
    })
    
    let inserted = __(this).find('.user-directories').appendHtml(template)

    // register the event handler for the removal button
    let removeEl = inserted.find('a.remove').el()
    removeEl.addEventListener('click', (el) => {
      let pathId = inserted.find('[data-file-path]').attr('data-path-id')
      this.removePath(pathId)
    })
  }

  /**
   * Used internally to remove paths from the DOM.
   */
  removePathFromDOM(id) {
     __(this).find(`[data-path-id="${id}"]`).closest('.user-directory').remove()
    
    if (!__(this).find('.user-directory').els.length) {
      __(this).find('.user-directories').removeClass('has-folders')
    }
  }

  /**
   * Handles the data that the user drops onto the drop area.
   */
  async dropAreaHandler(event, items) {
    let droppedDirs = []

    for (let i=0; i<items.length; i++) {
      // dropped folders will have no type, while files have a mime type;
      // we only want folders
      if (items[i].type === '') {
        droppedDirs.push(items[i].path)
      }
    }

    // what the user dropped did not contain at least one directory
    if (!droppedDirs.length) return

    for (let dir of droppedDirs) {
      this.addPath(dir)
    }

    __(this).find('.user-directories').addClass('has-folders')
  }

  /**
   * Updates the UI with what's in the database.
   */
  async showDirsInDb() {
    let response = await Bridge.httpApi('/directories')

    if (response.statusRange !== 2) {
      __(this).find('.error-message[data-error="load-error"]').show()
      return
    }

    let dirs = response.response

    if (!dirs.length) {
      return
    }

    __(this).find('.user-directory').remove()

    for (let dir of dirs) {
      this.insertPathIntoDOM(dir)
    }

    __(this).find('.user-directories').addClass('has-folders')
  }

  /**
   * Updates the database with what's in the UI.
   */
  // async syncDirsUpstream() {
  //   let dirs = {}

  //   __(this).find('[data-file-path]').each((el) => {
  //     let path = __(el).attr('href')
  //     dirs[path] = 'music' // TODO make this user configurable
  //   })

  //   let response = await Bridge.httpApi('/directory', 'POST', dirs)

  //   console.log(response)
  // }
}