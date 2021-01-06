// 代码中会兼容本地 service mock 以及部署站点的静态数据
export default {
  // 支持值为 Object 和 Array
  'GET /api/v1/hospitals': {
    list: [
      { id: 1, name: '北京1', lngLat: [116.407526, 39.90403] },
      { id: 2, name: '北京22', lngLat: [116.518097, 39.764168] },
      { id: 3, name: '北京333', lngLat: [115.844236, 40.476927] },
      { id: 4, name: '北京4444', lngLat: [116.045473, 40.48194] },
      { id: 5, name: '北京55555', lngLat: [116.16295, 40.529043] },
      { id: 6, name: '北京6666', lngLat: [115.844236, 40.476927] },
      { id: 7, name: '北京777', lngLat: [116.22604, 40.567708] },
      { id: 8, name: '北京88', lngLat: [116.08733, 40.550988] },
    ],
  },
};
