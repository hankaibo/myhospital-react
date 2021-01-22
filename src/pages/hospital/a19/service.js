import { stringify } from 'qs';
import request from '@/utils/request';

/**
 * 按条件查询医院A类医院列表数据。
 * @param params
 * @returns {Promise<void>}
 */
export async function pageHospital(params) {
  return request(`/hospitals/a19/?${stringify(params)}`);
}

/**
 * 添加A类医院。
 * @param id
 * @returns {Promise<void>}
 */
export async function addHospital(id) {
  return request.post(`/hospitals/a19/${id}`);
}

/**
 * 按主键查询一条A类医院数据。
 * @param id
 * @returns {Promise<void>}
 */
export async function getHospitalById(id) {
  return request(`/hospitals/a19/${id}`);
}

/**
 * 更新A类医院。
 * @param id
 * @returns {Promise<void>}
 */
export async function updateHospital(id) {
  return request.put(`/hospitals/a19/${id}`);
}

/**
 * 删除A类医院。
 * @param id
 * @returns {Promise<void>}
 */
export async function deleteHospital(id) {
  return request.delete(`/hospitals/a19/${id}`);
}

/**
 * 批量删除A类医院。
 * @param params
 * @returns {Promise<void>}
 */
export async function deleteBatchHospital(params) {
  return request.delete('/hospitals/a19', {
    data: {
      ...params,
    },
  });
}
