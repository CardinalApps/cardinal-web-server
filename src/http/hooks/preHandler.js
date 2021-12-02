/**
 * Hook: "preHandler"
 * 
 * Parses JSON bodies.
 */
module.exports = (request, response, next) => {
  if (typeof request.body === 'string') {
    try {
      let parsed = JSON.parse(request.body)
      request.body = parsed
    } catch (e) {
      // body was not JSON, do nothing
    }
  }

  next()
}