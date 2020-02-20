import React, {Component} from 'react';
import {render} from 'react-dom';
import {StaticMap, _MapContext as MapContext} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import {Editor, EditorModes} from 'react-map-gl-draw';
import {getFeatureStyle, getEditHandleStyle} from './style';
import ControlPanel from './control-panel';

const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line

const INITIAL_VIEW_STATE = {
  longitude: -122.4,
  latitude: 38.78,
  zoom: 3,
  maxZoom: 15,
  pitch: 30,
  bearing: 30
};

export default class App extends Component {
  constructor(props) {
    super(props);
    this._editorRef = null;
    this.state = {
      mode: EditorModes.READ_ONLY,
      selectedFeatureIndex: null
    };
  }

  _onSelect(options) {
    this.setState({selectedFeatureIndex: options && options.selectedFeatureIndex});
  };

  _onDelete() {
    const selectedIndex = this.state.selectedFeatureIndex;
    if (selectedIndex !== null && selectedIndex >= 0) {
      this._editorRef.deleteFeatures(selectedIndex);
    }
  };

  _onUpdate({editType}) {
    if (editType === 'addFeature') {
      this.setState({
        mode: EditorModes.EDITING
      });
    }

    console.log(this._editorRef.getFeatures())
  };

  _renderDrawTools() {
    // copy from mapbox
    return (
      <div className="mapboxgl-ctrl-top-left">
        <div className="mapboxgl-ctrl-group mapboxgl-ctrl">
          <button
            className="mapbox-gl-draw_ctrl-draw-btn mapbox-gl-draw_polygon"
            title="Polygon tool (p)"
            onClick={() => this.setState({mode: EditorModes.DRAW_POLYGON})}
          />
          <button
            className="mapbox-gl-draw_ctrl-draw-btn mapbox-gl-draw_trash"
            title="Delete"
            onClick={this._onDelete}
          />
        </div>
      </div>
    );
  };

  render() {
    const {mapStyle = 'mapbox://styles/mapbox/light-v9'} = this.props;
    const {mode} = this.state;
    return (
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        ContextProvider={MapContext.Provider}
        >
        <StaticMap
          reuseMaps
          mapStyle={mapStyle}
          preventStyleDiffing={true}
          mapboxApiAccessToken={MAPBOX_TOKEN}
        >
        </StaticMap>
        <Editor
          key={'editor'}
          ref={_ => (this._editorRef = _)}
          clickRadius={12}
          mode={mode}
          onSelect={this._onSelect.bind(this)}
          onUpdate={this._onUpdate.bind(this)}
          editHandleShape={'circle'}
          featureStyle={getFeatureStyle}
          editHandleStyle={getEditHandleStyle}
        />
        {this._renderDrawTools()}
      </DeckGL>
    );
  }
}

export function renderToDOM(container) {
  render(<App/>, container);
}
