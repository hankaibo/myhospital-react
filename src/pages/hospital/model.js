import { getHospitalList } from './service';

export default {
  namespace: 'hospital',

  state: {
    // 列表
    list: [],
  },

  effects: {
    *fetch({ payload, callback }, { call, put }) {
      const response = yield call(getHospitalList, payload);
      const { apierror } = response;
      if (apierror) {
        return;
      }
      const { list } = response;
      yield put({
        type: 'saveList',
        payload: {
          list,
        },
      });
      if (callback) callback();
    },
  },

  reducers: {
    saveList(state, { payload }) {
      const { list } = payload;
      return {
        ...state,
        list,
      };
    },
    clearList(state) {
      return {
        ...state,
        list: [],
      };
    },
  },
};
