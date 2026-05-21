import { useState, useEffect } from 'react';
import { Row, Col, Input, Select, Space, Pagination, Spin, Empty, Modal, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import MaterialUpload from '@/components/MaterialUpload';
import MaterialCard from '@/components/MaterialCard';
import { getMaterialList, Material as MaterialType } from '@/api/material';
import { MaterialType as MaterialTypeEnum } from '@/types/material';

const { Option } = Select;

const MaterialPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<MaterialType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [type, setType] = useState<MaterialTypeEnum | undefined>();
  const [keyword, setKeyword] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<MaterialType | null>(null);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await getMaterialList({
        page,
        pageSize,
        type,
        keyword,
      });
      setMaterials(res.list);
      setTotal(res.total);
    } catch (error) {
      message.error('获取素材列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [page, pageSize, type, keyword]);

  const handleSearch = () => {
    setPage(1);
    fetchMaterials();
  };

  const handleUploadSuccess = () => {
    fetchMaterials();
  };

  const handleDelete = () => {
    fetchMaterials();
  };

  const handlePreview = (material: MaterialType) => {
    setPreviewMaterial(material);
    setPreviewVisible(true);
  };

  const renderPreviewContent = () => {
    if (!previewMaterial) return null;
    if (previewMaterial.type === MaterialTypeEnum.IMAGE) {
      return <img src={previewMaterial.url} alt={previewMaterial.name} style={{ maxWidth: '100%', maxHeight: '70vh' }} />;
    }
    if (previewMaterial.type === MaterialTypeEnum.VIDEO) {
      return <video src={previewMaterial.url} controls style={{ maxWidth: '100%', maxHeight: '70vh' }} />;
    }
    return <audio src={previewMaterial.url} controls style={{ width: '100%' }} />;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space size="large">
          <Input
            placeholder="搜索素材名称/标签"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Select
            placeholder="素材类型"
            style={{ width: 150 }}
            value={type}
            onChange={(value) => setType(value)}
            allowClear
          >
            <Option value={MaterialTypeEnum.IMAGE}>图片</Option>
            <Option value={MaterialTypeEnum.VIDEO}>视频</Option>
            <Option value={MaterialTypeEnum.AUDIO}>音频</Option>
          </Select>
        </Space>
        <MaterialUpload onSuccess={handleUploadSuccess} />
      </div>

      <Spin spinning={loading}>
        {materials.length > 0 ? (
          <>
            <Row gutter={[16, 16]}>
              {materials.map((material) => (
                <Col xs={24} sm={12} md={8} lg={6} xl={4} key={material.id}>
                  <MaterialCard
                    material={material}
                    onDelete={handleDelete}
                    onPreview={() => handlePreview(material)}
                  />
                </Col>
              ))}
            </Row>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                showTotal={(total) => `共 ${total} 个素材`}
                onChange={(p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                }}
              />
            </div>
          </>
        ) : (
          <Empty description="暂无素材，点击右上角按钮上传" />
        )}
      </Spin>

      <Modal
        title="素材预览"
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="auto"
      >
        {renderPreviewContent()}
      </Modal>
    </div>
  );
};

export default MaterialPage;
