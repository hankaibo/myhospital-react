import React, { Component, createRef } from 'react';
import { Select, Popover, Button } from 'antd';
import Map from 'ol/Map';
import View from 'ol/View';
import { XYZ, Vector as VectorSource, Cluster } from 'ol/source';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { ZoomToExtent, defaults as defaultControls } from 'ol/control';
import { Draw, Modify, Snap, defaults as defaultInteractions } from 'ol/interaction';
import Feature from 'ol/Feature';
import Overlay from 'ol/Overlay';
import { Fill, Stroke, Style, Icon, Circle as CircleStyle } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import Point from 'ol/geom/Point';
import 'ol/ol.css';

const { Option } = Select;

// 瓦片图层
const rasterLayer = new TileLayer({
  source: new XYZ({
    // 高德
    url: 'https://webrd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&scl=1&x={x}&y={y}&z={z}',
    crossOrigin: '',
  }),
});

// 矢量图层
const vectorSource = new VectorSource({ wrapX: true });
const vectorLayer = new VectorLayer({
  source: vectorSource,
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

// 聚合
const clusterSource = new Cluster({
  distance: 40,
  source: vectorSource,
});
const styleCache = {};
// eslint-disable-next-line no-unused-vars
const clusterLayer = new VectorLayer({
  source: clusterSource,
  style(feature) {
    const size = feature.get('features').length;
    let style = styleCache[size];
    if (!style) {
      style = new Style({
        fill: new Fill({
          color: 'rgba(155, 211, 229,0.5)',
        }),
        stroke: new Stroke({
          color: 'rgba(49, 143, 227,1)',
          width: 1,
        }),
        image: new CircleStyle({
          radius: 10,
          stroke: new Stroke({
            color: '#fff',
          }),
          fill: new Fill({
            color: '#3399cc',
          }),
        }),
        text: new Text({
          text: size.toString(),
          fill: new Fill({
            color: '#fff',
          }),
        }),
      });
      styleCache[size] = style;
    }
    return style;
  },
});

class Hospital extends Component {
  constructor(props) {
    super(props);
    this.state = {
      type: 'Circle',
    };
    this.olRef = createRef();
    this.popupRef = createRef();
    this.map = undefined;
    this.modify = undefined;
    this.draw = undefined;
    this.snap = undefined;
  }

  render() {
    const { type } = this.state;
    const content = (
      <div>
        <p>Content</p>
        <p>Content</p>
      </div>
    );
    return (
      <div style={{ position: 'relative' }}>
        <div ref={this.olRef} style={{ height: '100vh' }}>
          <div ref={this.popupRef}>
            <Popover content={content} title="Title">
              <Button type="primary">Hover me</Button>
            </Popover>
          </div>
        </div>
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
      layers: [rasterLayer, vectorLayer],
      view: new View({
        // projection: 'EPSG:4326',
        center: fromLonLat([116.397507, 39.908708]),
        zoom: 13,
        minZoom: 0,
        maxZoom: 18,
        constrainResolution: true,
      }),
      controls: defaultControls().extend([
        new ZoomToExtent({
          extent: fromLonLat([115.7, 39.4, 117.4, 41.6]),
        }),
      ]),
      interactions: defaultInteractions().extend([new Modify({ source: vectorSource })]),
    });

    this.popup = new Overlay({
      element: this.popupRef.current,
      positioning: 'bottom-center',
      stopEvent: true,
      offset: [0, -50],
    });

    this.map.addOverlay(this.popup);

    this.modify = new Modify({ source: vectorSource });
    this.map.addInteraction(this.modify);
    this.addInteractions();
    this.foo();
    this.handleMarker();
  }

  // eslint-disable-next-line no-unused-vars
  componentDidUpdate(prevProps, prevState, snapshot) {
    this.handleMarker();
  }

  componentWillUnmount() {
    this.map.setTarget(undefined);
  }

  handleMarker = () => {
    const arr = [
      [116.407526, 39.90403],
      [116.518097, 39.764168],
      [115.844236, 40.476927],
      [116.045473, 40.48194],
      [116.16295, 40.529043],
      [115.844236, 40.476927],
      [116.22604, 40.567708],
      [116.08733, 40.550988],
    ];
    for (let i = 0; i < 8; i += 1) {
      const iconFeature = new Feature({
        geometry: new Point(fromLonLat(arr[i])),
      });

      const iconStyle = new Style({
        image: new Icon({
          anchor: [-22, -64],
          anchorXUnits: 'pixels',
          anchorYUnits: 'pixels',
          size: [44, 64],
          // padding-top: 8
          // padding-left: 19
          // padding-right: 45
          // padding-bottom:24
          offset: [19 + 88 * i, 8 + 88 * 2],
          scale: 1,
          // 1-10蓝标: [19+88*i,8+88*1]
          // 11-20蓝标：[19+88*i,8+88*2]
          // 1-10红标: [19+88*i,8+88*3]
          // 11-20红标：[19+88*i,8+88*4]
          // 1-10黄标: [19+88*i,8+88*5]
          src: 'https://www.amap.com/assets/img/poi-marker.png',
        }),
      });
      iconFeature.setStyle(iconStyle);
      vectorSource.addFeature(iconFeature);
    }
  };

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
      source: vectorSource,
      type,
    });
    this.draw.on('drawend', (e) => {
      console.log(e);
    });
    this.map.addInteraction(this.draw);
    this.snap = new Snap({ source: vectorSource });
    this.map.addInteraction(this.snap);
  };

  foo = () => {
    const that = this;
    this.map.on('click', (evt) => {
      const feature = that.map.forEachFeatureAtPixel(evt.pixel, (f) => {
        return f;
      });
      if (feature) {
        const coordinates = feature.getGeometry().getCoordinates();
        that.popup.setPosition(coordinates);
        alert('show');
      } else {
        alert('hidden');
      }
    });

    this.map.on('pointermove', (e) => {
      if (e.dragging) {
        return;
      }
      const pixel = that.map.getEventPixel(e.originalEvent);
      const hit = that.map.hasFeatureAtPixel(pixel);
      this.map.getTarget().style.cursor = hit ? 'pointer' : '';
    });
  };
}

export default Hospital;
