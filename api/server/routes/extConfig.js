const { Router } = require('express');

const router = Router();

router.get('/', (req, res) => {
  const url = process.env.EXT_URL ?? '';
  res.type('application/javascript');
  res.set('Cache-Control', 'no-cache');
  res.send(`window.__EXT_URL__ = ${JSON.stringify(url)};`);
});

module.exports = router;
