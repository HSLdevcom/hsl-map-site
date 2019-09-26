const fs = require('fs');
const path = require('path');
const express = require('express');
const locale = require('locale');
const Handlebars = require('handlebars');
const fetch = require('node-fetch');
const moment = require('moment');
const uuidv1 = require('uuid/v1');
const capitalize = require('lodash/capitalize');
const { stringify } = require('query-string');

const template = Handlebars.compile(fs.readFileSync('index.hbs', 'utf8'));

function readAsDataURL(filename) {
  const base64 = fs.readFileSync(path.join(__dirname, 'icons', filename), 'base64');
  return `data:image/svg+xml;base64,${base64}`;
}

const tramIcon = readAsDataURL('tram.svg');
const railIcon = readAsDataURL('rail.svg');
const subwayIcon = readAsDataURL('subway.svg');
const ferryIcon = readAsDataURL('ferry.svg');
const busIcon = readAsDataURL('bus.svg');

const texts = {
  title: {
    fi: 'Valitse kulkuneuvo',
    sv: 'Välj färdmedel',
    en: 'Select mode of transport',
  },
  tram: {
    fi: 'Raitiovaunu',
    sv: 'Spårvagn',
    en: 'Tram',
  },
  rail: {
    fi: 'Juna',
    sv: 'Tåg',
    en: 'Rail',
  },
  subway: {
    fi: 'Metro',
    sv: 'Metro',
    en: 'Subway',
  },
  ferry: {
    fi: 'Lautta',
    sv: 'Färj',
    en: 'Ferry',
  },
  bus: {
    fi: 'Bussi',
    sv: 'Buss',
    en: 'Bus',
  },
};

function getIcon(stopId) {
  switch (stopId.slice(4, 5)) {
    case '4':
      return tramIcon;
    case '5':
      return railIcon;
    case '6':
      return subwayIcon;
    case '7':
      return ferryIcon;
    default:
      return busIcon;
  }
}

function getMode(stopId, lang) {
  switch (stopId.slice(4, 5)) {
    case '4':
      return texts.tram[lang];
    case '5':
      return texts.rail[lang];
    case '6':
      return texts.subway[lang];
    case '7':
      return texts.ferry[lang];
    default:
      return texts.bus[lang];
  }
}

function getURL(stopId) {
  return `https://www.reittiopas.fi/pysakit/HSL:${stopId}`;
}

const app = express();

app.use(locale(['fi', 'sv', 'en']));

app.use((req, res, next) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  const directory = req.get('x-forwarded-path') || req.path;

  const params = {
    _id: uuidv1().replace(/-/g, '').substring(0, 16),
    idsite: '22',
    rec: 1,
    url: `${protocol}://${host}${directory}`,
    ua: req.get('User-Agent'),
  };

  fetch(`https://piwik.digitransit.fi/piwik.php?${stringify(params)}`)
    .catch(error => console.error(error)); // eslint-disable-line no-console

  next();
});

app.get('/', (req, res) => {
  res.redirect(301, 'https://reittiopas.fi/');
});

app.get('/:shortId', (req, res) => {
  const shortId = capitalize(req.params.shortId.replace(/^([a-zA-Z])([0-9]+)$/, '$1 $2'));

  const query = `
    query AllStops {
        allStops(condition: {shortId: "${shortId}"}) {
            nodes {
                stopId
                routeSegments: routeSegmentsForDate(date: "${moment().format('YYYY-MM-DD')}") {
                    totalCount
                }
            }
        }
    }`;

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ query }),
  };

  fetch('https://kartat.hsl.fi/jore/graphql', options)
    .then(response => response.json())
    .then((response) => {
      if (response.errors) {
        throw new Error(JSON.stringify(response.errors));
      }
      const stopIds = response.data.allStops.nodes
        .filter(({ routeSegments }) => routeSegments.totalCount > 0)
        .map(({ stopId }) => stopId);

      switch (stopIds.length) {
        case 0:
          throw new Error(`No ids found for ${shortId}`);
        case 1:
          res.redirect(301, getURL(stopIds[0]));
          return;
        default: // eslint-disable-line no-case-declarations
          const stops = stopIds.map(stopId => ({
            mode: getMode(stopId, req.locale),
            src: getIcon(stopId),
            url: getURL(stopId),
          }));
          res.send(template({
            title: texts.title[req.locale],
            stops,
          }));
      }
    })
    .catch((error) => {
      console.error(error); // eslint-disable-line no-console
      res.redirect(302, 'https://reittiopas.fi/');
    });
});

app.listen(4000, () => {
  console.log('Listening at 4000'); // eslint-disable-line no-console
});
