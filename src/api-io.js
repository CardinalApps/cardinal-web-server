const path = require('path')
/**
 * All API methods should use this. It doesn't do much now, but it can do a lot later.
 */
exports.apiResponse = function(data = null) {
  if (typeof data === 'object' && data !== null) {
    return JSON.stringify(data)
  }

  return data
}

/**
 * When artwork is pulled from the database, it contains file paths for the
 * location on the user's machine. These paths may contain sensitive user data.
 * Unneeded paths are deleted, and others are converted to URL's that map to the
 * static routes that make the images available.
 * 
 * @param {string} artworkObject - HTTP root of the static files.
 * @returns {string} Returns the HTTP static route to the file.
 */
exports.sanitizeArtwork = function(artworkObj, staticRoot = 'image-cache') {
  if (typeof artworkObj !== 'object' || artworkObj === null || !('image_original_location' in artworkObj)) {
    console.warn('sanitizeArtwork() did not get the right kind of object')
    return artworkObj
  }

  let { getServer } = require('./web-server.js')
  let serverInfo = getServer('primary')

  // remove the reference to the main file location
  delete artworkObj.image_original_location

  // change all thumbnail paths from local paths to HTTP static paths
  for (let [thumbSize, thumbObj] of Object.entries(artworkObj.thumbs)) {
    let fileName = path.parse(thumbObj.thumb_file).base
    thumbObj.thumb_file = `${serverInfo.http.scheme}${serverInfo.http.host}:${serverInfo.http.port}/${staticRoot}/${fileName}`
  }
  
  return artworkObj
}