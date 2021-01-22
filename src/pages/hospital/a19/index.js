import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Button, Popconfirm, Divider, message } from 'antd';
import { PageContainer } from '@ant-design/pro-layout';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { connect, Link } from 'umi';
import Authorized from '@/utils/Authorized';
import RenderPropsModal from '@/components/RenderModal';
import { getValue } from '@/utils/utils';
import HospitalForm from './components/A19Form';

const HospitalA19 = connect(({ hospital: { list, pagination }, loading }) => ({
  list,
  pagination,
  loading: loading.effects['hospitalA19/fetch'],
}))(({ loading, list, pagination, dispatch }) => {
  // 【复选框状态属性与函数】
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  // 列表参数
  const [params, setParams] = useState({
    current: pagination.current || 1,
    pageSize: pagination.pageSize || 10,
    name: '',
  });

  // 【查询医院列表】
  useEffect(() => {
    dispatch({
      type: 'hospitalA19/fetch',
      payload: {
        ...params,
      },
    });
    return () => {
      dispatch({
        type: 'hospitalA19/clearList',
      });
    };
  }, [params, dispatch]);

  // 【搜索】
  const handleFormSubmit = (value) => {
    setParams({
      ...params,
      name: value,
    });
  };

  // 【批量删除医院】
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return;
    dispatch({
      type: 'hospitalA19/deleteBatch',
      payload: {
        idList: selectedRowKeys,
      },
      callback: () => {
        setSelectedRowKeys([]);
        message.success('批量删除A类医院成功。');
      },
    });
  };

  // 【删除医院】
  const handleDelete = (record) => {
    const { id } = record;
    dispatch({
      type: 'hospitalA19/delete',
      payload: {
        id,
      },
      callback: () => {
        setSelectedRowKeys([]);
        message.success('删除A类医院成功。');
      },
    });
  };

  // 【复选框相关操作】
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => {
      setSelectedRowKeys(keys);
    },
  };

  // 【分页、过滤医院】
  const handleTableChange = (page, filtersArg) => {
    const filters = Object.keys(filtersArg).reduce((obj, key) => {
      const newObj = { ...obj };
      newObj[key] = getValue(filtersArg[key]);
      return newObj;
    }, {});

    const { current, pageSize } = page;
    setParams({
      ...params,
      current,
      pageSize,
      ...filters,
    });
  };

  // 【全页搜索框】
  const mainSearch = (
    <div style={{ textAlign: 'center' }}>
      <Input.Search
        placeholder="请输入医院名称。"
        enterButton
        size="large"
        onSearch={handleFormSubmit}
        style={{ maxWidth: 522, width: '100%' }}
      />
    </div>
  );

  // 【表格列】
  const columns = [
    {
      title: '医院名称',
      dataIndex: 'name',
    },
    {
      title: '医院编码',
      dataIndex: 'code',
    },
    {
      title: '所属区县',
      dataIndex: 'district',
    },
    {
      title: '医院类别',
      dataIndex: 'type',
    },
    {
      title: '医院等级',
      dataIndex: 'lvl',
    },
    {
      title: '医院地址',
      dataIndex: 'address',
    },
    {
      title: '操作',
      align: 'center',
      fixed: 'right',
      render: (text, record) => (
        <>
          <Authorized authority="hospital:update" noMatch={null}>
            <RenderPropsModal>
              {({ showModalHandler, Modal }) => (
                <>
                  <EditOutlined title="编辑" className="icon" onClick={showModalHandler} />
                  <Modal title="编辑">
                    <HospitalForm isEdit id={record.id} />
                  </Modal>
                </>
              )}
            </RenderPropsModal>
            <Divider type="vertical" />
          </Authorized>
          <Authorized authority="hospital:delete" noMatch={null}>
            <Popconfirm
              title="您确定要删除该医院吗？"
              onConfirm={() => handleDelete(record)}
              okText="确定"
              cancelText="取消"
            >
              <DeleteOutlined title="删除" className="icon" />
            </Popconfirm>
            <Divider type="vertical" />
          </Authorized>
        </>
      ),
    },
  ];

  return (
    <PageContainer title={false} content={mainSearch}>
      <Card title="医保A类医院" bordered={false} style={{ marginTop: 10 }} bodyStyle={{ padding: '15px' }}>
        <div className="tableList">
          <div className="tableListOperator">
            <Authorized authority="hospital:add" noMatch={null}>
              <RenderPropsModal>
                {({ showModalHandler, Modal }) => (
                  <>
                    <Button type="primary" title="新增" onClick={showModalHandler}>
                      <PlusOutlined />
                    </Button>
                    <Modal title="新增">
                      <HospitalForm />
                    </Modal>
                  </>
                )}
              </RenderPropsModal>
            </Authorized>
            <Authorized authority="hospital:batchDelete" noMatch={null}>
              <Popconfirm
                title="您确定要删除这些医院吗？"
                onConfirm={handleBatchDelete}
                okText="确定"
                cancelText="取消"
                disabled={selectedRowKeys.length <= 0}
              >
                <Button type="danger" disabled={selectedRowKeys.length <= 0} title="删除">
                  <DeleteOutlined />
                </Button>
              </Popconfirm>
            </Authorized>
            <Link to="/hospital/map">
              <Button type="primary">进入地图</Button>
            </Link>
          </div>
          <Table
            rowKey="id"
            bordered
            loading={loading}
            columns={columns}
            dataSource={list}
            pagination={{ ...pagination, showTotal: (total) => `Total ${total} items` }}
            rowSelection={rowSelection}
            onChange={handleTableChange}
            scroll={{ x: true }}
          />
        </div>
      </Card>
    </PageContainer>
  );
});

export default HospitalA19;
