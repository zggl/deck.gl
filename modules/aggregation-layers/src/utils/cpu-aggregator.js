/* eslint-disable no-undef */
/* eslint-disable no-console */
/* eslint-disable no-invalid-this */
// Copyright (c) 2015 - 2018 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
import BinSorter from './bin-sorter';
import {getScaleFunctionByScaleType} from './scale-utils';
import {getValueFunc} from './aggregation-operation-utils';

function nop() {}

function getDimensionSortedBins(step, props, dimensionUpdater) {
  console.log('getDimensionSortedBins');
  const {key} = dimensionUpdater;
  const {getValue} = this.state.dimensions[key];

  const sortedBins = new BinSorter(this.state.layerData.data || [], {
    getValue,
    filterData: props.filterData
  });
  this.setDimensionState(key, {sortedBins});
  // this.getDimensionValueDomain(props, dimensionUpdater);
}

function getDimensionValueDomain(step, props, dimensionUpdater) {
  const {key} = dimensionUpdater;
  const {
    triggers: {lowerPercentile, upperPercentile},
    onSet
  } = step;
  if (!this.state.dimensions[key].sortedBins) {
    // the previous step should set sortedBins, if not, something went wrong
    return;
  }

  const valueDomain = this.state.dimensions[key].sortedBins.getValueRange([
    props[lowerPercentile.prop],
    props[upperPercentile.prop]
  ]);

  if (typeof onSet === 'object' && typeof props[onSet.props] === 'function') {
    props[onSet.props](valueDomain);
  }

  this.setDimensionState(key, {valueDomain});
}

function getDimensionScale(step, props, dimensionUpdater) {
  console.log('getDimensionScale');

  const {key} = dimensionUpdater;
  const {domain, range, scaleType} = step.triggers;
  if (!this.state.dimensions[key].valueDomain) {
    // the previous step should set valueDomain, if not, something went wrong
    return;
  }

  const dimensionRange = props[range.prop];
  const dimensionDomain = props[domain.prop] || this.state.dimensions[key].valueDomain;
  const getScaleFunction = getScaleFunctionByScaleType(props[scaleType.prop]);
  const scaleFunc = getScaleFunction(dimensionDomain, dimensionRange);

  this.setDimensionState(key, {scaleFunc});
}

const defaultDimensions = [
  {
    key: 'fillColor',
    accessor: 'getFillColor',
    pickingInfo: 'colorValue',
    nullValue: [0, 0, 0, 0],
    updateSteps: [
      {
        key: 'getBins',
        triggers: {
          value: {
            prop: 'getColorValue',
            updateTrigger: 'getColorValue'
          },
          weight: {
            prop: 'getColorWeight',
            updateTrigger: 'getColorWeight'
          },
          aggregation: {
            prop: 'colorAggregation'
          },
          filterData: {
            prop: 'filterData',
            updateTrigger: 'filterData'
          }
        },
        updater: getDimensionSortedBins
      },
      {
        key: 'getDomain',
        triggers: {
          lowerPercentile: {
            prop: 'lowerPercentile'
          },
          upperPercentile: {
            prop: 'upperPercentile'
          }
        },
        updater: getDimensionValueDomain,
        onSet: {
          props: 'onSetColorDomain'
        }
      },
      {
        key: 'getScaleFunc',
        triggers: {
          domain: {prop: 'colorDomain'},
          range: {prop: 'colorRange'},
          scaleType: {prop: 'colorScaleType'}
        },
        updater: getDimensionScale
      }
    ]
  },
  {
    key: 'elevation',
    accessor: 'getElevation',
    pickingInfo: 'elevationValue',
    nullValue: -1,
    updateSteps: [
      {
        key: 'getBins',
        triggers: {
          value: {
            prop: 'getElevationValue',
            updateTrigger: 'getElevationValue'
          },
          weight: {
            prop: 'getElevationWeight',
            updateTrigger: 'getElevationWeight'
          },
          aggregation: {
            prop: 'elevationAggregation'
          },
          filterData: {
            prop: 'filterData',
            updateTrigger: 'filterData'
          }
        },
        updater: getDimensionSortedBins
      },
      {
        key: 'getDomain',
        triggers: {
          lowerPercentile: {
            prop: 'elevationLowerPercentile'
          },
          upperPercentile: {
            prop: 'elevationUpperPercentile'
          }
        },
        onSet: {
          props: 'onSetElevationDomain'
        },
        updater: getDimensionValueDomain
      },
      {
        key: 'getScaleFunc',
        triggers: {
          domain: {prop: 'elevationDomain'},
          range: {prop: 'elevationRange'},
          scaleType: {prop: 'elevationScaleType'}
        },
        updater: getDimensionScale
      }
    ]
  }
];

const defaultGetCellSize = props => props.cellSize;

export default class CPUAggregator {
  constructor(opts) {
    this.state = {
      layerData: {},
      dimensions: {
        // color: {
        //   getValue: null,
        //   domain: null,
        //   sortedBins: null,
        //   scaleFunc: nop
        // },
        // elevation: {
        //   getValue: null,
        //   domain: null,
        //   sortedBins: null,
        //   scaleFunc: nop
        // }
      }
    };
    this.changeFlags = {};
    this.dimensionUpdaters = {};

    this._getCellSize = opts.getCellSize || defaultGetCellSize;
    this._getAggregator = opts.getAggregator;
    this._addDimension(opts.dimensions || defaultDimensions);
  }

  static defaultDimensions() {
    return defaultDimensions;
  }

  updateState({oldProps, props, changeFlags}, viewport) {
    this.updateGetValueFuncs(oldProps, props, changeFlags);
    const reprojectNeeded = this.needsReProjectPoints(oldProps, props, changeFlags);
    let dimensionChanges = [];

    if (changeFlags.dataChanged || reprojectNeeded) {
      // project data into hexagons, and get sortedColorBins
      this.getAggregatedData(props, viewport);

      // update all dimensions
      for (const dim in this.dimensionUpdaters) {
        const updaters = this.accumulateUpdaters(0, props, this.dimensionUpdaters[dim]);
        dimensionChanges = dimensionChanges.concat(updaters);
      }
    } else {
      dimensionChanges = this.getDimensionChanges(oldProps, props, changeFlags) || [];
    }

    dimensionChanges.forEach(f => typeof f === 'function' && f());

    return this.state;
  }

  // Update private state
  setState(updateObject) {
    this.state = Object.assign({}, this.state, updateObject);
  }

  // Update private state.dimensions
  setDimensionState(key, updateObject) {
    this.setState({
      dimensions: Object.assign({}, this.state.dimensions, {
        [key]: Object.assign({}, this.state.dimensions[key], updateObject)
      })
    });
  }

  normalizeResult(result = {}) {
    // support previous hexagonAggregator API
    if (result.hexagons) {
      return Object.assign({data: result.hexagons}, result);
    } else if (result.layerData) {
      return Object.assign({data: result.layerData}, result);
    }

    return result;
  }

  getAggregatedData(props, viewport) {
    const aggregator = this._getAggregator(props);

    // result should contain a data array and other props
    // result = {data: [], ...other props}
    const result = aggregator(props, viewport);
    this.setState({
      layerData: this.normalizeResult(result)
    });
    this.changeFlags = {
      layerData: true
    };
  }

  updateGetValueFuncs(oldProps, props, changeFlags) {
    for (const key in this.dimensionUpdaters) {
      const getBins = this.dimensionUpdaters[key].updateSteps[0];
      const {value, weight, aggregation} = getBins.triggers;
      let getValue = props[value.prop];
      const getValueChanged = this.needUpdateDimensionStep(getBins, oldProps, props, changeFlags);

      if (getValueChanged && getValue === null) {
        // If `getValue` is not provided from props, build it with aggregation and weight.
        getValue = getValueFunc(props[aggregation.prop], props[weight.prop]);
      }

      if (getValue) {
        this.setDimensionState(key, {getValue});
      }
    }
  }

  needsReProjectPoints(oldProps, props, changeFlags) {
    return (
      this._getCellSize(oldProps) !== this._getCellSize(props) ||
      this._getAggregator(oldProps) !== this._getAggregator(props) ||
      (changeFlags.updateTriggersChanged &&
        (changeFlags.updateTriggersChanged.all || changeFlags.updateTriggersChanged.getPosition))
    );
  }

  // Adds dimensions
  addDimension(dimensions) {
    this._addDimension(dimensions);
  }

  _addDimension(dimensions = []) {
    dimensions.forEach(dimension => {
      const {key} = dimension;
      this.dimensionUpdaters[key] = this.getDimensionUpdaters(dimension);
    });
  }

  _addStep(key, updateStep) {
    this.state.dimensions[key][updateStep.result] = updateStep.default;
  }

  getDimensionUpdaters({key, accessor, pickingInfo, updateSteps, nullValue}) {
    return {
      key,
      accessor,
      pickingInfo,
      updateSteps,
      attributeAccessor: this.getSubLayerDimensionAttribute(key, nullValue)
    };
  }

  needUpdateDimensionStep(dimensionStep, oldProps, props, changeFlags) {
    // whether need to update current dimension step
    // dimension step is the value, domain, scaleFunction of each dimension
    // each step is an object with properties links to layer prop and whether the prop is
    // controlled by updateTriggers
    return Object.values(dimensionStep.triggers).some(item => {
      if (item.updateTrigger) {
        // check based on updateTriggers change first
        return (
          changeFlags.updateTriggersChanged &&
          (changeFlags.updateTriggersChanged.all ||
            changeFlags.updateTriggersChanged[item.updateTrigger])
        );
      }
      // fallback to direct comparison
      return oldProps[item.prop] !== props[item.prop];
    });
  }

  accumulateUpdaters(step, props, dimUpdater) {
    const updaters = [];
    for (let i = step; i < dimUpdater.updateSteps.length; i++) {
      if (typeof dimUpdater.updateSteps[i].updater === 'function') {
        updaters.push(
          dimUpdater.updateSteps[i].updater.bind(this, dimUpdater.updateSteps[i], props, dimUpdater)
        );
      }
    }

    return updaters;
  }

  getDimensionChanges(oldProps, props, changeFlags) {
    let updaters = [];

    // get dimension to be updated
    for (const key in this.dimensionUpdaters) {
      // return the first triggered updater for each dimension
      const dimUpdater = this.dimensionUpdaters[key];
      const needUpdateStep = dimUpdater.updateSteps.findIndex(step =>
        this.needUpdateDimensionStep(step, oldProps, props, changeFlags)
      );

      if (needUpdateStep > -1) {
        updaters = this.accumulateUpdaters(needUpdateStep, props, dimUpdater);
      }
    }

    return updaters.length ? updaters : null;
  }

  getUpdateTriggers(props) {
    const _updateTriggers = props.updateTriggers || {};
    const updateTriggers = {};

    for (const key in this.dimensionUpdaters) {
      const {accessor, updateSteps} = this.dimensionUpdaters[key];
      // fold dimension triggers into each accessor
      updateTriggers[accessor] = {};

      updateSteps.forEach(step => {
        Object.values(step.triggers || []).forEach(({prop, updateTrigger}) => {
          if (updateTrigger) {
            // if prop is based on updateTrigger e.g. getColorValue, getColorWeight
            // and updateTriggers is passed in from layer prop
            // fold the updateTriggers into accessor
            const fromProp = _updateTriggers[updateTrigger];
            if (typeof fromProp === 'object' && !Array.isArray(fromProp)) {
              // if updateTrigger is an object spread it
              Object.assign(updateTriggers[accessor], fromProp);
            } else if (fromProp !== undefined) {
              updateTriggers[accessor][prop] = fromProp;
            }
          } else {
            // if prop is not based on updateTrigger
            updateTriggers[accessor][prop] = props[prop];
          }
        });
      });
    }

    return updateTriggers;
  }

  getSubLayerDimensionAttribute(key, nullValue) {
    return cell => {
      const {sortedBins, scaleFunc} = this.state.dimensions[key];
      const bin = sortedBins.binMap[cell.index];

      if (bin && bin.counts === 0) {
        // no points left in bin after filtering
        return nullValue;
      }

      const cv = bin && bin.value;
      const domain = scaleFunc.domain();

      const isValueInDomain = cv >= domain[0] && cv <= domain[domain.length - 1];

      // if cell value is outside domain, set alpha to 0
      return isValueInDomain ? scaleFunc(cv) : nullValue;
    };
  }

  getSubLayerAccessors(props) {
    const accessors = {};
    for (const key in this.dimensionUpdaters) {
      const {accessor} = this.dimensionUpdaters[key];
      accessors[accessor] = this.getSubLayerDimensionAttribute(props, key);
    }

    return accessors;
  }

  getPickingInfo({info}) {
    const isPicked = info.picked && info.index > -1;
    let object = null;

    if (isPicked) {
      // const {sortedColorBins, sortedElevationBins} = this.state;

      const cell = this.state.layerData.data[info.index];

      const binInfo = {};
      for (const key in this.dimensionUpdaters) {
        const {pickingInfo} = this.dimensionUpdaters[key];
        const {sortedBins} = this.state.dimensions[key];
        const value = sortedBins.binMap[cell.index] && sortedBins.binMap[cell.index].value;
        binInfo[pickingInfo] = value;
      }

      object = Object.assign(binInfo, cell, {
        points: cell.filteredPoints || cell.points
      });
    }

    // add bin colorValue and elevationValue to info
    return Object.assign(info, {
      picked: Boolean(object),
      // override object with picked cell
      object
    });
  }

  getAccessor(dimensionKey) {
    if (!this.dimensionUpdaters.hasOwnProperty(dimensionKey)) {
      return nop;
    }
    return this.dimensionUpdaters[dimensionKey].attributeAccessor;
  }
}
