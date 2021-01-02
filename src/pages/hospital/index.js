import React, { Component, createRef } from 'react';
import { Select } from 'antd';
import Map from 'ol/Map';
import View from 'ol/View';
import { Draw, Modify, Snap } from 'ol/interaction';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { XYZ, Vector as VectorSource } from 'ol/source';
import { Fill, Stroke, Style } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import 'ol/ol.css';

const { Option } = Select;

const raster = new TileLayer({
  source: new XYZ({
    // 高德
    url: 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    // 天地图
    // url: `http://t${Math.round(Math.random()*7)}.tianditu.gov.cn/wec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={x}&TILECOL={y}&tk=276e9da64a8b734a342311582ca6b4e3`
  }),
});
const source = new VectorSource({ wrapX: true });
const vector = new VectorLayer({
  source,
  style: new Style({
    fill: new Fill({
      color: 'rgba(155, 211, 229,0.5)',
    }),
    stroke: new Stroke({
      color: 'rgba(49, 143, 227,1)',
      width: 1,
    }),
  }),
});

class Hospital extends Component {
  constructor(props) {
    super(props);
    this.state = {
      type: 'Circle',
    };
    this.olRef = createRef();
    this.map = undefined;
    this.modify = undefined;
    this.draw = undefined;
    this.snap = undefined;
  }

  render() {
    const { type } = this.state;
    return (
      <div style={{ position: 'relative' }}>
        <div ref={this.olRef} style={{ height: '100vh' }} />
        <div style={{ position: 'absolute', top: '.5em', right: '.5em' }}>
          <Select defaultValue={type} style={{ width: 120 }} onChange={(value) => this.handleType(value)}>
            <Option value="Circle">圆形</Option>
            <Option value="Polygon">多边形</Option>
          </Select>
        </div>
      </div>
    );
  }

  componentDidMount() {
    this.map = new Map({
      target: this.olRef.current,
      layers: [raster, vector],
      view: new View({
        center: fromLonLat([116.397507, 39.908708]),
        zoom: 14,
        minZoom: 0,
        maxZoom: 18,
        constrainResolution: true,
      }),
    });
    this.modify = new Modify({ source });
    this.map.addInteraction(this.modify);
    this.addInteractions();
  }

  componentWillUnmount() {
    this.map.setTarget(undefined);
  }

  handleType = (value) => {
    this.setState(
      {
        type: value,
      },
      () => {
        this.map.removeInteraction(this.draw);
        this.map.removeInteraction(this.snap);
        this.addInteractions();
      },
    );
  };

  addInteractions = () => {
    const { type } = this.state;
    this.draw = new Draw({
      source,
      type,
    });
    this.draw.on('drawend', (e) => {
      console.log(e);
    });
    this.map.addInteraction(this.draw);
    this.snap = new Snap({ source });
    this.map.addInteraction(this.snap);
  };
}

export default Hospital;
