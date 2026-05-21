import { useState } from 'react';
import { Card, Button, Tooltip, Popconfirm, Tag, Descriptions, Modal, message, Switch, Space } from 'antd';
import { DeleteOutlined, EyeOutlined, VideoCameraOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Script, ScriptStatus, ScriptStatusText, VideoStyleText } from '@/types/script';
import { deleteScript } from '@/api/script';
import StoryboardList from '../StoryboardList';
import EditableStoryboardList from '../EditableStoryboardList';

interface ScriptCardProps {
  script: Script;
  onDelete?: () => void;
  onCreateVideo?: () => void;
  onUpdate?: () => void;
}

const ScriptCard: React.FC<ScriptCardProps> = ({ script, onDelete, onCreateVideo, onUpdate }) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteScript(script.id);
      message.success('删除成功');
      onDelete?.();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const getStatusColor = (status: ScriptStatus) => {
    switch (status) {
      case ScriptStatus.COMPLETED:
        return 'success';
      case ScriptStatus.GENERATING:
        return 'processing';
      case ScriptStatus.FAILED:
        return 'error';
      default:
        return 'default';
    }
  };

  const handleSave = () => {
    setEditMode(false);
    onUpdate?.();
    message.success('分镜已更新');
  };

  return (
    <>
      <Card
        title={
          <Tooltip title={script.title}>
            {script.title.length > 20 ? `${script.title.slice(0, 20)}...` : script.title}
          </Tooltip>
        }
        extra={<Tag color={getStatusColor(script.status)}>{ScriptStatusText[script.status]}</Tag>}
        actions={[
          <Tooltip title="查看/编辑">
            <Button type="text" icon={<EyeOutlined />} onClick={() => setPreviewVisible(true)} />
          </Tooltip>,
          <Tooltip title="生成视频">
            <Button type="text" icon={<VideoCameraOutlined />} onClick={onCreateVideo} />
          </Tooltip>,
          <Popconfirm title="确定要删除这个剧本吗？" onConfirm={handleDelete}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>,
        ]}
      >
        <Descriptions column={1} size="small">
          <Descriptions.Item label="商品">{script.productName}</Descriptions.Item>
          <Descriptions.Item label="风格">{VideoStyleText[script.style] || '未设置'}</Descriptions.Item>
          <Descriptions.Item label="时长">{script.totalDuration}秒</Descriptions.Item>
          <Descriptions.Item label="分镜数">{script.storyboards?.length || 0}个</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(script.createdAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
        </Descriptions>

        {script.tags && script.tags.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {script.tags.slice(0, 3).map((tag, index) => (
              <Tag key={index} size="small" style={{ marginBottom: 4 }}>{tag}</Tag>
            ))}
            {script.tags.length > 3 && <Tag size="small">+{script.tags.length - 3}</Tag>}
          </div>
        )}
      </Card>

      <Modal
        title="剧本详情"
        open={previewVisible}
        footer={null}
        onCancel={() => {
          setPreviewVisible(false);
          setEditMode(false);
        }}
        width={900}
      >
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Descriptions column={2} size="small" style={{ margin: 0, flex: 1 }}>
            <Descriptions.Item label="剧本标题">{script.title}</Descriptions.Item>
            <Descriptions.Item label="商品名称">{script.productName}</Descriptions.Item>
            <Descriptions.Item label="目标人群">{script.targetAudience || '通用'}</Descriptions.Item>
            <Descriptions.Item label="使用场景">{script.scene || '通用'}</Descriptions.Item>
            <Descriptions.Item label="视频风格">{VideoStyleText[script.style]}</Descriptions.Item>
            <Descriptions.Item label="总时长">{script.totalDuration}秒</Descriptions.Item>
          </Descriptions>
          <Space>
            <span>编辑模式</span>
            <Switch checked={editMode} onChange={setEditMode} />
          </Space>
        </div>
        
        {script.storyboards && (
          editMode ? (
            <EditableStoryboardList
              scriptId={script.id}
              storyboards={script.storyboards}
              totalDuration={script.totalDuration}
              onSave={handleSave}
            />
          ) : (
            <StoryboardList storyboards={script.storyboards} totalDuration={script.totalDuration} />
          )
        )}
      </Modal>
    </>
  );
};

export default ScriptCard;
