import {
  listHospital,
  pageHospital,
  addHospital,
  getHospitalById,
  updateHospital,
  deleteHospital,
  deleteBatchHospital,
} from './service';

const formatLngLat = (value) => {
  const { lngLat, ...rest } = value;
  if (Array.isArray(lngLat) && lngLat.length === 2) {
    return { ...rest, lng: lngLat[0], lat: lngLat[1] };
  }
  return value;
};

export default {
  namespace: 'hospitalA19',

  state: {
    // 全部
    allList: [],
    allPagination: {},
    // 列表
    list: [],
    pagination: {},
    // 编辑
    hospital: {},
    // 过滤参数
    filter: {},
  },

  effects: {
    *fetchAll({ payload, callback }, { call, put }) {
      const response = yield call(listHospital, payload);
      const { apierror } = response;
      if (apierror) {
        return;
      }
      const { list, pageNum: current, pageSize, total } = response;
      yield put({
        type: 'saveAllList',
        payload: {
          allList: list,
          allPagination: { current, pageSize, total },
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
      const response = yield call(addHospital, payload);
      const { apierror } = response;
      if (apierror) {
        return;
      }
      const filter = yield select((state) => state.hospitalA19.filter);
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
      const { lng, lat } = response;
      yield put({
        type: 'save',
        payload: {
          hospital: {
            ...response,
            lngLat: [lng, lat],
          },
        },
      });
      if (callback) callback();
    },
    *update({ payload, callback }, { call, put, select }) {
      const values = formatLngLat(payload);
      const response = yield call(updateHospital, values);
      const { apierror } = response;
      if (apierror) {
        return;
      }
      const filter = yield select((state) => state.hospitalA19.filter);
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
      const filter = yield select((state) => state.hospitalA19.filter);
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
      const filter = yield select((state) => state.hospitalA19.filter);
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
    saveAllList(state, { payload }) {
      const { allList, allPagination } = payload;
      return {
        ...state,
        allList,
        allPagination,
      };
    },
    clearAllList(state) {
      return {
        ...state,
        allList: [],
        allPagination: {},
      };
    },
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
