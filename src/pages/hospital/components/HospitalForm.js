import React from 'react';
import { Form, Input, Select, Button } from 'antd';
import InputLngLat from './InputLngLat';

const { Option } = Select;

const HospitalForm = ({ loading, form, onFinish, closeModal }) => {
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
    <Form {...layout} form={form} name="hospitalForm" className="form" onFinish={onFinish}>
      <Form.Item label="名称" name="name" rules={[{ required: true }, { max: 255 }]}>
        <Input />
      </Form.Item>
      <Form.Item label="编码" name="code" rules={[{ required: true }, { max: 10 }]}>
        <Input />
      </Form.Item>
      <Form.Item label="所属区县" name="district" rules={[{ required: true }, { max: 255 }]}>
        <Input />
      </Form.Item>
      <Form.Item label="类别" name="type" rules={[{ required: true }]}>
        <Select>
          <Option value="A类医院">A类医院</Option>
          <Option value="对外综合">对外综合</Option>
          <Option value="对外专科">对外专科</Option>
          <Option value="对外中医">对外中医</Option>
          <Option value="社区卫生站">社区卫生站</Option>
          <Option value="对内">对内</Option>
        </Select>
      </Form.Item>
      <Form.Item label="等级" name="level" rules={[{ required: true }]}>
        <Select>
          <Option value="三级">三级</Option>
          <Option value="二级">二级</Option>
          <Option value="一级">一级</Option>
          <Option value="未评级">未评级</Option>
        </Select>
      </Form.Item>
      <Form.Item label="地址" name="address" rules={[{ max: 255 }]}>
        <Input />
      </Form.Item>
      <Form.Item label="邮编" name="postalCode" rules={[{ max: 6 }]}>
        <Input />
      </Form.Item>
      <Form.Item label="简介" name="introduction" rules={[{ max: 255 }]}>
        <Input.TextArea placeholder="请输入简介。" autoSize={{ minRows: 3, maxRows: 6 }} />
      </Form.Item>
      <Form.Item label="经纬度" name="lngLat" rules={[{ required: true }]}>
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
};

export default HospitalForm;
