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
