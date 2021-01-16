import React, { Component, createRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import { XYZ, Vector as VectorSource } from 'ol/source';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { ZoomToExtent, defaults as defaultControls, MousePosition } from 'ol/control';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Stroke, Style, Circle as CircleStyle } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import 'ol/ol.css';

// 瓦片图层
const rasterLayer = new TileLayer({
  source: new XYZ({
    // 高德
    url: 'https://webrd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&scl=1&x={x}&y={y}&z={z}',
    // crossOrigin: '',
  }),
});

// 矢量图层
const vectorSource = new VectorSource();
const vectorLayer = new VectorLayer({
  source: vectorSource,
});

class LngLatMap extends Component {
  constructor(props) {
    super(props);
    this.olRef = createRef();
    this.map = undefined;
  }

  componentDidMount() {
    const { center } = this.props;
    const defaultCenter = [116.397507, 39.908708];
    // 初始化地图
    this.map = new Map({
      target: this.olRef.current,
      layers: [rasterLayer, vectorLayer],
      view: new View({
        // projection: 'EPSG:4326',
        center: fromLonLat(center || defaultCenter), // 默认北京
        zoom: 17,
        minZoom: 3,
        maxZoom: 18,
        constrainResolution: true,
      }),
      controls: defaultControls({
        rotate: false,
        attribution: false,
      }).extend([
        new MousePosition(),
        new ZoomToExtent({
          extent: [12879665.084781753, 4779131.18122614, 13068908.219130317, 5101248.438166104],
        }),
      ]),
    });

    // 添加地图事件
    this.addEvent();
  }

  componentWillUnmount() {
    vectorSource.clear();
    this.map.setTarget(undefined);
  }

  addEvent = () => {
    const { onSelect } = this.props;
    this.map.on('click', (e) => {
      const lonLat = toLonLat(e.coordinate);
      onSelect(lonLat);
    });

    // 标记
    const circle = new Feature({
      geometry: new Point(this.map.getView().getCenter()),
    });
    circle.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 0,
          stroke: new Stroke({
            color: 'red',
          }),
        }),
      }),
    );
    vectorSource.addFeature(circle);
    // 动画
    let radius = 0;
    this.map.on('postcompose', () => {
      radius += 1;
      radius %= 20;
      circle.setStyle(
        new Style({
          image: new CircleStyle({
            radius,
            stroke: new Stroke({
              color: 'red',
            }),
          }),
        }),
      );
    });
  };

  render() {
    return (
      <div style={{ position: 'relative' }}>
        <div ref={this.olRef} style={{ height: '800px' }} />
      </div>
    );
  }
}

export default LngLatMap;
