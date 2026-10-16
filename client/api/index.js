const Module = require('module');
const path = require('path');

const candidates = [
  path.resolve(__dirname, '../node_modules'),
  path.resolve(__dirname, '../../node_modules'),
  path.resolve(__dirname, 'node_modules'),
  path.resolve('/var/task/client/node_modules'),
  path.resolve('/var/task/node_modules')
];
for (const p of candidates) {
  if (!Module.globalPaths.includes(p)) {
    Module.globalPaths.push(p);
  }
}
if (typeof Module._initPaths === 'function') {
  Module._initPaths();
}

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

