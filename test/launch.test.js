const { webServer } = require('../')

// CONTINUE HERE: need to bring in db
webServer.create('test-server', 'localhost', 3080)
webServer.registerPrimaryRoutes('test-server', serverApp.db)
