import React, { useEffect } from 'react';
import { Form, Input, Button, message } from 'antd';
import { connect } from 'umi';
import { isEmpty } from '@/utils/utils';
import InputLngLat from './InputLngLat';

const HospitalForm = connect(({ hospital: { hospital }, loading }) => ({
  hospital,
  loading:
    loading.effects['hospital/fetchById'] || loading.effects['hospital/add'] || loading.effects['hospital/update'],
}))(({ loading, isEdit, id, hospital, closeModal, dispatch }) => {
  const [form] = Form.useForm();
  const { setFieldsValue, resetFields } = form;

  // 【修改时，获取医院表单数据】
  useEffect(() => {
    if (isEdit) {
      dispatch({
        type: 'hospital/fetchById',
        payload: {
          id,
        },
      });
    }
    return () => {
      if (isEdit) {
        dispatch({
          type: 'hospital/clear',
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
  const handleAddOrUpdate = (values) => {
    if (isEdit) {
      dispatch({
        type: 'hospital/update',
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
    } else {
      dispatch({
        type: 'hospital/add',
        payload: {
          ...values,
        },
        callback: () => {
          resetFields();
          closeModal();
          message.success('添加医院成功。');
        },
      });
    }
  };

  // 【表单布局】
  const layout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 5 },
    },
    wrapperCol: {
      xs: { span: 24 },
      sm: { span: 19 },
    },
  };
  const tailLayout = {
    wrapperCol: {
      xs: { span: 24, offset: 0 },
      sm: { span: 19, offset: 5 },
    },
  };

  return (
    <Form {...layout} form={form} name="hospitalForm" className="form" onFinish={handleAddOrUpdate}>
      <Form.Item
        label="名称"
        name="name"
        rules={[
          {
            required: true,
            message: '请将名称长度保持在1至255字符之间！',
            min: 1,
            max: 255,
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item label="编码" name="code" rules={[{ message: '请将编码长度保持在1至10字符之间！', min: 1, max: 10 }]}>
        <Input />
      </Form.Item>
      <Form.Item
        label="所属区县"
        name="district"
        rules={[{ message: '请将区县长度保持在1至255字符之间！', min: 1, max: 255 }]}
      >
        <Input />
      </Form.Item>
      <Form.Item label="类别" name="type" rules={[{ message: '请将类别长度保持在1至255字符之间！', min: 1, max: 255 }]}>
        <Input />
      </Form.Item>
      <Form.Item label="等级" name="lvl" rules={[{ message: '请将等级长度保持在1至255字符之间！', min: 1, max: 255 }]}>
        <Input />
      </Form.Item>
      <Form.Item
        label="地址"
        name="address"
        rules={[{ message: '请将地址长度保持在1至255字符之间！', min: 1, max: 255 }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="邮编"
        name="zipCode"
        rules={[{ message: '请将邮编长度保持在1至10字符之间！', min: 1, max: 10 }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="简介"
        name="introduction"
        rules={[{ message: '请将简介长度保持在1至255字符之间！', min: 1, max: 255 }]}
      >
        <Input.TextArea placeholder="请输入简介。" autoSize={{ minRows: 3, maxRows: 6 }} />
      </Form.Item>
      <Form.Item label="经纬度" name="lngLat">
        <InputLngLat />
      </Form.Item>
      <Form.Item {...tailLayout}>
        <Button onClick={closeModal}>取消</Button>
        <Button type="primary" loading={loading} htmlType="submit">
          确定
        </Button>
      </Form.Item>
    </Form>
  );
});

export default HospitalForm;
