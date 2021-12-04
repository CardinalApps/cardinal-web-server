const path = require('path')
const { webServer } = require('../')
const { DatabaseService } = require('cardinal-database')
const i18n = require('cardinal-i18n')

// init db service instance
const db = new DatabaseService({
  'systemDir': __dirname + '/output',
  'appDir': 'DatabaseService',
  'databaseFileName': 'DbService.sqlite.db',
  'imageCacheDirName': 'testImageCache',
  'tables': 'server',
  'tablePrefix': 'server_',
})

async function test() {
  const publicDir = path.join(path.dirname(__filename).replace('/test', ''), 'public')

  await db.connect()
  await db.build()
  await db.verify()

  webServer.create('test-server', 'localhost', 3080)

  webServer.registerPrimaryRoutes('test-server', db, publicDir)
  i18n.httpRoutes.register(webServer.getServer('test-server').http.server)

  webServer.listen('test-server')
}

test()
