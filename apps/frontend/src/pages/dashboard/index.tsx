import { Card, Statistic, Row, Col } from 'antd';
import { VideoCameraOutlined, FileTextOutlined, UploadOutlined } from '@ant-design/icons';

function DashboardPage() {
  return (
    <div>
      <h2>数据看板</h2>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="素材数量"
              value={42}
              prefix={<UploadOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="剧本数量"
              value={18}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="视频数量"
              value={12}
              prefix={<VideoCameraOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default DashboardPage;
