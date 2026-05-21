import { useState } from 'react';
import { Card, Button, Tooltip, Popconfirm, Tag, Descriptions, Modal, message, Progress, Alert } from 'antd';
import { DeleteOutlined, EyeOutlined, PlayCircleOutlined, RedoOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { VideoTask, VideoTaskStatus, VideoTaskStatusText, VideoTaskStatusColor } from '@/types/creation';
import { VideoResolutionText, VideoAspectRatioText } from '@/types/creation';
import { deleteVideoTask, retryVideoTask } from '@/api/creation';
import TaskProgressModal from '../TaskProgressModal';
import { formatFileSize, formatDuration } from '@/utils';

interface VideoTaskCardProps {
  task: VideoTask;
  onDelete?: () => void;
  onRetry?: () => void;
}

const VideoTaskCard: React.FC<VideoTaskCardProps> = ({ task, onDelete, onRetry }) => {
  const [progressVisible, setProgressVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteVideoTask(task.id);
      message.success('删除成功');
      onDelete?.();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleRetry = async () => {
    try {
      setRetryLoading(true);
      await retryVideoTask(task.id);
      message.success('任务已重新提交');
      onRetry?.();
    } catch (error) {
      message.error('重试失败');
    } finally {
      setRetryLoading(false);
    }
  };

  const canPreview = task.status === VideoTaskStatus.SUCCESS && task.videoUrl;
  const canRetry = task.status === VideoTaskStatus.FAILED;

  return (
    <>
      <Card
        title={
          <Tooltip title={task.name}>
            {task.name.length > 20 ? `${task.name.slice(0, 20)}...` : task.name}
          </Tooltip>
        }
        extra={<Tag color={VideoTaskStatusColor[task.status]}>{VideoTaskStatusText[task.status]}</Tag>}
        actions={[
          <Tooltip title="查看进度">
            <Button type="text" icon={<PlayCircleOutlined />} onClick={() => setProgressVisible(true)} />
          </Tooltip>,
          canPreview ? (
            <Tooltip title="预览视频">
              <Button type="text" icon={<EyeOutlined />} onClick={() => setPreviewVisible(true)} />
            </Tooltip>
          ) : null,
          canRetry ? (
            <Tooltip title="重试任务">
              <Button type="text" icon={<RedoOutlined />} loading={retryLoading} onClick={handleRetry} />
            </Tooltip>
          ) : null,
          <Popconfirm title="确定要删除这个任务吗？" onConfirm={handleDelete}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>,
        ].filter(Boolean)}
      >
        <Descriptions column={1} size="small">
          <Descriptions.Item label="关联剧本">{task.script?.title || '未关联'}</Descriptions.Item>
          <Descriptions.Item label="分辨率">{VideoResolutionText[task.resolution]}</Descriptions.Item>
          <Descriptions.Item label="比例">{VideoAspectRatioText[task.aspectRatio]}</Descriptions.Item>
          <Descriptions.Item label="格式">{ExportFormatText[task.exportFormat]}</Descriptions.Item>
          
          {task.status === VideoTaskStatus.PROCESSING && (
            <Descriptions.Item label="进度">
              <Progress percent={task.progress} size="small" style={{ width: 100 }} />
            </Descriptions.Item>
          )}

          {task.duration && (
            <Descriptions.Item label="时长">{formatDuration(task.duration)}</Descriptions.Item>
          )}
          
          {task.videoSize && (
            <Descriptions.Item label="大小">{formatFileSize(task.videoSize)}</Descriptions.Item>
          )}

          <Descriptions.Item label="创建时间">
            {dayjs(task.createdAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
        </Descriptions>

        {task.status === VideoTaskStatus.FAILED && task.errorMessage && (
          <Alert
            message="任务失败"
            description={task.errorMessage}
            type="error"
            showIcon
            style={{ marginTop: 12, fontSize: 12 }}
          />
        )}
      </Card>

      <TaskProgressModal
        open={progressVisible}
        taskId={task.id}
        taskName={task.name}
        onCancel={() => setProgressVisible(false)}
      />

      <Modal
        title="视频预览"
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
      >
        <video
          src={task.videoUrl}
          controls
          style={{ width: '100%', borderRadius: 8 }}
        />
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Button type="primary" onClick={() => window.open(task.videoUrl)}>
            下载视频
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default VideoTaskCard;
