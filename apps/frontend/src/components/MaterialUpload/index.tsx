import { useState, useRef } from 'react';
import { Upload, Button, message, Form, Select, Input, Modal, Progress } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { uploadMaterial } from '@/api/material';
import { MaterialType } from '@/types/material';

const { Option } = Select;
const { TextArea } = Input;

interface MaterialUploadProps {
  onSuccess?: () => void;
}

const MaterialUpload: React.FC<MaterialUploadProps> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<File | null>(null);

  const beforeUpload = (file: File) => {
    fileRef.current = file;
    setVisible(true);
    return false; // 阻止自动上传
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (!fileRef.current) return;

      setUploading(true);
      await uploadMaterial(
        {
          file: fileRef.current,
          type: values.type,
          name: values.name || fileRef.current.name,
          tags: values.tags ? values.tags.split(',').map((tag: string) => tag.trim()) : [],
        },
        (p) => setProgress(p)
      );

      message.success('上传成功');
      setVisible(false);
      form.resetFields();
      fileRef.current = null;
      setProgress(0);
      onSuccess?.();
    } catch (error) {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setVisible(false);
    form.resetFields();
    fileRef.current = null;
    setProgress(0);
  };

  const uploadProps: UploadProps = {
    beforeUpload,
    showUploadList: false,
    multiple: false,
  };

  return (
    <>
      <Upload {...uploadProps}>
        <Button type="primary" icon={<UploadOutlined />}>
          上传素材
        </Button>
      </Upload>

      <Modal
        title="上传素材"
        open={visible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={uploading}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="素材类型"
            name="type"
            rules={[{ required: true, message: '请选择素材类型' }]}
          >
            <Select placeholder="请选择素材类型">
              <Option value={MaterialType.IMAGE}>图片</Option>
              <Option value={MaterialType.VIDEO}>视频</Option>
              <Option value={MaterialType.AUDIO}>音频</Option>
            </Select>
          </Form.Item>

          <Form.Item label="素材名称" name="name">
            <Input placeholder="请输入素材名称，默认使用文件名" />
          </Form.Item>

          <Form.Item label="标签" name="tags">
            <TextArea
              placeholder="请输入标签，多个用英文逗号分隔"
              rows={3}
            />
          </Form.Item>

          {uploading && (
            <Form.Item label="上传进度">
              <Progress percent={progress} status="active" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default MaterialUpload;
