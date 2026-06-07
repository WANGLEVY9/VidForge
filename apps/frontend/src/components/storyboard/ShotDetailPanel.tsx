import React from 'react';
import { Button, Typography, Input, Slider, Select, Space, Divider, Tooltip, Tag } from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useStoryboardStore } from '../../store/useStoryboardStore';
import { MaterialSelector } from './MaterialSelector';
import { MaterialItem } from '../../services/material';
import { triggerDownload, openInNewTab } from '../../utils/download';

const { Text } = Typography;

interface ShotDetailPanelProps {
  onRegenerate?: (id: string) => void;
  /**
   * 只读模式:隐藏所有编辑控件(描述/类型/素材/时长/台词、删除/重新生成),
   * 仅展示分镜信息 + 「下载本分镜」「在新标签打开」两个操作按钮。
   * 用于视频生成完成后浏览结果。
   */
  readonly?: boolean;
}

export const ShotDetailPanel: React.FC<ShotDetailPanelProps> = ({
  onRegenerate,
  readonly = false,
}) => {
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

  const hasVideo = shot.status === 'completed' && !!shot.videoUrl;

  // 只读视图:仅展示信息 + 下载/打开
  if (readonly) {
    return (
      <div className="shot-detail-panel">
        <div className="shot-detail-panel__header">
          <Text strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>
            分镜 {shot.order} 信息
          </Text>
        </div>

        <div className="shot-detail-panel__body">
          <div className="shot-detail-field">
            <Text className="shot-detail-field__label">画面描述</Text>
            <Text style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.6 }}>
              {shot.description || '—'}
            </Text>
          </div>

          {shot.script && (
            <div className="shot-detail-field">
              <Text className="shot-detail-field__label">配音台词</Text>
              <Text style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.6 }}>
                {shot.script}
              </Text>
            </div>
          )}

          <div className="shot-detail-field">
            <Text className="shot-detail-field__label">基础信息</Text>
            <Space size={6} wrap>
              <Tag>{shot.duration}s</Tag>
              <Tag color="blue">{shot.type === 'image-to-video' ? '图生视频' : '文生视频'}</Tag>
              <Tag color={hasVideo ? 'success' : shot.status === 'failed' ? 'error' : 'default'}>
                {hasVideo ? '已生成' : shot.status === 'failed' ? '生成失败' : shot.status}
              </Tag>
            </Space>
          </div>

          <Divider style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />

          {hasVideo ? (
            <Space wrap>
              <Tooltip title="下载本分镜的 mp4 文件">
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={() => triggerDownload(shot.videoUrl!, `shot-${shot.order}.mp4`)}
                >
                  下载本分镜
                </Button>
              </Tooltip>
              <Tooltip title="在新标签页查看完整视频">
                <Button
                  icon={<ExportOutlined />}
                  size="small"
                  onClick={() => openInNewTab(shot.videoUrl!)}
                >
                  在新标签打开
                </Button>
              </Tooltip>
            </Space>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {shot.status === 'failed' ? '该分镜生成失败,无可下载内容' : '该分镜尚未生成完毕'}
            </Text>
          )}
        </div>
      </div>
    );
  }

  // 可编辑视图(原有)
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
        <Space wrap>
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
          {hasVideo && (
            <Tooltip title="下载本分镜的 mp4 文件">
              <Button
                icon={<DownloadOutlined />}
                size="small"
                onClick={() => triggerDownload(shot.videoUrl!, `shot-${shot.order}.mp4`)}
              >
                下载
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
