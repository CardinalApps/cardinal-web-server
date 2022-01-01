/**
 * Hook: "onSend"
 * 
 * Adds the Cardinal headers to all API responses.
 */
module.exports = (request, response, payload, next) => {
  response.header('cardinal-server-application', 1)
  
  // TODO: Should this be kept?
  response.header('Access-Control-Allow-Origin', '*')

  next()
}