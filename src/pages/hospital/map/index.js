import React, { Component, createRef } from 'react';
import { Select as AntSelect, Descriptions, Typography, List, message } from 'antd';
import { connect } from 'umi';
import Map from 'ol/Map';
import View from 'ol/View';
import { XYZ, Vector as VectorSource, Cluster } from 'ol/source';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { defaults as defaultControls } from 'ol/control';
import { Draw, Modify, Snap, Select } from 'ol/interaction';
import Feature from 'ol/Feature';
import Overlay from 'ol/Overlay';
import { Fill, Stroke, Style, Icon, Circle as CircleStyle, Text as TextStyle } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import Point from 'ol/geom/Point';
import { click } from 'ol/events/condition';
import ContextMenu from 'ol-contextmenu';
import 'ol/ol.css';
import 'ol-contextmenu/dist/ol-contextmenu.css';
import styles from './index.less';

const { Option } = AntSelect;
const { Link, Text } = Typography;

// 瓦片图层
const rasterLayer = new TileLayer({
  source: new XYZ({
    // 高德
    url: 'https://webrd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&scl=1&x={x}&y={y}&z={z}',
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

// 聚合图层
const markerVectorSource = new VectorSource();
const clusterSource = new Cluster({
  distance: 40,
  source: markerVectorSource,
});
const styleCache = {};
const clusterLayer = new VectorLayer({
  source: clusterSource,
  style(feature) {
    const size = feature.get('features').length;
    let style = styleCache[size];
    if (!style) {
      style = new Style({
        image: new Icon({
          anchor: [0.5, 30],
          anchorXUnits: 'fraction',
          anchorYUnits: 'pixels',
          src: '../marker.png',
        }),
        text: new TextStyle({
          font: 'bold 18px serif',
          offsetY: '-16',
          text: size.toString(),
          fill: new Fill({
            color: '#000',
          }),
        }),
      });
      styleCache[size] = style;
    }
    return style;
  },
});
clusterLayer.set('name', 'clusterLayer');

// 矢量图层（用户）
const userVectorSource = new VectorSource();
const userVectorLayer = new VectorLayer({
  source: userVectorSource,
});

class HospitalMap extends Component {
  constructor(props) {
    super(props);
    this.state = {
      type: 'Circle',
      hospital: {},
      hospitalList: [],
      filterLvl: '-',
      filterType: '-',
    };
    this.olRef = createRef();
    this.popupRef = createRef();

    this.map = undefined;
    this.draw = undefined;
    this.select = null;
    this.modify = undefined;
    this.snap = undefined;

    this.allFeature = [];
    this.beforeMarkList = [];
    this.beforeCenter = [];
    this.beforeRadius = 0;
  }

  componentDidMount() {
    // 初始化地图
    this.map = new Map({
      target: this.olRef.current,
      layers: [rasterLayer, vectorLayer, clusterLayer],
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
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attribution: false,
      }),
    });

    // 添加交互功能
    this.addInteractions();

    // 添加地图事件
    this.addEvent();

    // 重定位地图
    this.handleLocation();

    // 自定义右键
    this.handleContextMenu();
  }

  shouldComponentUpdate(nextProps, nextStatue) {
    return (
      this.props.list !== nextProps.list ||
      this.state.hospital !== nextStatue.hospital ||
      this.state.hospitalList !== nextStatue.hospitalList ||
      this.state.filterLvl !== nextStatue.filterLvl ||
      this.state.filterType !== nextStatue.filterType
    );
  }

  componentDidUpdate() {
    const { list } = this.props;
    this.addMarker(list);
  }

  componentWillUnmount() {
    this.map.setTarget(undefined);
    const { dispatch } = this.props;
    dispatch({
      type: 'hospitalMap/clearMap',
    });
  }

  /**
   * 根据坐标范围查询医院数据
   * @param params
   */
  handleFetch = (params) => {
    const { dispatch } = this.props;
    dispatch({
      type: 'hospitalMap/fetch',
      payload: {
        ...params,
      },
      callback() {
        dispatch({
          type: 'hospitalMap/clearMap',
        });
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
    list
      // 过滤已绘制的
      .filter((item) => !this.allFeature.includes(item.id))
      .forEach((item) => {
        this.allFeature.push(item.id);
        newList.push(item);
      });
    newList.forEach((item) => {
      const iconFeature = new Feature({
        geometry: new Point(fromLonLat([item.lng, item.lat])),
        id: item.id,
        name: item.name,
        code: item.code,
        type: item.type,
        district: item.district,
        level: item.level,
        postalCode: item.postalCode,
        address: item.address,
        introduction: item.introduction,
      });
      markerVectorSource.addFeature(iconFeature);
    });
    this.beforeMarkList = [];
  };

  /**
   * 删除地图标记
   */
  removeMarker = (feature) => {
    const sum = vectorSource.getFeatures().length;
    if (sum === 0) {
      markerVectorSource.clear();
      this.allFeature = [];
    } else {
      let isDelete = true;
      vectorSource.forEachFeature((item) => {
        if (item.getGeometry().intersectsCoordinate(feature.getGeometry().getCoordinates())) {
          isDelete = false;
        }
      });
      if (isDelete) {
        this.allFeature = this.allFeature.filter((it) => it !== feature.get('id'));
        markerVectorSource.removeFeature(feature);
      }
    }
  };

  /**
   * 删除选中的图形区域
   */
  deleteDraw = () => {
    const selected = this.select.getFeatures();
    if (this.deleteFeature === selected.getArray()[0]) {
      this.setState({
        hospitalList: [],
      });
    }

    const geometry = this.deleteFeature.getGeometry();
    vectorSource.removeFeature(this.deleteFeature);
    markerVectorSource
      .getFeatures()
      .filter((item) => geometry.intersectsCoordinate(item.getGeometry().getCoordinates()))
      .forEach((item) => {
        this.removeMarker(item);
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
      const type = geometry.getType();
      switch (type) {
        case 'Circle':
          this.handleCircleBefore(feature);
          break;
        default:
          break;
      }
    });
    this.modify.on('modifyend', ({ features }) => {
      // eslint-disable-next-line no-underscore-dangle
      const feature = features.array_[0];
      const geometry = feature.getGeometry();
      const type = geometry.getType();
      switch (type) {
        case 'Circle':
          this.handleCircleAfter(feature);
          break;
        default:
          break;
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
        if (e.selected.length) {
          this.setState({
            hospitalList: markerVectorSource
              .getFeatures()
              .filter((item) => e.selected[0].getGeometry().intersectsCoordinate(item.getGeometry().getCoordinates()))
              .map((item) => {
                return { ...item.getProperties() };
              }),
          });
        } else {
          this.setState({
            hospitalList: [],
          });
        }
      });
    }
  };

  handleCircleBefore = (feature) => {
    const geometryCircle = feature.getGeometry();
    this.beforeCenter = geometryCircle.getCenter();
    this.beforeRadius = geometryCircle.getRadius();
    this.beforeMarkList = markerVectorSource
      .getFeatures()
      .filter((item) => geometryCircle.intersectsCoordinate(item.getGeometry().getCoordinates()));
  };

  handleCircleAfter = (feature) => {
    const geometryCircle = feature.getGeometry();
    const center = geometryCircle.getCenter();
    const radius = geometryCircle.getRadius();
    // drag
    if (this.beforeCenter.toString() !== center.toString()) {
      this.beforeMarkList.forEach((item) => {
        if (!geometryCircle.intersectsCoordinate(item.getGeometry().getCoordinates())) {
          this.removeMarker(item);
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
      this.beforeMarkList.forEach((item) => {
        if (!geometryCircle.intersectsCoordinate(item.getGeometry().getCoordinates())) {
          this.removeMarker(item);
        }
      });
    }
  };

  /**
   * 添加地图事件
   */
  addEvent = () => {
    this.map.on('click', (evt) => {
      const selectedFeature = this.map.forEachFeatureAtPixel(evt.pixel, (feature) => feature, {
        layerFilter: (layer) => layer.get('name') === 'clusterLayer',
      });
      if (selectedFeature) {
        if (selectedFeature.get('features').length === 1) {
          evt.stopPropagation();
          this.setState(
            {
              hospital: {
                ...selectedFeature.get('features')[0].getProperties(),
              },
            },
            () => {
              const coordinates = selectedFeature.getGeometry().getCoordinates();
              this.map.getOverlayById('popup').setPosition(coordinates);
            },
          );
        } else {
          message.warning('聚合元素不可以显示详情，请重新选择。');
        }
      }
    });

    this.map.on('pointermove', (e) => {
      if (e.dragging) {
        return;
      }
      const hit = this.map.hasFeatureAtPixel(e.pixel, {
        layerFilter: (layer) => layer.get('name') === 'vectorLayer' || layer.get('name') === 'clusterLayer',
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
        const center = fromLonLat([longitude, latitude]);
        this.map.getView().animate({ center });

        // 标记
        const circle = new Feature({
          geometry: new Point(center),
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
        userVectorSource.addFeature(circle);
        this.map.addLayer(userVectorLayer);

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
      });
    }
  };

  /**
   * 右键菜单
   */
  handleContextMenu = () => {
    const contextmenu = new ContextMenu({
      width: 170,
      defaultItems: false,
      items: [
        {
          text: '删除',
          classname: 'some-style-class',
          callback: this.deleteDraw,
        },
      ],
    });
    contextmenu.on('beforeopen', (evt) => {
      const selectedFeature = this.map.forEachFeatureAtPixel(evt.pixel, (feature) => feature, {
        layerFilter: (layer) => layer.get('name') === 'vectorLayer',
      });
      if (selectedFeature) {
        contextmenu.enable();
        this.deleteFeature = selectedFeature;
      } else {
        contextmenu.disable();
      }
    });
    this.map.addControl(contextmenu);
  };

  /**
   * 弹出层
   */
  handleClose = () => {
    this.map.getOverlayById('popup').setPosition(undefined);
    return false;
  };

  /**
   * 跳转到官网详情页面
   * @param value
   */
  handleDetail = (value) => {
    const tempForm = document.createElement('form');
    tempForm.id = 'tempForm1';
    tempForm.method = 'post';
    tempForm.action = 'https://fw.ybj.beijing.gov.cn/ddyy/ddyy/list';
    tempForm.target = 'ddyy1form';

    const hideInput = document.createElement('input');
    hideInput.type = 'hidden';
    hideInput.name = 'search_LIKE_yymc';
    hideInput.value = value;

    tempForm.appendChild(hideInput);

    tempForm.addEventListener('submit', () => {
      window.open('https://fw.ybj.beijing.gov.cn/ddyy/ddyy/list', 'ddyy1form');
    });

    document.body.appendChild(tempForm);

    tempForm.submit();

    document.body.removeChild(tempForm);
  };

  handleFilter = (hospitalList) => {
    const { filterLvl, filterType } = this.state;
    return hospitalList
      .filter((item) => (filterLvl !== '-' ? item.level === filterLvl : item))
      .filter((item) => (filterType !== '-' ? item.type === filterType : item));
  };

  render() {
    const { type, hospital, hospitalList } = this.state;
    const { name, code, type: hospitalType, level, address, introduction } = hospital;
    return (
      <div style={{ position: 'relative' }}>
        <div ref={this.olRef} style={{ height: '100vh' }}>
          <div ref={this.popupRef} className={styles.olPopup}>
            <a href="#" className={styles.olPopupCloser} onClick={this.handleClose}>
              ✖
            </a>
            <div id="popup-content">
              <Descriptions column={1}>
                <Descriptions.Item label="名称">
                  <Link href="#" copyable onClick={() => this.handleDetail(name)}>
                    {name}
                  </Link>
                </Descriptions.Item>
                <Descriptions.Item label="编码">
                  <Text copyable>{code}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="等级">{level}</Descriptions.Item>
                <Descriptions.Item label="类型">{hospitalType}</Descriptions.Item>
                <Descriptions.Item label="地址">{address}</Descriptions.Item>
                <Descriptions.Item label="简介">{introduction}</Descriptions.Item>
              </Descriptions>
            </div>
          </div>
        </div>
        {hospitalList.length > 0 && (
          <div className={styles.box}>
            <div>
              <AntSelect
                defaultValue="-"
                size="large"
                style={{ width: '50%' }}
                onChange={(value) => this.setState({ filterType: value })}
              >
                <Option value="-">-</Option>
                <Option value="A类医院">A类医院</Option>
                <Option value="对外综合">对外综合</Option>
                <Option value="对外专科">对外专科</Option>
                <Option value="对外中医">对外中医</Option>
                <Option value="社区卫生站">社区卫生站</Option>
                <Option value="对内">对内</Option>
              </AntSelect>
              <AntSelect
                defaultValue="-"
                size="large"
                style={{ width: '50%' }}
                onChange={(value) => this.setState({ filterLvl: value })}
              >
                <Option value="-">-</Option>
                <Option value="三级">三级</Option>
                <Option value="二级">二级</Option>
                <Option value="一级">一级</Option>
                <Option value="未评级">未评级</Option>
              </AntSelect>
            </div>
            <div className={styles.listContainer}>
              <List
                itemLayout="horizontal"
                dataSource={this.handleFilter(hospitalList)}
                renderItem={(item, index) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <>
                          <span>{index + 1} </span>
                          <Link href="#" onClick={() => this.handleDetail(name)}>
                            {item.name}
                          </Link>
                        </>
                      }
                      description={
                        <p className={styles.description}>
                          <Text>{item.type}</Text>
                          <Text>{item.level}</Text>
                        </p>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          </div>
        )}
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

export default connect(({ hospitalMap: { mapData }, loading }) => ({
  list: mapData,
  loading: loading.effects['hospitalMap/fetch'],
}))(HospitalMap);
