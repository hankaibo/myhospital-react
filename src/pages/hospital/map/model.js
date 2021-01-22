import { circleHospital } from './service';

export default {
  namespace: 'hospitalMap',

  state: {
    // 地图数据
    mapData: [],
  },

  effects: {
    *fetch({ payload, callback }, { call, put }) {
      const { center, radius } = payload;
      const params = {
        lng: center[0],
        lat: center[1],
        r: radius,
      };
      const response = yield call(circleHospital, params);
      const { apierror } = response;
      if (apierror) {
        return;
      }
      yield put({
        type: 'saveMap',
        payload: {
          mapData: response,
        },
      });
      if (callback) callback();
    },
  },

  reducers: {
    saveMap(state, { payload }) {
      const { mapData } = payload;
      return {
        ...state,
        mapData,
      };
    },
    clearMap(state) {
      return {
        ...state,
        mapData: [],
      };
    },
  },
};
