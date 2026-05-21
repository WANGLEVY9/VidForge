import { useState } from 'react';
import { Form, Input, Select, InputNumber, Button, Modal, message, Space, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { generateScript } from '@/api/script';
import { VideoStyle } from '@/types/script';
import { VideoStyleText } from '@/types/script';

const { TextArea } = Input;
const { Option } = Select;

interface ScriptGenerateFormProps {
  onSuccess?: (script: any) => void;
}

const ScriptGenerateForm: React.FC<ScriptGenerateFormProps> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sellingPoints, setSellingPoints] = useState<string[]>([]);
  const [currentPoint, setCurrentPoint] = useState('');

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (sellingPoints.length === 0) {
        message.error('请至少添加一个商品卖点');
        return;
      }

      setLoading(true);
      const script = await generateScript({
        ...values,
        sellingPoints,
      });

      message.success('剧本生成成功');
      setVisible(false);
      form.resetFields();
      setSellingPoints([]);
      setCurrentPoint('');
      onSuccess?.(script);
    } catch (error) {
      message.error('剧本生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setVisible(false);
    form.resetFields();
    setSellingPoints([]);
    setCurrentPoint('');
  };

  const addSellingPoint = () => {
    if (currentPoint.trim() && !sellingPoints.includes(currentPoint.trim())) {
      setSellingPoints([...sellingPoints, currentPoint.trim()]);
      setCurrentPoint('');
    }
  };

  const removeSellingPoint = (point: string) => {
    setSellingPoints(sellingPoints.filter(p => p !== point));
  };

  return (
    <>
      <Button type="primary" onClick={() => setVisible(true)}>
        生成新剧本
      </Button>

      <Modal
        title="生成带货剧本"
        open={visible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={loading}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="商品名称"
            name="productName"
            rules={[{ required: true, message: '请输入商品名称' }]}
          >
            <Input placeholder="请输入商品名称，例如：无线蓝牙耳机" />
          </Form.Item>

          <Form.Item label="商品卖点">
            <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
              <Input
                placeholder="输入卖点后点击添加按钮"
                value={currentPoint}
                onChange={(e) => setCurrentPoint(e.target.value)}
                onPressEnter={addSellingPoint}
              />
              <Button onClick={addSellingPoint} icon={<PlusOutlined />}>
                添加
              </Button>
            </Space.Compact>
            <div>
              {sellingPoints.map((point, index) => (
                <Tag
                  key={index}
                  closable
                  onClose={() => removeSellingPoint(point)}
                  style={{ marginBottom: 4 }}
                >
                  {point}
                </Tag>
              ))}
            </div>
          </Form.Item>

          <Form.Item label="目标人群" name="targetAudience">
            <Input placeholder="例如：年轻女性、上班族、游戏爱好者" />
          </Form.Item>

          <Form.Item label="使用场景" name="scene">
            <Input placeholder="例如：运动场景、居家使用、办公场景" />
          </Form.Item>

          <Form.Item label="视频风格" name="style">
            <Select placeholder="请选择视频风格">
              {Object.entries(VideoStyleText).map(([value, label]) => (
                <Option key={value} value={value as VideoStyle}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="视频时长（秒）" name="totalDuration">
            <InputNumber min={5} max={60} defaultValue={15} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="自定义Prompt" name="customPrompt">
            <TextArea
              rows={4}
              placeholder="可选，填写后会覆盖系统默认的生成Prompt，可自定义生成要求"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ScriptGenerateForm;
