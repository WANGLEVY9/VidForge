import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Modal,
  Form,
  Input,
  message,
  Spin,
  Empty,
} from 'antd';
import { PlusOutlined, FolderOpenOutlined, AppstoreOutlined } from '@ant-design/icons';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { spaceApi } from '../../services/space';

const { Title, Text, Paragraph } = Typography;

export default function WorkspaceListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const spaces = useSpaceStore((s) => s.spaces);
  const loaded = useSpaceStore((s) => s.loaded);
  const loading = useSpaceStore((s) => s.loading);
  const load = useSpaceStore((s) => s.load);
  const setActive = useSpaceStore((s) => s.setActive);
  const upsert = useSpaceStore((s) => s.upsert);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  // 没有任何空间且加载完成 → 默认弹出创建框
  useEffect(() => {
    if (loaded && spaces.length === 0) setCreateOpen(true);
  }, [loaded, spaces.length]);

  const handleEnter = (id: string) => {
    setActive(id);
    navigate(`/workspace/${id}/material`);
  };

  const handleCreate = async (values: any) => {
    setCreating(true);
    try {
      const space = await spaceApi.create({
        name: values.name,
        productName: values.productName,
        category: values.category,
        description: values.description,
      });
      upsert(space);
      setCreateOpen(false);
      form.resetFields();
      message.success('已创建商品空间');
      handleEnter(space.id);
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Title level={3} style={{ color: 'var(--text-primary)', margin: 0 }}>
            商品空间
          </Title>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
            {user?.username
              ? `${user.username}，每个商品一个独立的素材库 / 剧本 / 视频任务空间`
              : '每个商品一个独立的素材库 / 剧本 / 视频任务空间'}
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setCreateOpen(true)}
        >
          新建空间
        </Button>
      </div>

      {loading && !loaded && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      )}

      {loaded && spaces.length === 0 && !createOpen && (
        <GlassPanel variant="card" style={{ padding: 60, textAlign: 'center' }}>
          <Empty
            image={
              <div style={{ fontSize: 64, color: 'var(--text-tertiary)' }}>
                <AppstoreOutlined />
              </div>
            }
            description={
              <div>
                <Title level={5} style={{ color: 'var(--text-secondary)' }}>
                  还没有商品空间
                </Title>
                <Paragraph type="secondary" style={{ maxWidth: 360, margin: '0 auto' }}>
                  创建第一个空间开始你的 AI 视频创作之旅
                </Paragraph>
              </div>
            }
          >
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              创建第一个空间
            </Button>
          </Empty>
        </GlassPanel>
      )}

      {loaded && spaces.length > 0 && (
        <Row gutter={[16, 16]}>
          {spaces.map((space) => (
            <Col xs={24} sm={12} lg={8} key={space.id}>
              <GlassPanel
                variant="card"
                className="hover-lift"
                style={{ padding: 24, cursor: 'pointer', height: '100%' }}
                onClick={() => handleEnter(space.id)}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 'var(--radius-md)',
                      background:
                        'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.18) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-primary)',
                      fontSize: 22,
                    }}
                  >
                    <FolderOpenOutlined />
                  </div>
                  {space.isDefault && <Tag color="cyan">默认</Tag>}
                </div>
                <Text
                  strong
                  style={{
                    fontSize: 16,
                    color: 'var(--text-primary)',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  {space.name}
                </Text>
                {space.productName && (
                  <Text style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block' }}>
                    商品：{space.productName}
                  </Text>
                )}
                {space.description && (
                  <Paragraph
                    style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}
                    ellipsis={{ rows: 2 }}
                  >
                    {space.description}
                  </Paragraph>
                )}
                <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-tertiary)' }}>
                  创建于 {new Date(space.createdAt).toLocaleDateString()}
                </div>
              </GlassPanel>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title="新建商品空间"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="name"
            label="空间名称"
            rules={[
              { required: true, message: '请输入空间名称' },
              { max: 40, message: '最多 40 字' },
            ]}
          >
            <Input placeholder="例如：夏季防晒霜推广" />
          </Form.Item>
          <Form.Item name="productName" label="主推商品（选填）">
            <Input placeholder="例如：清爽防晒霜 SPF50+" />
          </Form.Item>
          <Form.Item name="category" label="商品类目（选填）">
            <Input placeholder="例如：美妆护肤" />
          </Form.Item>
          <Form.Item
            name="description"
            label="备注说明（选填）"
            rules={[{ max: 280, message: '最多 280 字' }]}
          >
            <Input.TextArea rows={3} placeholder="一句话描述这个空间的用途" />
          </Form.Item>
          <Space>
            <Button onClick={() => setCreateOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={creating}>
              创建并进入
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
