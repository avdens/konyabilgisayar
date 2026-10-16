const Module = require('module');
const path = require('path');

// Ensure all node_modules directories are in search paths for nested modules
const origNodeModulePaths = Module._nodeModulePaths;
Module._nodeModulePaths = function(from) {
  const paths = origNodeModulePaths.call(this, from);
  const extra = [
    path.resolve(__dirname, '../node_modules'),
    path.resolve(__dirname, '../../node_modules'),
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, '../client/node_modules'),
    path.resolve('/var/task/client/node_modules'),
    path.resolve('/var/task/node_modules')
  ];
  for (const p of extra) {
    if (!paths.includes(p)) {
      paths.push(p);
    }
  }
  return paths;
};

// Explicit static require references to ensure Vercel NFT bundles them
try { require('express'); } catch (e) {}
try { require('cors'); } catch (e) {}
try { require('pg'); } catch (e) {}
try { require('jsonwebtoken'); } catch (e) {}
try { require('bcryptjs'); } catch (e) {}
try { require('xlsx'); } catch (e) {}
try { require('multer'); } catch (e) {}

let app;
let initError = null;

try {
  app = require('../server/server');
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
