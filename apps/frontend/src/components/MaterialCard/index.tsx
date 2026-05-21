import { Card, Button, Tooltip, Popconfirm, Tag, message } from 'antd';
import { DeleteOutlined, EyeOutlined, VideoCameraOutlined, SoundOutlined, PictureOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Material, MaterialType, MaterialTypeText } from '@/types/material';
import { deleteMaterial } from '@/api/material';
import { formatFileSize } from '@/utils';

interface MaterialCardProps {
  material: Material;
  onDelete?: () => void;
  onPreview?: () => void;
}

const MaterialCard: React.FC<MaterialCardProps> = ({ material, onDelete, onPreview }) => {
  const handleDelete = async () => {
    try {
      await deleteMaterial(material.id);
      message.success('删除成功');
      onDelete?.();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const getIcon = () => {
    switch (material.type) {
      case MaterialType.IMAGE:
        return <PictureOutlined />;
      case MaterialType.VIDEO:
        return <VideoCameraOutlined />;
      case MaterialType.AUDIO:
        return <SoundOutlined />;
      default:
        return <PictureOutlined />;
    }
  };

  const getPreviewContent = () => {
    if (material.type === MaterialType.IMAGE) {
      return (
        <div style={{ height: 160, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
          <img src={material.url} alt={material.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      );
    }
    if (material.type === MaterialType.VIDEO) {
      return (
        <div style={{ height: 160, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
          <video src={material.url} style={{ maxWidth: '100%', maxHeight: '100%' }} controls={false} />
        </div>
      );
    }
    return (
      <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontSize: 48 }}>
        {getIcon()}
        <div style={{ fontSize: 14, marginTop: 8 }}>音频文件</div>
      </div>
    );
  };

  return (
    <Card
      hoverable
      actions={[
        <Tooltip title="预览">
          <Button type="text" icon={<EyeOutlined />} onClick={onPreview} />
        </Tooltip>,
        <Popconfirm title="确定要删除这个素材吗？" onConfirm={handleDelete}>
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>,
      ]}
    >
      {getPreviewContent()}
      <Card.Meta
        title={<Tooltip title={material.name}>{material.name.length > 15 ? `${material.name.slice(0, 15)}...` : material.name}</Tooltip>}
        description={
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 4 }}>
              <Tag color="blue">{MaterialTypeText[material.type]}</Tag>
              {material.duration && <Tag color="green">{material.duration}s</Tag>}
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>
              <div>大小: {formatFileSize(material.size)}</div>
              <div>上传时间: {dayjs(material.createdAt).format('YYYY-MM-DD HH:mm')}</div>
            </div>
            {material.tags && material.tags.length > 0 && (
              <div style={{ marginTop: 4 }}>
                {material.tags.slice(0, 3).map((tag, index) => (
                  <Tag key={index} size="small" style={{ marginBottom: 4 }}>{tag}</Tag>
                ))}
                {material.tags.length > 3 && <Tag size="small">+{material.tags.length - 3}</Tag>}
              </div>
            )}
          </div>
        }
      />
    </Card>
  );
};

export default MaterialCard;
