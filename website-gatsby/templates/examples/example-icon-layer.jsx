import React, {Component} from 'react';
import InfoPanel from '../../src/components/info-panel'
import {DATA_URI, MAPBOX_STYLES, GITHUB_TREE} from '../../src/constants/defaults'
import App from '../../../examples/website/icon/app'

export default class IconDemo extends Component {
  constructor(props) {
    super(props);
    this.state = {cluster: true};

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    this.setState({cluster: event.target.checked});
  }

  render() {
    return (
      <div>
        <App
          mapStyle={MAPBOX_STYLES.DARK}
          iconAtlas={`${DATA_URI}/examples/icon/location-icon-atlas.png`}
          iconMapping={`${DATA_URI}/examples/icon/location-icon-mapping.json`}
          showCluster={this.state.cluster}
        />
        <InfoPanel sourceLink={`${GITHUB_TREE}/${this.props.path}`}>
          <h3>Meteorites Landings</h3>
          <p>Data set from The Meteoritical Society showing information on all of
            the known meteorite landings.</p>
          <p>Hover on a pin to see the list of names</p>
          <p>Click on a pin to see the details</p>
          <p>Data source:
            <a href="https://data.nasa.gov/Space-Science/Meteorite-Landings/gh4g-9sfh"> NASA</a>
          </p>
          <div className="layout">
            <div className="stat col-1-2">No. of Meteorites
              <b>{ 0 }</b>
            </div>
          </div>
          <hr />
          <div className="input">
            <label>Cluster</label>
            <input name="cluster" type="checkbox" checked={this.state.cluster} onChange={this.handleChange} />
          </div>
        </InfoPanel>
      </div>
    );
  }
}
