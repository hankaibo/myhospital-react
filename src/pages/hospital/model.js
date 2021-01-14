import {
  pageHospital,
  addHospital,
  getHospitalById,
  updateHospital,
  deleteHospital,
  deleteBatchHospital,
  circleHospital,
} from './service';

export default {
  namespace: 'hospital',

  state: {
    // 列表
    list: [],
    pagination: {},
    // 编辑
    hospital: {},
    // 过滤参数
    filter: {},
    // 地图数据
    mapData: [],
  },

  effects: {
    *fetchMap({ payload, callback }, { call, put }) {
      const { center, radius } = payload;
      const params = {
        lng: center[0],
        lat: center[1],
        r: radius,
        limit: 20,
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
    *fetch({ payload, callback }, { call, put }) {
      yield put({
        type: 'saveFilter',
        payload: {
          ...payload,
        },
      });
      const response = yield call(pageHospital, payload);
      const { apierror } = response;
      if (apierror) {
        return;
      }
      const { list, pageNum: current, pageSize, total } = response;
      yield put({
        type: 'saveList',
        payload: {
          list,
          pagination: { current, pageSize, total },
        },
      });
      if (callback) callback();
    },
    *add({ payload, callback }, { call, put, select }) {
      const values = { ...payload };
      const response = yield call(addHospital, values);
      const { apierror } = response;
      if (apierror) {
        return;
      }
      const filter = yield select((state) => state.hospital.filter);
      yield put({
        type: 'fetch',
        payload: {
          ...filter,
          current: 1,
        },
      });
      if (callback) callback();
    },
    *fetchById({ payload, callback }, { call, put }) {
      const { id } = payload;
      const response = yield call(getHospitalById, id);
      const { apierror } = response;
      if (apierror) {
        return;
      }
      yield put({
        type: 'save',
        payload: {
          hospital: response,
        },
      });
      if (callback) callback();
    },
    *update({ payload, callback }, { call, put, select }) {
      const values = { ...payload };
      const response = yield call(updateHospital, values);
      const { apierror } = response;
      if (apierror) {
        return;
      }
      const filter = yield select((state) => state.hospital.filter);
      yield put({
        type: 'fetch',
        payload: {
          ...filter,
        },
      });
      if (callback) callback();
    },
    *delete({ payload, callback }, { call, put, select }) {
      const { id } = payload;
      const response = yield call(deleteHospital, id);
      const { apierror } = response;
      if (apierror) {
        return;
      }
      const filter = yield select((state) => state.hospital.filter);
      yield put({
        type: 'fetch',
        payload: {
          ...filter,
        },
      });
      if (callback) callback();
    },
    *deleteBatch({ payload, callback }, { call, put, select }) {
      const response = yield call(deleteBatchHospital, payload);
      const { apierror } = response;
      if (apierror) {
        return;
      }
      const filter = yield select((state) => state.hospital.filter);
      yield put({
        type: 'fetch',
        payload: {
          ...filter,
        },
      });
      if (callback) callback();
    },
  },

  reducers: {
    saveFilter(state, { payload }) {
      return {
        ...state,
        filter: {
          ...payload,
        },
      };
    },
    saveList(state, { payload }) {
      const { list, pagination } = payload;
      return {
        ...state,
        list,
        pagination,
      };
    },
    clearList(state) {
      return {
        ...state,
        list: [],
        pagination: {},
        filter: {},
      };
    },
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
    save(state, { payload }) {
      const { hospital } = payload;
      return {
        ...state,
        hospital,
      };
    },
    clear(state) {
      return {
        ...state,
        hospital: {},
      };
    },
  },
};
