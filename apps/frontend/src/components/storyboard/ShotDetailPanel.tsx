import React from 'react';
import { Button, Typography, Input, Slider, Select, Space, Divider, Tooltip } from 'antd';
import {
  ReloadOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useStoryboardStore } from '../../store/useStoryboardStore';
import { MaterialSelector } from './MaterialSelector';
import { MaterialItem } from '../../services/material';

const { Text } = Typography;

interface ShotDetailPanelProps {
  onRegenerate?: (id: string) => void;
}

export const ShotDetailPanel: React.FC<ShotDetailPanelProps> = ({ onRegenerate }) => {
  const shots = useStoryboardStore((s) => s.shots);
  const activeShotId = useStoryboardStore((s) => s.activeShotId);
  const updateShot = useStoryboardStore((s) => s.updateShot);
  const removeShot = useStoryboardStore((s) => s.removeShot);

  const shot = shots.find((s) => s.id === activeShotId);

  if (!shot) {
    return (
      <div className="shot-detail-panel">
        <div className="shot-detail-panel__empty">
          <Text style={{ color: 'var(--text-tertiary)' }}>请选择一个分镜以编辑详情</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="shot-detail-panel">
      <div className="shot-detail-panel__header">
        <Text strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>
          分镜 {shot.order} 详情
        </Text>
      </div>

      <div className="shot-detail-panel__body">
        {/* 画面描述 */}
        <div className="shot-detail-field">
          <Text className="shot-detail-field__label">画面描述 Prompt</Text>
          <Input.TextArea
            value={shot.description}
            onChange={(e) => updateShot(shot.id, { description: e.target.value })}
            rows={3}
            placeholder="描述画面内容..."
            style={{ borderRadius: 'var(--radius-md)' }}
          />
        </div>

        {/* 分镜类型 */}
        <div className="shot-detail-field">
          <Text className="shot-detail-field__label">生成类型</Text>
          <Select
            value={shot.type}
            onChange={(v) => updateShot(shot.id, { type: v })}
            style={{ width: '100%' }}
            options={[
              { value: 'text-to-video', label: '文生视频 (Text-to-Video)' },
              { value: 'image-to-video', label: '图生视频 (Image-to-Video)' },
            ]}
          />
        </div>

        {/* 素材选择 */}
        <div className="shot-detail-field">
          <Text className="shot-detail-field__label">参考素材</Text>
          <MaterialSelector
            selectedId={shot.referenceMaterialId}
            onSelect={(mat: MaterialItem) => updateShot(shot.id, { referenceMaterialId: mat.id })}
          />
        </div>

        {/* 时长 */}
        <div className="shot-detail-field">
          <Text className="shot-detail-field__label">时长: {shot.duration}s</Text>
          <Slider
            min={1}
            max={30}
            value={shot.duration}
            onChange={(v) => updateShot(shot.id, { duration: v })}
            marks={{ 1: '1s', 5: '5s', 15: '15s', 30: '30s' }}
          />
        </div>

        {/* 台词 */}
        <div className="shot-detail-field">
          <Text className="shot-detail-field__label">配音台词</Text>
          <Input.TextArea
            value={shot.script}
            onChange={(e) => updateShot(shot.id, { script: e.target.value })}
            rows={2}
            placeholder="输入配音文本..."
            style={{ borderRadius: 'var(--radius-md)' }}
          />
        </div>

        <Divider style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />

        {/* 操作按钮 */}
        <Space>
          {onRegenerate && (
            <Tooltip title="仅重新生成此分镜">
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                size="small"
                onClick={() => onRegenerate(shot.id)}
              >
                重新生成
              </Button>
            </Tooltip>
          )}
          <Tooltip title="从尾删除此分镜">
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => removeShot(shot.id)}
            >
              删除
            </Button>
          </Tooltip>
        </Space>
      </div>
    </div>
  );
};
