import React, {Component} from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import {IconLayer, BitmapLayer} from '@deck.gl/layers';
import {MapView, OrthographicView, COORDINATE_SYSTEM} from '@deck.gl/core';

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line

// Source data CSV
const DATA_URL =
  'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/website/sf-bike-parking.json'; // eslint-disable-line

const INITIAL_VIEW_STATE = {
  main: {
    width: window.innerWidth,
    height: window.innerHeight,
    longitude: -122.3,
    latitude: 37.7,
    zoom: 12,
    maxZoom: 20,
    pitch: 0,
    bearing: 0
  },
  texture: {
    x: 0, y: 0, width: 1024, height: 256
  }
};

const VIEWS = [
  new MapView({id: 'main', controller: true}),
  new OrthographicView({id: 'texture', clear: true, x: 0, y: 0})
];

function layerFilter({layer, viewport}) {
  if (viewport.id === 'texture' && layer.id === 'texture') {
    return true;
  }
  if (viewport.id === 'main' && layer.id === 'icon') {
    return true;
  }
  return false;
}

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      height: null,
      viewState: INITIAL_VIEW_STATE
    };

    this._onViewStateChange = this._onViewStateChange.bind(this);
  }

  _renderLayers() {
    const zoomVal = Math.ceil(this.state.viewState.main.zoom);

    const iconLayer = new IconLayer({
      data: DATA_URL,
      id: 'icon',
      sizeScale: 24,
      coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      getPosition: d => d.COORDINATES,
      getColor: d => [64, 64, 72],
      updateTriggers: {
        getIcon: zoomVal
      },
      getIcon: d => {
        if (zoomVal % 3 === 0) {
          if (d.RACKS === 1) {
            return {
              url:
                'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/images/layers/demo-thumb-choropleth.jpg',
              width: 300,
              height: 300,
              anchorY: 300,
              mask: false
            };
          }

          if (d.RACKS === 2) {
            return {
              url:
                'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/images/layers/demo-thumb-geojson.jpg',
              width: 800,
              height: 800,
              anchorY: 800,
              mask: false
            };
          }
          return {
            url:
              'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/images/layers/demo-thumb-trip.jpg',
            width: 300,
            height: 300,
            anchorY: 300,
            mask: false
          };
        }
        if (d.RACKS === 1) {
          return {
            url:
              'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/images/layers/demo-thumb-wind.jpg',
            width: 200,
            height: 200,
            anchorY: 200,
            mask: false
          };
        }

        if (d.RACKS === 2) {
          return {
            url:
              'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/images/layers/demo-thumb-screengrid.jpg',
            width: 800,
            height: 800,
            anchorY: 800,
            mask: false
          };
        }

        return {
          url:
            'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/images/layers/demo-thumb-scatterplot.jpg',
          width: 150,
          height: 150,
          anchorY: 150,
          mask: false
        };
      },
      getSize: d => {
        return d.RACKS > 2 ? 2 : 1;
      },
      opacity: 0.8,
      pickable: true
    });

    const bitmapLayer = this.state.bitmapLayer;
    return [iconLayer, bitmapLayer];
  }

  _onViewStateChange({viewState}) {
    this.setState({
      viewState: {...INITIAL_VIEW_STATE, main: viewState}
    });
  }

  render() {
    const {mapStyle = 'mapbox://styles/mapbox/light-v9'} = this.props;
    const {viewState} = this.state;

    const layers = this._renderLayers();
    return (
      <DeckGL
        views={VIEWS}
        viewState={viewState}
        layers={layers}
        layerFilter={layerFilter}
        onViewStateChange={this._onViewStateChange}
        onAfterRender={() => {
          const m = layers && layers[0].state.iconManager;
          const texture = m && m.getTexture();
          if (m && m.loaded && texture) {
            if (texture.height !== this.state.height) {
              const bounds = [-texture.width/2, -texture.height/2, texture.width/2, texture.height/2];
              console.log('height changed from', this.state.height, texture.height, bounds);

              this.setState({
                height: texture.height,
              });

              const bitmapLayer = new BitmapLayer({
                id: 'texture',
                image: texture,
                coordinateSystem: COORDINATE_SYSTEM.IDENTITY,
                bounds
              });

              this.setState({bitmapLayer});
            }
          }
        }}
      >

        <MapView id="main">
          <StaticMap
            reuseMaps
            mapStyle={mapStyle}
            preventStyleDiffing={true}
            mapboxApiAccessToken={MAPBOX_TOKEN}
          />
        </MapView>
        <OrthographicView id="texture">
        </OrthographicView>
      </DeckGL>
    );
  }
}

export function renderToDOM(container) {
  render(<App />, container);
}
