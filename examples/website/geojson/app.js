import React, {Component} from 'react';
import {render} from 'react-dom';
import DeckGL, {GeoJsonLayer, ScatterplotLayer, TextLayer} from 'deck.gl';
import {scaleThreshold} from 'd3-scale';

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line

// Source data GeoJSON
const SF_DATA_URL =
  'https://raw.githubusercontent.com/enjalot/bart/master/data/bayarea-zips.geo.json'; // eslint-disable-line

const nodes = [
  {
    position: [-122.395452, 37.776608],
    name: `San Francisco Caltrain Station`
  },
  {
    position: [-122.399925, 37.790005],
    name: `555 Market Street`
  },
  {
    position: [-122.417877, 37.775471],
    name: `1455 Market Street`
  },
  {
    position: [-122.378952, 37.621311],
    name: `SFO`
  },
  {
    position: [-122.165332, 37.444029],
    name: `Palo Alto Caltrain Station`
  },
  {
    position: [-121.996881, 37.370598],
    name: `Sunnyvale Caltrain Station`
  },
  {
    position: [-121.927338, 37.361771],
    name: `SJC`
  },
  {
    position: [-122.333458, 47.604872],
    name: `Seattle Downtown`
  },
  {
    position: [-73.94639, 40.599756],
    name: `New York City Downtown`
  }
];

export const COLOR_SCALE = scaleThreshold()
  .domain([-0.6, -0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.05, 1.2])
  .range([
    [65, 182, 196],
    [127, 205, 187],
    [199, 233, 180],
    [237, 248, 177],
    // zero
    [255, 255, 204],
    [255, 237, 160],
    [254, 217, 118],
    [254, 178, 76],
    [253, 141, 60],
    [252, 78, 42],
    [227, 26, 28],
    [189, 0, 38],
    [128, 0, 38]
  ]);
// 37.772228, -122.438559
const INITIAL_VIEW_STATE = {
  'map-view-sf': {
    latitude: 37.621311,
    longitude: -122.378952,
    zoom: 11,
    maxZoom: 16,
    pitch: 0,
    bearing: 0
  },
  'map-view-seattle': {
    latitude: 47.604872,
    longitude: -122.333458,
    zoom: 11,
    maxZoom: 16,
    pitch: 0,
    bearing: 0
  },
  'map-view-ny': {
    latitude: 40.599756,
    longitude: -73.94639,
    zoom: 11,
    maxZoom: 16,
    pitch: 0,
    bearing: 0
  }
};

export class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hoveredObject: null
    };
    this._onHover = this._onHover.bind(this);
    this._renderTooltip = this._renderTooltip.bind(this);
  }

  _onHover({x, y, object}) {
    this.setState({x, y, hoveredObject: object});
  }

  _renderLayers() {
    return [
      new GeoJsonLayer({
        id: 'geojson-sf',
        data: SF_DATA_URL,
        opacity: 0.9,
        stroked: true,
        filled: true,
        extruded: false,
        wireframe: true,
        fp64: true,
        getFillColor: [248, 205, 70],
        getLineColor: [0, 0, 255],
        getLineWidth: 10.0,
        pickable: true,
        onHover: this._onHover
      }),
      new GeoJsonLayer({
        id: 'geojson-seattle',
        data:
          'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/seattle.geojson',
        opacity: 0.9,
        stroked: true,
        filled: true,
        extruded: false,
        wireframe: true,
        fp64: true,
        getFillColor: [150, 203, 250],
        getLineColor: [0, 0, 255],
        getLineWidth: 10.0,
        pickable: true,
        onHover: this._onHover
      }),
      new GeoJsonLayer({
        id: 'geojson-ny',
        data:
          'https://raw.githubusercontent.com/uber/deck.gl/hackathon-code-Jian/new-york-city-boroughs.geojson.json',
        opacity: 0.9,
        stroked: true,
        filled: true,
        extruded: false,
        wireframe: true,
        fp64: true,
        getFillColor: [194, 142, 248],
        getLineColor: [0, 0, 255],
        getLineWidth: 10.0,
        pickable: true,
        onHover: this._onHover
      }),
      new ScatterplotLayer({
        id: `scatterplot`,
        data: nodes,
        filled: true,
        radiusMinPixels: 10,
        radiusMaxPixels: 50,
        radiusScale: 5,
        getPosition: d => [d.position[0], d.position[1], 0],
        getFillColor: [100, 100, 0]
      }),
      new TextLayer({
        id: `text`,
        data: nodes,
        getSize: 12,
        getPosition: d => [d.position[0], d.position[1], 0],
        getText: d => d.name
      })
    ];
  }

  _renderTooltip() {
    const {x, y, hoveredObject} = this.state;
    return (
      hoveredObject && (
        <div className="tooltip" style={{top: y, left: x}}>
          <div>
            <b>Average Property Value</b>
          </div>
          <div>
            <div>${hoveredObject.properties.valuePerParcel} / parcel</div>
            <div>
              ${hoveredObject.properties.valuePerSqm} / m<sup>2</sup>
            </div>
          </div>
          <div>
            <b>Growth</b>
          </div>
          <div>{Math.round(hoveredObject.properties.growth * 100)}%</div>
        </div>
      )
    );
  }

  render() {
    return (
      <DeckGL
        layers={this._renderLayers()}
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
      />
    );
  }
}

export function renderToDOM(container) {
  render(<App />, container);
}
