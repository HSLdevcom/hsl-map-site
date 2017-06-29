const fs = require("fs");
const path = require("path");
const express = require("express");
const Handlebars = require("handlebars");
const fetch = require("node-fetch");
const moment = require("moment");

const template = Handlebars.compile(fs.readFileSync("index.hbs", "utf8"));

function readAsDataURL(filename) {
    const base64 = fs.readFileSync(path.join(__dirname, "icons", filename), "base64");
    return `data:image/svg+xml;base64,${base64}`;
}

const tramIcon = readAsDataURL("tram.svg");
const railIcon = readAsDataURL("rail.svg");
const subwayIcon = readAsDataURL("subway.svg");
const ferryIcon = readAsDataURL("ferry.svg");
const busIcon = readAsDataURL("bus.svg");

function getIcon(stopId) {
    switch (stopId.slice(4, 5)) {
        case "4":
            return tramIcon;
        case "5":
            return railIcon;
        case "6":
            return subwayIcon;
        case "7":
            return ferryIcon;
        default:
            return busIcon;
    }
}

function getURL(stopId) {
    return `https://www.reittiopas.fi/pysakit/HSL:${stopId}`;
}

const app = express();

app.get("/:shortId", (req, res) => {
    const shortId = `${req.params.shortId.substr(0, 1)} ${req.params.shortId.substr(1)}`;
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
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "accept": "application/json"
        },
        body: JSON.stringify({ query }),
    };

    fetch("http://kartat.hsl.fi/jore/graphql", options)
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
                default:
                    const stops = stopIds.map(stopId => ({
                        stopId,
                        src: getIcon(stopId),
                        url: getURL(stopId),
                    }));
                    res.send(template({ stops }));
            }
        })
        .catch((error) => {
            console.error(error); // eslint-disable-line no-console
            res.redirect(302, "https://reittiopas.fi/");
        });
});

app.listen(4000, () => {
    console.log("Listening at 4000");
});

