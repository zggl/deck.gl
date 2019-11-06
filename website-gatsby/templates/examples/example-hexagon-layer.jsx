import React, {Component} from 'react';
import InfoPanel from '../../src/components/info-panel'
import {DATA_URI, MAPBOX_STYLES, GITHUB_TREE} from '../../src/constants/defaults'
import App from '../../../examples/website/3d-heatmap/app'
import {csv} from 'd3-request';

export default class HexagonDemo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      hoveredObject: null,
      radius: 2000,
      coverage: 0.7,
      upperPercentile: 100
    };

    this.handleChange = this.handleChange.bind(this);
  }

  componentDidMount() {
    csv(`${DATA_URI}/examples/3d-heatmap/heatmap-data.csv`, (error, response) => {
      if (!error) {
        const data = response.map(d => [Number(d.lng), Number(d.lat)]);
        this.setState({data: data})
      }
    });
  }

  handleChange(event) {
    switch (event.target.name) {
      case 'radius':
        this.setState({radius: parseFloat(event.target.value)});
      break;
      case 'coverage':
        this.setState({coverage: parseFloat(event.target.value)});
      break;
      case 'upper-percentile':
        this.setState({upperPercentile: parseFloat(event.target.value)});
      break;
    }
  }

  _onHover({x, y, object}) {
    this.setState({x, y, hoveredObject: object});
  }

  _renderTooltip() {
    const {x, y, hoveredObject} = this.state;

    if (!hoveredObject) {
      return null;
    }

    const lat = hoveredObject.position[1];
    const lng = hoveredObject.position[0];
    const count = hoveredObject.points.length;

    return (
      <div className="tooltip" style={{left: x, top: y}}>
        <div>{`latitude: ${Number.isFinite(lat) ? lat.toFixed(6) : ''}`}</div>
        <div>{`longitude: ${Number.isFinite(lng) ? lng.toFixed(6) : ''}`}</div>
        <div>{`${count} Accidents`}</div>
      </div>
    );
  }

  render() {
    const colorRamp = App.defaultColorRange.slice().map(color => `rgb(${color.join(',')})`);
    const {radius, coverage, upperPercentile} = this.state;

    return (
      <div>
        {this._renderTooltip()}
        <App
          mapStyle={MAPBOX_STYLES.DARK}
          data={this.state.data}
          radius={radius}
          coverage={coverage}
          upperPercentile={upperPercentile}
          onHover={this._onHover.bind(this)}
        />
        <InfoPanel sourceLink={`${GITHUB_TREE}/${this.props.path}`}>
          <h3>United Kingdom Road Safety</h3>
          <p>Personal injury road accidents in GB from 1979</p>
          <p>The layer aggregates data within the boundary of each hexagon cell</p>

          <div className="layout">
            {colorRamp.map((c, i) => (
              <div
                key={i}
                className="legend"
                style={{background: c, width: `${100 / colorRamp.length}%`}}
              />
            ))}
          </div>
          <p className="layout">
            <span className="col-1-2">Fewer Accidents</span>
            <span className="col-1-2 text-right">More Accidents</span>
          </p>

          <p>
            Data source: <a href="https://data.gov.uk">DATA.GOV.UK</a>
          </p>

          <div className="layout">
            <div className="stat col-1-2">
              Accidents
              <b>{0}</b>
            </div>
          </div>
          <hr />
          <div className="input">
            <label>Radius</label>
            <input name="radius" type="range" step="100" min="500" max="20000" value={this.state.radius} onChange={this.handleChange} />
            <br />
            <label>Coverage</label>
            <input name="coverage" type="range" step="0.1" min="0" max="1" value={this.state.coverage} onChange={this.handleChange} />
            <br />
            <label>Upper Percentile</label>
            <input name="upper-percentile" type="range" step="0.1" min="80" max="100" value={this.state.upperPercentile} onChange={this.handleChange} />
          </div>
        </InfoPanel>
      </div>
    );
  }
}
