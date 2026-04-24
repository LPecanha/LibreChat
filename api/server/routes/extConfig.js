const { Router } = require('express');

const router = Router();

router.get('/', (req, res) => {
  const url = process.env.EXT_URL ?? '';
  const lang = process.env.DEFAULT_LANG ?? 'pt-BR'; // [EXT]
  res.type('application/javascript');
  res.set('Cache-Control', 'no-cache');
  res.send(
    `window.__EXT_URL__ = ${JSON.stringify(url)};` +
    `\nif (!localStorage.getItem('i18nextLng')) { localStorage.setItem('i18nextLng', ${JSON.stringify(lang)}); }`, // [EXT]
  );
});

module.exports = router;
