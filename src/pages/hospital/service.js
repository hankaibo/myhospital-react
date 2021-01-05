import { stringify } from 'qs';
import request from '@/utils/request';

/**
 * 按条件查询医院列表
 * @returns {Promise<void>}
 */
export async function getHospitalList(params) {
  return request(`/hospitals?${stringify(params)}`);
}
