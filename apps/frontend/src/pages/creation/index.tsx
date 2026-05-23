import { useState } from 'react';
import { Card, Button, Input, Form, message, Progress } from 'antd';
import { VideoCameraOutlined } from '@ant-design/icons';

function CreationPage() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState('');

  const handleCreate = async (_values: any) => {
    setLoading(true);
    setProgress(0);
    
    // 模拟进度
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setLoading(false);
          message.success('视频生成完成');
          return 100;
        }
        return p + 10;
      });
    }, 1000);

    setTaskId('task-' + Date.now());
  };

  return (
    <Card title="视频创作">
      <Form onFinish={handleCreate} layout="vertical">
        <Form.Item
          name="prompt"
          label="视频描述"
          rules={[{ required: true, message: '请输入视频描述' }]}
        >
          <Input.TextArea placeholder="请输入视频描述" rows={4} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} icon={<VideoCameraOutlined />}>
            生成视频
          </Button>
        </Form.Item>
      </Form>
      {loading && (
        <div style={{ marginTop: 16 }}>
          <Progress percent={progress} status="active" />
          <p>任务ID: {taskId}</p>
        </div>
      )}
    </Card>
  );
}

export default CreationPage;
