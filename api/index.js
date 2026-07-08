const app = require('../server/server');

module.exports = (req, res) => {
  // Vercel strips the matched rewrite prefix from the path.
  // Our rewrite sends /api/* -> /api/*, so the path already includes /api.
  return app(req, res);
};
