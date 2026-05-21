import { useState } from 'react';
import { Form, Input, Select, Button, Modal, message } from 'antd';
import { VideoAspectRatio, VideoResolution } from '@vidforge/common';
import { createVideoTask } from '@/api/creation';
import { VideoResolutionText, VideoAspectRatioText, ExportFormat, ExportFormatText } from '@/types/creation';

const { Option } = Select;

interface CreateVideoTaskFormProps {
  scriptId?: string;
  scriptName?: string;
  onSuccess?: (task: any) => void;
}

const CreateVideoTaskForm: React.FC<CreateVideoTaskFormProps> = ({ scriptId, scriptName, onSuccess }) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const task = await createVideoTask({
        ...values,
        scriptId: scriptId || values.scriptId,
      });

      message.success('视频任务创建成功');
      setVisible(false);
      form.resetFields();
      onSuccess?.(task);
    } catch (error) {
      message.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setVisible(false);
    form.resetFields();
  };

  return (
    <>
      <Button type="primary" onClick={() => setVisible(true)}>
        生成视频
      </Button>

      <Modal
        title="生成带货视频"
        open={visible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={loading}
        width={500}
      >
        <Form form={form} layout="vertical" initialValues={{
          resolution: VideoResolution.RESOLUTION_1080P,
          aspectRatio: VideoAspectRatio.RATIO_9_16,
          exportFormat: ExportFormat.MP4,
          name: scriptName ? `${scriptName} - 视频` : undefined,
        }}>
          <Form.Item
            label="任务名称"
            name="name"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="请输入任务名称，例如：蓝牙耳机15s带货视频" />
          </Form.Item>

          <Form.Item
            label="视频分辨率"
            name="resolution"
            rules={[{ required: true, message: '请选择分辨率' }]}
          >
            <Select placeholder="请选择视频分辨率">
              {Object.entries(VideoResolutionText).map(([value, label]) => (
                <Option key={value} value={value as VideoResolution}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="视频比例"
            name="aspectRatio"
            rules={[{ required: true, message: '请选择视频比例' }]}
          >
            <Select placeholder="请选择视频比例">
              {Object.entries(VideoAspectRatioText).map(([value, label]) => (
                <Option key={value} value={value as VideoAspectRatio}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="导出格式"
            name="exportFormat"
            rules={[{ required: true, message: '请选择导出格式' }]}
          >
            <Select placeholder="请选择导出格式">
              {Object.entries(ExportFormatText).map(([value, label]) => (
                <Option key={value} value={value as ExportFormat}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default CreateVideoTaskForm;
