import React, { Component, createRef } from 'react';
import { Select } from 'antd';
import { connect } from 'umi';
import Map from 'ol/Map';
import View from 'ol/View';
import { XYZ, Vector as VectorSource, Cluster } from 'ol/source';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { ZoomToExtent, defaults as defaultControls } from 'ol/control';
import { Draw, Modify, Snap } from 'ol/interaction';
import Feature from 'ol/Feature';
import Overlay from 'ol/Overlay';
import { Fill, Stroke, Style, Icon, Circle as CircleStyle } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import Point from 'ol/geom/Point';
import 'ol/ol.css';

const { Option } = Select;

// 瓦片图层
const rasterLayer = new TileLayer({
  source: new XYZ({
    // 高德
    url: 'https://webrd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&scl=1&x={x}&y={y}&z={z}',
    // crossOrigin: '',
  }),
});
rasterLayer.set('name', 'rasterLayer');

// 矢量图层
const vectorSource = new VectorSource({
  wrapX: true,
});
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
vectorLayer.set('name', 'vectorLayer');

const iconVectorSource = new VectorSource({
  wrapX: true,
});
const iconVectorLayer = new VectorLayer({
  source: iconVectorSource,
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
        text: new Text(size.toString()),
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

  componentDidMount() {
    // 初始化地图
    this.map = new Map({
      target: this.olRef.current,
      layers: [rasterLayer, vectorLayer, iconVectorLayer],
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
          extent: [12879665.084781753, 4779131.18122614, 13068908.219130317, 5101248.438166104],
        }),
      ]),
    });

    this.popup = new Overlay({
      element: this.popupRef.current,
      positioning: 'bottom-center',
      stopEvent: true,
      offset: [0, 0],
    });

    this.map.addOverlay(this.popup);

    // 添加交互功能
    this.addInteractions();
    // 添加修改功能
    this.modify = new Modify({ source: vectorSource });
    this.map.addInteraction(this.modify);
  }

  shouldComponentUpdate(nextProps) {
    return this.props.list !== nextProps.list;
  }

  componentDidUpdate() {
    const { list } = this.props;
    this.handleMarker(list);
  }

  componentWillUnmount() {
    this.map.setTarget(undefined);
  }

  /**
   * 根据坐标范围查询医院数据
   * @param params
   */
  handleFetch = (params) => {
    const { dispatch } = this.props;
    dispatch({
      type: 'hospital/fetch',
      payload: {
        ...params,
      },
    });
  };

  /**
   * 根据查询到的医院数据添加地图标记
   * @param list
   */
  handleMarker = (list) => {
    list.forEach((item, i) => {
      const iconFeature = new Feature({
        geometry: new Point(fromLonLat(item.lngLat)),
        id: `hospital${item.id}`,
      });

      const iconStyle = new Style({
        image: new Icon({
          anchor: [0.5, 0.96],
          size: [44, 64],
          // padding-top: 8
          // padding-left: 19
          // padding-right: 45
          // padding-bottom:24
          offset: [19 + 88 * i, 8 + 88 * 3],
          // 1-10蓝标: [19+88*i,8+88*1]
          // 11-20蓝标：[19+88*i,8+88*2]
          // 1-10红标: [19+88*i,8+88*3]
          // 11-20红标：[19+88*i,8+88*4]
          // 1-10黄标: [19+88*i,8+88*5]
          src: './poi-marker.png',
        }),
      });
      iconFeature.setStyle(iconStyle);
      iconVectorSource.addFeature(iconFeature);
    });
  };

  /**
   * 切换绘制图形，并删除旧添加新交互功能。
   * @param value
   */
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

  /**
   * 地图交互功能实现及监听定义，带吸符功能。
   */
  addInteractions = () => {
    const { type } = this.state;
    this.draw = new Draw({
      source: vectorSource,
      type,
    });
    this.draw.on('drawend', (e) => {
      const center = e.feature.getGeometry().getCenter();
      const radius = e.feature.getGeometry().getRadius();
      this.handleFetch({
        type,
        center: toLonLat(center),
        radius,
      });
    });
    this.map.addInteraction(this.draw);
    this.snap = new Snap({ source: vectorSource });
    this.map.addInteraction(this.snap);
  };

  foo = () => {
    const that = this;
    this.map.on('click', (evt) => {
      const selectedFeature = that.map.forEachFeatureAtPixel(
        evt.pixel,
        (feature) => {
          return feature;
        },
        {
          layerFilter: (layer) => {
            return layer.get('name') === 'vectorLayer';
          },
        },
      );
      if (selectedFeature) {
        const coordinates = selectedFeature.getGeometry().getCoordinates();
        that.popup.setPosition(fromLonLat(coordinates));
        console.log('show');
      } else {
        console.log('hidden');
      }
    });

    this.map.on('pointermove', (e) => {
      if (e.dragging) {
        return;
      }
      const hit = this.map.hasFeatureAtPixel(e.pixel, {
        layerFilter: (layer) => {
          return layer.get('name') === 'vectorLayer';
        },
      });
      this.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
  };

  render() {
    const { type } = this.state;
    return (
      <div style={{ position: 'relative' }}>
        <div ref={this.olRef} style={{ height: '100vh' }}>
          <div ref={this.popupRef} />
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
}

export default connect(({ hospital: { list }, loading }) => ({
  list,
  loading: loading.effects['hospital/fetch'],
}))(Hospital);
