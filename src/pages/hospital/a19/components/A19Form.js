import React, { useEffect } from 'react';
import { Form, message } from 'antd';
import { connect } from 'umi';
import { isEmpty } from '@/utils/utils';
import HospitalForm from '@/pages/hospital/components/HospitalForm';

const A19Form = connect(({ hospital: { hospital }, loading }) => ({
  hospital,
  loading: loading.effects['hospitalA19/fetchById'] || loading.effects['hospitalA19/update'],
}))(({ loading, isEdit, id, hospital, closeModal, dispatch }) => {
  const [form] = Form.useForm();
  const { setFieldsValue, resetFields } = form;

  // 【修改时，获取医院表单数据】
  useEffect(() => {
    if (isEdit) {
      dispatch({
        type: 'hospitalA19/fetchById',
        payload: {
          id,
        },
      });
    }
    return () => {
      if (isEdit) {
        dispatch({
          type: 'hospitalA19/clear',
        });
      }
    };
  }, [isEdit, id, dispatch]);

  // 【修改时，回显医院表单】
  useEffect(() => {
    // 👍 将条件判断放置在 effect 中
    if (isEdit) {
      if (!isEmpty(hospital)) {
        setFieldsValue(hospital);
      }
    }
  }, [isEdit, hospital, setFieldsValue]);

  // 【添加与修改】
  const handleUpdate = (values) => {
    dispatch({
      type: 'hospitalA19/update',
      payload: {
        ...values,
        id,
      },
      callback: () => {
        resetFields();
        closeModal();
        message.success('修改医院成功。');
      },
    });
  };

  return <HospitalForm loading={loading} form={form} onFinish={handleUpdate} closeModal={closeModal} />;
});

export default A19Form;
