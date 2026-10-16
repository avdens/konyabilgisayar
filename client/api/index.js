let app;
let initError = null;

try {
  app = require('../../server/server');
} catch (e) {
  initError = e;
  console.error('[API Init Error]', e);
}

module.exports = (req, res) => {
  if (initError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: false,
      error: 'INIT_ERROR',
      message: initError.message,
      stack: initError.stack
    }));
  }
  return app(req, res);
};

