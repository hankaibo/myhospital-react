import React, { useState } from 'react';
import { Input, Modal } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import LngLatMap from './LngLatMap';

const InputLngLat = ({ value, onChange }) => {
  const [visible, setVisible] = useState(false);

  const showModalHandler = (e) => {
    if (e) e.stopPropagation();
    setVisible(true);
  };

  const hideModelHandler = () => {
    setVisible(false);
  };

  const handleChange = (lonLat) => {
    hideModelHandler();
    onChange(lonLat.toString());
  };

  return (
    <span>
      <Input
        type="text"
        value={value}
        onClick={showModalHandler}
        onChange={onChange}
        addonAfter={<EnvironmentOutlined />}
        defaultValue="插入坐标"
      />
      {visible && (
        <Modal width={1000} destroyOnClose visible={visible} footer={null} onCancel={hideModelHandler}>
          <LngLatMap onSelect={handleChange} />
        </Modal>
      )}
    </span>
  );
};
export default InputLngLat;
