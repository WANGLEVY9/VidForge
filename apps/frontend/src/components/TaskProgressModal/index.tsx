import { useState, useEffect } from 'react';
import { Modal, Progress, Button, Tag, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { getTaskProgress } from '@/api/creation';
import { VideoTaskStatus, VideoTaskStatusText, VideoTaskStatusColor } from '@/types/creation';

interface TaskProgressModalProps {
  open: boolean;
  taskId: string;
  taskName: string;
  onCancel: () => void;
  onSuccess?: (videoUrl: string) => void;
}

const TaskProgressModal: React.FC<TaskProgressModalProps> = ({ open, taskId, taskName, onCancel, onSuccess }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<VideoTaskStatus>(VideoTaskStatus.PENDING);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [videoUrl, setVideoUrl] = useState<string>();
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (open && taskId) {
      setProgress(0);
      setStatus(VideoTaskStatus.PENDING);
      setErrorMessage(undefined);
      setVideoUrl(undefined);
      setPolling(true);
      startPolling();
    } else {
      setPolling(false);
    }

    return () => {
      setPolling(false);
    };
  }, [open, taskId]);

  const startPolling = async () => {
    if (!polling || !taskId) return;

    try {
      const result = await getTaskProgress(taskId);
      setProgress(result.progress);
      setStatus(result.status);
      setErrorMessage(result.errorMessage);
      
      if (result.videoUrl) {
        setVideoUrl(result.videoUrl);
      }

      if (result.status === VideoTaskStatus.SUCCESS) {
        message.success('视频生成成功');
        setPolling(false);
        onSuccess?.(result.videoUrl);
      } else if (result.status === VideoTaskStatus.FAILED) {
        message.error(`视频生成失败: ${result.errorMessage || '未知错误'}`);
        setPolling(false);
      } else if (polling) {
        // 继续轮询
        setTimeout(startPolling, 1000);
      }
    } catch (error) {
      console.error('获取进度失败:', error);
      if (polling) {
        setTimeout(startPolling, 2000);
      }
    }
  };

  const getStatusIcon = () => {
    if (status === VideoTaskStatus.SUCCESS) {
      return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />;
    }
    if (status === VideoTaskStatus.FAILED) {
      return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />;
    }
    return <LoadingOutlined style={{ color: '#1890ff', fontSize: 20 }} />;
  };

  return (
    <Modal
      title={`视频生成中 - ${taskName}`}
      open={open}
      footer={
        status === VideoTaskStatus.SUCCESS || status === VideoTaskStatus.FAILED ? (
          <Button onClick={onCancel}>关闭</Button>
        ) : null
      }
      onCancel={onCancel}
      closable={status !== VideoTaskStatus.PROCESSING}
      maskClosable={status !== VideoTaskStatus.PROCESSING}
      width={500}
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {getStatusIcon()}
          <Tag color={VideoTaskStatusColor[status]} style={{ fontSize: 14, margin: 0 }}>
            {VideoTaskStatusText[status]}
          </Tag>
        </div>

        <Progress
          percent={progress}
          status={status === VideoTaskStatus.FAILED ? 'exception' : 'active'}
          size="large"
          style={{ marginBottom: 16 }}
        />

        {errorMessage && (
          <div style={{ color: '#ff4d4f', marginTop: 16 }}>
            错误原因: {errorMessage}
          </div>
        )}

        {videoUrl && (
          <div style={{ marginTop: 24 }}>
            <h4>生成结果</h4>
            <video
              src={videoUrl}
              controls
              style={{ width: '100%', borderRadius: 8 }}
            />
            <Button
              type="primary"
              style={{ marginTop: 16 }}
              onClick={() => window.open(videoUrl)}
            >
              下载视频
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TaskProgressModal;
