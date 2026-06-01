import React, { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Tag, Tooltip, Typography, Space } from 'antd';
import {
  MenuOutlined, PlayCircleOutlined, LoadingOutlined,
  ReloadOutlined, DeleteOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { Shot } from '../../store/useStoryboardStore';
import { triggerDownload } from '../../utils/download';

const { Text } = Typography;

interface ShotItemProps {
  shot: Shot;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRegenerate?: (id: string) => void;
  /**
   * 只读模式:隐藏拖拽、删除、重新生成,只保留选中、预览、下载
   * 用于视频生成完成后的「分镜结果浏览」场景
   */
  readonly?: boolean;
}

export const ShotItem: React.FC<ShotItemProps> = ({
  shot, isActive, onSelect, onDelete, onRegenerate, readonly = false,
}) => {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: shot.id, disabled: readonly });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'pointer',
  };

  const statusColor: Record<string, string> = {
    pending: 'default', generating: 'processing', completed: 'success', failed: 'error',
  };

  const hasVideo = shot.status === 'completed' && !!shot.videoUrl;

  const handleHoverPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  };
  const handleHoverPause = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    try {
      v.currentTime = 0;
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    if (!shot.videoUrl) return;
    triggerDownload(shot.videoUrl, `shot-${shot.order}.mp4`);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(shot.id)}
      className={`shot-item ${isActive ? 'shot-item--active' : ''}`}
    >
      {/* Drag handle (readonly 时隐藏) */}
      {!readonly && (
        <div {...attributes} {...listeners} style={{ padding: '0 4px', display: 'flex', alignItems: 'center', cursor: 'grab' }}>
          <MenuOutlined style={{ color: 'var(--text-tertiary)', fontSize: 14 }} />
        </div>
      )}

      {/* Thumbnail — completed 且有 videoUrl 时显示真实视频(hover 自动播放) */}
      <div
        className="shot-item__thumb"
        onMouseEnter={hasVideo ? handleHoverPlay : undefined}
        onMouseLeave={hasVideo ? handleHoverPause : undefined}
        style={{ position: 'relative' }}
      >
        {hasVideo ? (
          <>
            <video
              ref={videoRef}
              src={shot.videoUrl}
              poster={shot.thumbnailUrl}
              muted
              playsInline
              preload="metadata"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            {/* hover 提示叠层 */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.25)',
                opacity: 0,
                transition: 'opacity 0.15s ease',
                pointerEvents: 'none',
              }}
              className="shot-item__thumb-overlay"
            >
              <PlayCircleOutlined style={{ fontSize: 18, color: '#fff' }} />
            </div>
          </>
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
        {hasVideo && (
          <Tooltip title="下载本分镜">
            <Button type="text" size="small" icon={<DownloadOutlined />} onClick={handleDownload} />
          </Tooltip>
        )}
        {!readonly && shot.status === 'completed' && onRegenerate && (
          <Tooltip title="重新生成">
            <Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => onRegenerate(shot.id)} />
          </Tooltip>
        )}
        {!readonly && (
          <Tooltip title="删除">
            <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#ef4444' }} onClick={() => onDelete(shot.id)} />
          </Tooltip>
        )}
      </div>
    </div>
  );
};
