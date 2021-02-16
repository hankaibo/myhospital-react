import React, { Component, createRef } from 'react';
import {
  Switch,
  Button,
  Tooltip,
  Space,
  Select as AntSelect,
  Descriptions,
  Typography,
  List,
  Drawer,
  Divider,
  message,
} from 'antd';
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
import { Point, Circle } from 'ol/geom';
import { click } from 'ol/events/condition';
import ContextMenu from 'ol-contextmenu';
import 'ol/ol.css';
import 'ol-contextmenu/dist/ol-contextmenu.css';
import { isArray, isEmpty } from '@/utils/utils';
import styles from './index.less';

const { Option } = AntSelect;
const { Title, Link, Text, Paragraph } = Typography;

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

// 矢量图层（A类医院）
const a19VectorSource = new VectorSource();
const a19VectorLayer = new VectorLayer({
  source: a19VectorSource,
});
a19VectorLayer.set('name', 'a19VectorLayer');

const handleOffset = (index, tag) => {
  let row = 0;
  let idx = index;
  switch (tag) {
    case 'blue':
      if (index > 9) {
        row = 2;
        idx = index - 10;
      } else {
        row = 1;
      }
      break;
    case 'red':
      if (index > 9) {
        row = 4;
        idx = index - 10;
      } else {
        row = 3;
      }
      break;
    case 'yellow':
      row = 5;
      break;
    default:
      idx = 3;
      row = 0;
  }
  return [19 + 88 * idx, 8 + 88 * row];
};

class HospitalMap extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hospital: {},
      hospitalList: [],
      filterLvl: '-',
      filterType: '-',
      visible: false,
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

    this.a19AllFeature = [];
  }

  componentDidMount() {
    // 初始化地图
    this.map = new Map({
      target: this.olRef.current,
      layers: [rasterLayer, vectorLayer, clusterLayer, a19VectorLayer],
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
      this.props.listA19 !== nextProps.listA19 ||
      this.props.total !== nextProps.total ||
      this.state.hospital !== nextStatue.hospital ||
      this.state.hospitalList !== nextStatue.hospitalList ||
      this.state.filterLvl !== nextStatue.filterLvl ||
      this.state.filterType !== nextStatue.filterType ||
      this.state.visible !== nextStatue.visible
    );
  }

  componentDidUpdate() {
    const { list, listA19 } = this.props;
    this.addMarker(list);
    this.addMarkerA19(listA19);
  }

  componentWillUnmount() {
    this.map.setTarget(undefined);
    const { dispatch } = this.props;
    dispatch({
      type: 'hospitalMap/clearList',
    });
    dispatch({
      type: 'hospitalMap/clearListA19',
    });
    dispatch({
      type: 'hospitalMap/clearCount',
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
          type: 'hospitalMap/clearList',
        });
      },
    });
  };

  /**
   * 根据查询到的医院数据添加地图标记
   * @param list
   */
  addMarker = (list) => {
    if (!isArray(list) || isEmpty(list)) {
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

    const featureList = [];
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
      featureList.push(iconFeature);
    });
    markerVectorSource.addFeatures(featureList);
    this.beforeMarkList = [];
  };

  /**
   * 添加A类医院
   * @param list
   */
  addMarkerA19 = (list) => {
    if (!isArray(list) || isEmpty(list)) {
      return;
    }
    const newList = [];
    list
      .filter((item) => !this.a19AllFeature.includes(item.id))
      .forEach((item) => {
        this.a19AllFeature.push(item.id);
        newList.push(item);
      });

    const featureArray = [];
    newList.forEach((item, index) => {
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
      const iconStyle = new Style({
        image: new Icon({
          anchor: [0.5, 0.96],
          size: [44, 64],
          offset: handleOffset(index, 'red'),
          src: 'https://www.amap.com/assets/img/poi-marker.png',
        }),
      });
      iconFeature.setStyle(iconStyle);
      featureArray.push(iconFeature);
    });
    a19VectorSource.addFeatures(featureArray);
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
   * 添加地图交互功能
   */
  addInteractions = () => {
    this.handleDraw();
    this.handleSnap();
    this.handleModify();
    this.handleSelect();
  };

  handleDraw = () => {
    const type = 'Circle';
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
        layerFilter: (layer) => layer.get('name') === 'clusterLayer' || layer.get('name') === 'a19VectorLayer',
      });
      if (!selectedFeature) {
        return;
      }
      // 聚合
      if (Array.isArray(selectedFeature.get('features'))) {
        evt.stopPropagation();
        if (selectedFeature.get('features').length === 1) {
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
      } else {
        evt.stopPropagation();
        this.setState(
          {
            hospital: {
              ...selectedFeature.getProperties(),
            },
          },
          () => {
            const coordinates = selectedFeature.getGeometry().getCoordinates();
            this.map.getOverlayById('popup').setPosition(coordinates);
          },
        );
      }
    });

    this.map.on('pointermove', (e) => {
      if (e.dragging) {
        return;
      }
      const hit = this.map.hasFeatureAtPixel(e.pixel, {
        layerFilter: (layer) =>
          layer.get('name') === 'vectorLayer' ||
          layer.get('name') === 'clusterLayer' ||
          layer.get('name') === 'a19VectorLayer',
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
        const circleFeature = new Feature({
          geometry: new Circle(center, 50),
        });
        circleFeature.setStyle(
          new Style({
            renderer: function renderer(coordinates, state) {
              const coordinates0 = coordinates[0];
              const x = coordinates0[0];
              const y = coordinates0[1];
              const coordinates1 = coordinates[1];
              const x1 = coordinates1[0];
              const y1 = coordinates1[1];
              const ctx = state.context;
              const dx = x1 - x;
              const dy = y1 - y;
              const radius = Math.sqrt(dx * dx + dy * dy);

              const innerRadius = 0;
              const outerRadius = radius * 1.4;

              const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
              gradient.addColorStop(0, 'rgba(255,0,0,0)');
              gradient.addColorStop(0.6, 'rgba(255,0,0,0.2)');
              gradient.addColorStop(1, 'rgba(255,0,0,0.8)');
              ctx.beginPath();
              ctx.arc(x, y, radius, 0, 2 * Math.PI, true);
              ctx.fillStyle = gradient;
              ctx.fill();

              ctx.arc(x, y, radius, 0, 2 * Math.PI, true);
              ctx.strokeStyle = 'rgba(255,0,0,1)';
              ctx.stroke();
            },
          }),
        );

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
        a19VectorSource.addFeature(circleFeature);
        a19VectorSource.addFeature(circle);
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

  handleA19 = (checked) => {
    const { dispatch } = this.props;
    if (checked) {
      dispatch({
        type: 'hospitalMap/fetchA19',
      });
    } else {
      a19VectorSource.clear();
      this.a19AllFeature = [];
      dispatch({
        type: 'hospitalMap/clearListA19',
      });
    }
  };

  handleDrawerShow = () => {
    const { dispatch } = this.props;

    this.setState({
      visible: true,
    });

    dispatch({
      type: 'hospitalMap/fetchCount',
    });
  };

  handleDrawerClose = () => {
    this.setState({
      visible: false,
    });
  };

  render() {
    const { hospital, hospitalList, visible } = this.state;
    const { total, general, specialized, chineseMedicine, community, village, internal } = this.props;
    const { name, code, type, level, address, introduction } = hospital;
    return (
      <main>
        <header>
          <strong className={styles.title}>北京医保定点医院选择助手</strong>
          <span className={styles.a}>
            <Tooltip title="经过北京市医疗保险事务管理中心评选的'尖子生'医院，一年一选，参加医保的人员，可以直接就医，不占用医保名额。">
              <span className={styles.label}>A类医院</span>
            </Tooltip>
            <Switch
              className={styles.switch}
              size="small"
              checkedChildren="显示"
              unCheckedChildren="隐藏"
              onChange={this.handleA19}
            />
          </span>
          <Button type="text" className={styles.help} onClick={this.handleDrawerShow}>
            选择指南
          </Button>
        </header>
        <div ref={this.olRef} style={{ flex: 1 }}>
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
                <Descriptions.Item label="类型">{type}</Descriptions.Item>
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
                <Option value="对外综合">对外综合</Option>
                <Option value="对外专科">对外专科</Option>
                <Option value="对外中医">对外中医</Option>
                <Option value="社区卫生站">社区卫生站</Option>
                <Option value="村卫生室">村卫生室</Option>
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
        <Drawer
          title="北京市医保定点医院选择指北"
          width={600}
          placement="right"
          closable={false}
          onClose={this.handleDrawerClose}
          visible={visible}
        >
          <Typography>
            <Title level={5}>北京有多少家定点医院？</Title>
            <Paragraph>
              <Text mark>{total}</Text>家
            </Paragraph>
            <Divider />

            <Title level={5}>{total}家定点医院分为几类？</Title>
            <Paragraph>
              <ol>
                <li>
                  对外综合 (<Text mark>{general}</Text>) 家
                </li>
                <li>
                  对外专科 (<Text mark>{specialized}</Text>) 家
                </li>
                <li>
                  对外中医 (<Text mark>{chineseMedicine}</Text>) 家
                </li>
                <li>
                  社区卫生站 (<Text mark>{community}</Text>) 家
                </li>
                <li>
                  村卫生室 (<Text mark>{village}</Text>) 家
                </li>
                <li>
                  对内 (<Text mark>{internal}</Text>) 家
                </li>
              </ol>
            </Paragraph>
            <Divider />

            <Title level={5}>我们能从中选几家作为定点医院？</Title>
            <Paragraph>
              <Text mark>4</Text>家
            </Paragraph>
            <Divider />

            <Title level={5}>不用选就能持卡就医的医院有哪些？</Title>
            <Paragraph>A类医院；专科医院；中医医院。</Paragraph>
            <Divider />

            <Title level={5}>我该如何选择定点医院？</Title>
            <Paragraph>
              <ol>
                <li>
                  <Text>就近原则：离家近的，一般选择社区卫生站</Text>
                </li>
                <li>
                  <Text>报销高的：二级医院，技术与报销平衡</Text>
                </li>
                <li>
                  <Text>技术强的：三级医院，注意排除A类医院</Text>
                </li>
                <li>
                  <Text>军队医院：人民群众最后的希望</Text>
                </li>
              </ol>
            </Paragraph>
            <Divider />

            <Title level={5}>定点医院能不能变更？</Title>
            <Paragraph>能，找贵司人力小姐姐帮助变更即可。</Paragraph>
            <Divider />

            <Title level={5}>如何辨别定点医院？</Title>
            <Paragraph>
              <Space direction="vertical">
                <Text>
                  官网：
                  <Link href="http://ybj.beijing.gov.cn/" target="_blank">
                    北京市医疗保障局
                  </Link>
                </Text>
                <Text>
                  官网直达：
                  <Link
                    href="http://ybj.beijing.gov.cn/2020_zwfw/2020_bmcx/202002/t20200217_1644107.html"
                    target="_blank"
                  >
                    北京市定点医院直达
                  </Link>
                </Text>
              </Space>
            </Paragraph>
          </Typography>
        </Drawer>
      </main>
    );
  }
}

export default connect(
  ({
    hospitalMap: { list, listA19, total, general, specialized, chineseMedicine, community, village, internal },
    loading,
  }) => ({
    list,
    listA19,
    total,
    general,
    specialized,
    chineseMedicine,
    community,
    village,
    internal,
    loading: loading.effects['hospitalMap/fetch'],
  }),
)(HospitalMap);
