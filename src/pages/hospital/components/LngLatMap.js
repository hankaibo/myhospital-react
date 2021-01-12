import React, { Component, createRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import { XYZ } from 'ol/source';
import { Tile as TileLayer } from 'ol/layer';
import { ZoomToExtent, defaults as defaultControls, MousePosition } from 'ol/control';
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

class LngLatMap extends Component {
  constructor(props) {
    super(props);
    this.olRef = createRef();
    this.map = undefined;
  }

  componentDidMount() {
    // 初始化地图
    this.map = new Map({
      target: this.olRef.current,
      layers: [rasterLayer],
      view: new View({
        // projection: 'EPSG:4326',
        center: fromLonLat([116.397507, 39.908708]), // 默认北京
        zoom: 13,
        minZoom: 0,
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
    this.map.setTarget(undefined);
  }

  addEvent = () => {
    const { onSelect } = this.props;
    this.map.on('click', (e) => {
      const lonLat = toLonLat(e.coordinate);
      onSelect(lonLat);
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
