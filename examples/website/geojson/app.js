import React, {Component} from 'react';
import {render} from 'react-dom';
import DeckGL, {GeoJsonLayer} from 'deck.gl';
import {scaleThreshold} from 'd3-scale';

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line

// Source data GeoJSON
const SF_DATA_URL =
  'https://raw.githubusercontent.com/enjalot/bart/master/data/bayarea-zips.geo.json'; // eslint-disable-line

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
        stroked: false,
        filled: true,
        extruded: true,
        wireframe: true,
        fp64: true,
        getFillColor: [0, 100, 0],
        getLineColor: [0, 0, 255],
          getLineWidth: 1.0,
        pickable: true,
        onHover: this._onHover
      }),
        new GeoJsonLayer({
            id: 'geojson-seattle',
            data: 'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/seattle.geojson',
            opacity: 0.9,
            stroked: false,
            filled: true,
            extruded: true,
            wireframe: true,
            fp64: true,
            getFillColor: [100, 100, 0],
            getLineColor: [0, 0, 255],
            getLineWidth: 1.0,
            pickable: true,
            onHover: this._onHover
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
