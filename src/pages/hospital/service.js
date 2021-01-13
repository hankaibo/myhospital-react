import { stringify } from 'qs';
import request from '@/utils/request';

/**
 * 按条件查询医院列表数据。
 * @param params
 * @returns {Promise<void>}
 */
export async function pageHospital(params) {
  return request(`/hospitals?${stringify(params)}`);
}

/**
 * 添加医院。
 * @param params
 * @returns {Promise<void>}
 */
export async function addHospital(params) {
  return request.post('/hospitals', {
    data: {
      ...params,
    },
  });
}

/**
 * 按主键查询一条医院数据。
 * @param id
 * @returns {Promise<void>}
 */
export async function getHospitalById(id) {
  return request(`/hospitals/${id}`);
}

/**
 * 更新医院。
 * @param params
 * @returns {Promise<void>}
 */
export async function updateHospital(params) {
  const { id } = params;
  return request.put(`/hospitals/${id}`, {
    data: {
      ...params,
    },
  });
}

/**
 * 删除医院。
 * @param id
 * @returns {Promise<void>}
 */
export async function deleteHospital(id) {
  return request.delete(`/hospitals/${id}`);
}

/**
 * 批量删除医院。
 * @param params
 * @returns {Promise<void>}
 */
export async function deleteBatchHospital(params) {
  return request.delete('/hospitals', {
    data: {
      ...params,
    },
  });
}

/**
 * 获取圆内的医院
 * @param params
 * @returns {Promise<void>}
 */
export async function circleHospital(params) {
  return request.get(`/hospitals/nearby/circle?${stringify(params)}`);
}
