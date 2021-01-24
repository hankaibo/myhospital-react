import { stringify } from 'qs';
import request from '@/utils/request';

/**
 * 获取圆内的医院
 * @param params
 * @returns {Promise<void>}
 */
export async function circleHospital(params) {
  return request.get(`/hospitals/map/circle?${stringify(params)}`);
}

/**
 * 获取A类医院
 * @returns {Promise<*>}
 */
export async function listHospitalA19() {
  return request.get('/hospitals/map/a19');
}

/**
 * 分类统计医院数量
 * @returns {Promise<*>}
 */
export async function countHospital() {
  return request.get('/hospitals/map/type');
}
