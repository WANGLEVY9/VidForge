import { Timeline, Card, Descriptions, Tag, Space } from 'antd';
import { VideoCameraOutlined, SoundOutlined, FontColorsOutlined, BgColorsOutlined } from '@ant-design/icons';
import { Storyboard } from '@/types/script';
import { formatDuration } from '@/utils';

interface StoryboardListProps {
  storyboards: Storyboard[];
  totalDuration?: number;
}

const StoryboardList: React.FC<StoryboardListProps> = ({ storyboards, totalDuration }) => {
  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>分镜列表</h3>
        {totalDuration && <Tag color="blue">总时长：{formatDuration(totalDuration)}</Tag>}
      </div>
      
      <Timeline
        items={storyboards.map((sb) => ({
          dot: <div style={{ background: '#1890ff', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{sb.index}</div>,
          children: (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="画面描述" span={2}>
                  {sb.sceneDescription}
                </Descriptions.Item>
                <Descriptions.Item label="镜头运动">
                  <Space>
                    <VideoCameraOutlined />
                    {sb.cameraMovement || '固定'}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="时长">
                  {sb.duration}s
                </Descriptions.Item>
                <Descriptions.Item label="台词/旁白" span={2}>
                  <Space>
                    <SoundOutlined />
                    {sb.dialogue || '无'}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="字幕" span={2}>
                  <Space>
                    <FontColorsOutlined />
                    {sb.subtitle || '无'}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="BGM风格" span={2}>
                  <Space>
                    <BgColorsOutlined />
                    {sb.bgm || '无'}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          ),
        }))}
      />
    </div>
  );
};

export default StoryboardList;
