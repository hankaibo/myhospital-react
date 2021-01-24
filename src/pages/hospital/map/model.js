import { circleHospital, listHospitalA19, countHospital } from './service';

const formatData = (list) => {
  let total = 0;
  let general;
  let specialized;
  let chineseMedicine;
  let community;
  let village;
  let internal;
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i];
    switch (item.type) {
      case '对内':
        internal = item.count;
        total += internal;
        break;
      case '对外专科':
        specialized = item.count;
        total += specialized;
        break;
      case '对外中医':
        chineseMedicine = item.count;
        total += chineseMedicine;
        break;
      case '对外综合':
        general = item.count;
        total += general;
        break;
      case '村卫生室':
        village = item.count;
        total += village;
        break;
      case '社区卫生站':
        community = item.count;
        total += community;
        break;
      default:
        break;
    }
  }
  return [total, general, specialized, chineseMedicine, community, village, internal];
};

export default {
  namespace: 'hospitalMap',

  state: {
    // 地图数据
    list: [],
    // A类医院
    listA19: [],
    // 医院各类别数量
    total: 0,
    general: 0,
    specialized: 0,
    chineseMedicine: 0,
    community: 0,
    village: 0,
    internal: 0,
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
        type: 'saveList',
        payload: {
          list: response,
        },
      });
      if (callback) callback();
    },
    *fetchA19({ callback }, { call, put }) {
      const response = yield call(listHospitalA19);
      const { apierror } = response;
      if (apierror) {
        return;
      }
      yield put({
        type: 'saveListA19',
        payload: {
          listA19: response,
        },
      });
      if (callback) callback();
    },
    *fetchCount({ callback }, { call, put, select }) {
      const total = yield select((state) => state.hospitalMap.total);
      if (total !== 0) {
        return;
      }
      const response = yield call(countHospital);
      const { apierror } = response;
      if (apierror) {
        return;
      }
      yield put({
        type: 'saveCount',
        payload: {
          response,
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
    saveListA19(state, { payload }) {
      const { listA19 } = payload;
      return {
        ...state,
        listA19,
      };
    },
    clearListA19(state) {
      return {
        ...state,
        listA19: [],
      };
    },
    saveCount(state, { payload }) {
      const { response } = payload;
      const [total, general, specialized, chineseMedicine, community, village, internal] = formatData(response);
      return {
        ...state,
        total,
        general,
        specialized,
        chineseMedicine,
        community,
        village,
        internal,
      };
    },
    clearCount(state) {
      return {
        ...state,
        total: 0,
        general: 0,
        specialized: 0,
        chineseMedicine: 0,
        community: 0,
        village: 0,
        internal: 0,
      };
    },
  },
};
