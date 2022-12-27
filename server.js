const express = require('express');
const url = require('url');

const pysakitRouter = require('./stops-qrcode-redirect');

const app = express();

app.get('/', (req, res) => {
  res.redirect(301, 'https://reittiopas.fi/');
});

app.use('/pysakit', pysakitRouter);

// Here's the list of all frontend services where we want to add trailing slash
// Includes also query params
app.get(/^\/(kuljettaja|julkaisin|kartta|linjakartta|jore-import)$/, (req, res) => {
  const { query } = url.parse(req.url);
  res.redirect(`${req.path}/${query ? `?${query}` : ''}`);
});

app.get('/health', (req, res) => {
  res.send('OK');
});

app.listen(4000, () => {
  console.log('Listening at 4000'); // eslint-disable-line no-console
});
