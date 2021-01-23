import React, { useState, useEffect } from 'react';
import { Transfer, Button, message } from 'antd';
import { connect } from 'umi';

const AddForm = connect(({ hospitalA19: { allList, list }, loading }) => ({
  allList,
  list,
  loading: loading.effects['hospitalA19/fetch'] || loading.effects['hospitalA19/fetchAll'],
}))(({ loading, allList, list, closeModal, dispatch }) => {
  const [selectedList, setSelectedList] = useState(list.map((item) => item.id));
  // 【获取全部数据】
  useEffect(() => {
    dispatch({
      type: 'hospitalA19/fetchAll',
      payload: {
        current: 1,
        pageSize: 3000,
      },
    });
    return () => {
      dispatch({
        type: 'hospitalA19/clearAllList',
      });
    };
  }, [dispatch]);

  const handleChange = (targetKeys) => {
    setSelectedList(targetKeys);
  };

  // 【添加】
  const handleAdd = () => {
    dispatch({
      type: 'hospitalA19/add',
      payload: [...selectedList],
      callback: () => {
        closeModal();
        message.success('添加医院成功。');
      },
    });
  };

  return (
    <>
      <Transfer
        rowKey={(record) => record.id}
        dataSource={allList}
        showSearch
        listStyle={{
          width: 500,
          height: 460,
        }}
        targetKeys={selectedList}
        onChange={handleChange}
        render={(item) => item.name}
        pagination
      />
      <Button
        type="primary"
        style={{ marginTop: '10px' }}
        onClick={handleAdd}
        loading={loading}
        disabled={selectedList.length === 0}
      >
        确定
      </Button>
    </>
  );
});

export default AddForm;
