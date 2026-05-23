import { useState } from 'react';
import { Card, Button, Input, Form, message } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

function ScriptPage() {
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState('');

  const handleGenerate = async (values: any) => {
    setLoading(true);
    // TODO: 调用 API 生成剧本
    setTimeout(() => {
      setScript(`生成的剧本内容：${values.productName}`);
      setLoading(false);
      message.success('剧本生成成功');
    }, 1500);
  };

  return (
    <Card title="剧本生成">
      <Form onFinish={handleGenerate} layout="vertical">
        <Form.Item
          name="productName"
          label="商品名称"
          rules={[{ required: true, message: '请输入商品名称' }]}
        >
          <Input placeholder="请输入商品名称" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} icon={<FileTextOutlined />}>
            生成剧本
          </Button>
        </Form.Item>
      </Form>
      {script && (
        <Card title="生成结果" style={{ marginTop: 16 }}>
          <pre>{script}</pre>
        </Card>
      )}
    </Card>
  );
}

export default ScriptPage;
