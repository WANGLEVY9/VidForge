import { useEffect, useState, useCallback } from 'react';
import { Modal, Card, Empty, Tag, Typography, Space, Spin, message } from 'antd';
import { AppstoreOutlined, DeleteOutlined } from '@ant-design/icons';
import { templateApi, Template } from '@/services/template';

const { Text } = Typography;

interface TemplateBrowserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: Template) => void;
  filterCategory?: string;
  filterStyle?: string;
}

export function TemplateBrowser({
  open,
  onClose,
  onSelect,
  filterCategory,
  filterStyle,
}: TemplateBrowserProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await templateApi.getList({ category: filterCategory, style: filterStyle });
      setTemplates(data);
    } catch {
      message.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStyle]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await templateApi.remove(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      message.success('已删除');
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <Modal
      title={
        <>
          <AppstoreOutlined /> 我的模板
        </>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : templates.length === 0 ? (
        <Empty description="暂无模板，可在 A/B 对比页面保存" />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginTop: 16,
            maxHeight: 480,
            overflowY: 'auto',
          }}
        >
          {templates.map((t) => (
            <Card
              key={t.id}
              hoverable
              size="small"
              onClick={() => onSelect(t)}
              extra={
                <DeleteOutlined
                  style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }}
                  onClick={(e) => handleDelete(t.id, e)}
                />
              }
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <Text strong>{t.name}</Text>
                  <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <Tag>{t.category}</Tag>
                    <Tag>{t.style}</Tag>
                    <Tag>{t.shots.length} 分镜</Tag>
                  </div>
                </div>
                <Space direction="vertical" align="end" size={2}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t.duration}s
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </Text>
                </Space>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
}
