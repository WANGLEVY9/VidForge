import React, { useState, useEffect } from 'react';
import { Button, Popover, Input, List, Typography, Space, Spin, Tag } from 'antd';
import { PictureOutlined, SearchOutlined } from '@ant-design/icons';
import { materialApi, MaterialItem } from '../../services/material';

const { Text } = Typography;

interface MaterialSelectorProps {
  selectedId?: string;
  onSelect: (material: MaterialItem) => void;
}

export const MaterialSelector: React.FC<MaterialSelectorProps> = ({ selectedId, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    materialApi.getList({ type: 'image', pageSize: 12, search })
      .then((res) => setMaterials(res.list ?? []))
      .finally(() => setLoading(false));
  }, [open, search]);

  const selectedMat = materials.find((m) => m.id === selectedId);

  const content = (
    <div style={{ width: 300 }}>
      <Input
        prefix={<SearchOutlined />}
        placeholder="搜索素材..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 8, borderRadius: 'var(--radius-md)' }}
      />
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : (
        <List
          size="small"
          dataSource={materials}
          renderItem={(item) => (
            <List.Item
              onClick={() => { onSelect(item); setOpen(false); }}
              style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
              className={selectedId === item.id ? 'ant-list-item-selected' : ''}
            >
              <Space>
                <div style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <PictureOutlined style={{ color: 'var(--text-tertiary)' }} />
                  )}
                </div>
                <div>
                  <Text style={{ fontSize: 13, color: 'var(--text-primary)', display: 'block' }}>{item.name}</Text>
                  <Tag style={{ fontSize: 10 }}>{item.category || '未分类'}</Tag>
                </div>
              </Space>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Popover content={content} title="选择素材" trigger="click" open={open} onOpenChange={setOpen}>
      <Button icon={<PictureOutlined />} style={{ borderRadius: 'var(--radius-md)' }}>
        {selectedMat ? selectedMat.name : '选择素材'}
      </Button>
    </Popover>
  );
};
