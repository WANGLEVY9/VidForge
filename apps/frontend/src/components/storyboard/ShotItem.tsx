import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Tag, Tooltip, Typography, Space } from 'antd';
import {
  MenuOutlined, PlayCircleOutlined, LoadingOutlined,
  ReloadOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { Shot } from '../../store/useStoryboardStore';

const { Text } = Typography;

interface ShotItemProps {
  shot: Shot;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRegenerate?: (id: string) => void;
}

export const ShotItem: React.FC<ShotItemProps> = ({
  shot, isActive, onSelect, onDelete, onRegenerate,
}) => {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: shot.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  const statusColor: Record<string, string> = {
    pending: 'default', generating: 'processing', completed: 'success', failed: 'error',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(shot.id)}
      className={`shot-item ${isActive ? 'shot-item--active' : ''}`}
    >
      {/* Drag handle */}
      <div {...attributes} {...listeners} style={{ padding: '0 4px', display: 'flex', alignItems: 'center' }}>
        <MenuOutlined style={{ color: 'var(--text-tertiary)', fontSize: 14 }} />
      </div>

      {/* Thumbnail */}
      <div className="shot-item__thumb">
        {shot.status === 'completed' && shot.videoUrl ? (
          <div className="shot-item__thumb-play">
            <PlayCircleOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
        ) : shot.status === 'generating' ? (
          <LoadingOutlined style={{ fontSize: 18, color: 'var(--brand-primary)' }} spin />
        ) : (
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-tertiary)' }}>
            {shot.order}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text
          strong
          style={{ color: 'var(--text-primary)', fontSize: 13, display: 'block' }}
          ellipsis
        >
          {shot.description || `分镜 ${shot.order}`}
        </Text>
        <Space size={4} style={{ marginTop: 2 }}>
          <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{shot.duration}s</Text>
          <Tag color={statusColor[shot.status]} style={{ fontSize: 10, lineHeight: '16px', borderRadius: 10 }}>
            {shot.status === 'pending' ? '等待' : shot.status === 'generating' ? '生成中' : shot.status === 'completed' ? '完成' : '失败'}
          </Tag>
        </Space>
      </div>

      {/* Actions */}
      <div className="shot-item__actions" onClick={(e) => e.stopPropagation()}>
        {shot.status === 'completed' && (
          <Tooltip title="重新生成">
            <Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => onRegenerate?.(shot.id)} />
          </Tooltip>
        )}
        <Tooltip title="删除">
          <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#ef4444' }} onClick={() => onDelete(shot.id)} />
        </Tooltip>
      </div>
    </div>
  );
};
