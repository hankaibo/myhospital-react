import React, { Component, createRef } from 'react';
import { Select as AntSelect } from 'antd';
import { connect } from 'umi';
import Map from 'ol/Map';
import View from 'ol/View';
import { XYZ, Vector as VectorSource, Cluster } from 'ol/source';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { ZoomToExtent, defaults as defaultControls } from 'ol/control';
import { Draw, Modify, Snap, Select } from 'ol/interaction';
import Feature from 'ol/Feature';
import Overlay from 'ol/Overlay';
import { Fill, Stroke, Style, Icon, Circle as CircleStyle } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import Point from 'ol/geom/Point';
import { click } from 'ol/events/condition';
import 'ol/ol.css';
import styles from './index.less';

const { Option } = AntSelect;

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

// 矢量图层（标记）
const markerVectorSource = new VectorSource({
  wrapX: true,
});
const markerVectorLayer = new VectorLayer({
  source: markerVectorSource,
});
markerVectorLayer.set('name', 'markerVectorLayer');

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
    this.draw = undefined;
    this.select = null;
    this.modify = undefined;
    this.snap = undefined;

    // 当区域A∩B有共同的marker时，
    // 删除B区域时，因为marker还在A区域中，故marker不删除；
    // 当删除A区域时，marker不在任何区域中，此时删除。
    // 第一次用ol，没找到相关api，因为情况简单，使用了”引用计数“这种最简单实现方法。
    // 引用计数原理请参考垃圾回收机制。
    this.allFeature = {};
    this.beforeFeatureList = [];
    this.beforeCenter = [];
    this.beforeRadius = 0;
  }

  componentDidMount() {
    // 初始化地图
    this.map = new Map({
      target: this.olRef.current,
      layers: [rasterLayer, vectorLayer, markerVectorLayer],
      view: new View({
        // projection: 'EPSG:4326',
        center: fromLonLat([116.397507, 39.908708]), // 默认北京
        zoom: 13,
        minZoom: 0,
        maxZoom: 18,
        constrainResolution: true,
      }),
      overlays: [
        new Overlay({
          id: 'popup',
          element: this.popupRef.current,
          autoPan: true,
          autoPanAnimation: {
            duration: 250,
          },
        }),
      ],
      controls: defaultControls().extend([
        new ZoomToExtent({
          extent: [12879665.084781753, 4779131.18122614, 13068908.219130317, 5101248.438166104],
        }),
      ]),
    });

    // 添加交互功能
    this.addInteractions();

    // 添加地图事件
    this.addEvent();

    // 重定位地图
    this.handleLocation();
  }

  shouldComponentUpdate(nextProps) {
    return this.props.list !== nextProps.list;
  }

  componentDidUpdate() {
    const { list } = this.props;
    this.addMarker(list);
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
  addMarker = (list) => {
    if (!Array.isArray(list)) {
      return;
    }
    const newList = [];
    list.forEach((item) => {
      const value = this.allFeature[item.name];
      if (!value) {
        this.allFeature[item.name] = 1;
        newList.push(item);
      } else {
        this.allFeature[item.name] = value + 1;
      }
    });
    newList.forEach((item, i) => {
      const iconFeature = new Feature({
        geometry: new Point(fromLonLat(item.lngLat)),
        id: item.id,
        name: item.name,
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
      markerVectorSource.addFeature(iconFeature);
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
        this.map.removeInteraction(this.modify);
        this.map.removeInteraction(this.select);
        this.addInteractions();
      },
    );
  };

  /**
   * 添加地图交互功能
   */
  addInteractions = () => {
    this.handleDraw();
    this.handleSnap();
    this.handleModify();
    this.handleSelect();
  };

  handleDraw = () => {
    const { type } = this.state;
    this.draw = new Draw({
      source: vectorSource,
      type,
    });
    this.draw.on('drawend', ({ feature }) => {
      const geometry = feature.getGeometry();
      if (geometry.getType() === 'Circle') {
        const center = feature.getGeometry().getCenter();
        const radius = feature.getGeometry().getRadius();
        this.handleFetch({
          type,
          center: toLonLat(center),
          radius,
        });
      }
    });
    this.map.addInteraction(this.draw);
  };

  handleSnap = () => {
    this.snap = new Snap({ source: vectorSource });
    this.map.addInteraction(this.snap);
  };

  handleModify = () => {
    this.modify = new Modify({ source: vectorSource });
    this.modify.on('modifystart', ({ features }) => {
      // eslint-disable-next-line no-underscore-dangle
      const feature = features.array_[0];
      const geometry = feature.getGeometry();
      if (geometry.getType() === 'Circle') {
        this.beforeCenter = geometry.getCenter();
        this.beforeRadius = geometry.getRadius();
        this.beforeFeatureList = markerVectorSource
          .getFeatures()
          .filter((item) => geometry.intersectsCoordinate(item.getGeometry().getCoordinates()));
      }
    });
    this.modify.on('modifyend', ({ features }) => {
      // eslint-disable-next-line no-underscore-dangle
      const feature = features.array_[0];
      const geometry = feature.getGeometry();
      if (geometry.getType() === 'Circle') {
        const center = geometry.getCenter();
        const radius = geometry.getRadius();
        // drag
        if (this.beforeCenter.toString() !== center.toString()) {
          this.beforeFeatureList.forEach((item) => {
            if (!geometry.intersectsCoordinate(item.getGeometry().getCoordinates())) {
              markerVectorSource.removeFeature(item);
            }
          });
          this.handleFetch({
            type: 'Circle',
            center: toLonLat(center),
            radius,
          });
        } else if (radius > this.beforeRadius) {
          this.handleFetch({
            type: 'Circle',
            center: toLonLat(center),
            radius,
          });
        } else {
          this.beforeFeatureList.forEach((item) => {
            if (!geometry.intersectsCoordinate(item.getGeometry().getCoordinates())) {
              const name = item.get('name');
              const value = this.allFeature[name];
              if (value > 1) {
                this.allFeature[name] = value - 1;
              } else {
                delete this.allFeature[name];
                markerVectorSource.removeFeature(item);
              }
            }
          });
        }
      }
    });
    this.map.addInteraction(this.modify);
  };

  handleSelect = () => {
    if (this.select !== null) {
      this.map.removeInteraction(this.select);
    }
    this.select = new Select({
      condition: click,
      layers: [vectorLayer],
    });
    if (this.select !== null) {
      this.map.addInteraction(this.select);
      this.select.on('select', (e) => {
        console.log(
          `${e.target.getFeatures().getLength()} selected features (last operation selected ${
            e.selected.length
          } and deselected ${e.deselected.length} features)`,
        );
      });
    }
  };

  /**
   * 添加地图事件
   */
  addEvent = () => {
    this.map.on('click', (evt) => {
      const selectedFeature = this.map.forEachFeatureAtPixel(evt.pixel, (feature) => feature, {
        layerFilter: (layer) => layer.get('name') === 'markerVectorLayer',
      });
      if (selectedFeature) {
        evt.stopPropagation();
        const coordinates = selectedFeature.getGeometry().getCoordinates();
        this.map.getOverlayById('popup').setPosition(coordinates);
      }
    });

    this.map.on('pointermove', (e) => {
      if (e.dragging) {
        return;
      }
      const hit = this.map.hasFeatureAtPixel(e.pixel, {
        layerFilter: (layer) => layer.get('name') === 'vectorLayer',
      });
      this.draw.setActive(!hit);
      this.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
  };

  /**
   * 定位地图中心到用户当前位置
   */
  handleLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { longitude, latitude } = position.coords;
        this.map.getView().animate({ center: fromLonLat([longitude, latitude]) });
      });
    }
  };

  /**
   * 弹出层
   */
  handleClose = () => {
    this.map.getOverlayById('popup').setPosition(undefined);
    return false;
  };

  render() {
    const { type } = this.state;
    return (
      <div style={{ position: 'relative' }}>
        <div ref={this.olRef} style={{ height: '100vh' }}>
          <div ref={this.popupRef} className={styles.olPopup}>
            <a href="#" className={styles.olPopupCloser} onClick={this.handleClose}>
              ✖
            </a>
            <div id="popup-content">test</div>
          </div>
        </div>
        <div style={{ position: 'absolute', top: '.5em', right: '.5em' }}>
          <AntSelect defaultValue={type} style={{ width: 120 }} onChange={(value) => this.handleType(value)}>
            <Option value="Circle">圆形</Option>
            <Option value="Polygon" disabled>
              多边形
            </Option>
          </AntSelect>
        </div>
      </div>
    );
  }
}

export default connect(({ hospital: { list }, loading }) => ({
  list,
  loading: loading.effects['hospital/fetch'],
}))(Hospital);
