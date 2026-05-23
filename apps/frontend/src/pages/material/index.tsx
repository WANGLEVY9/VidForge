import { useState } from 'react';
import { Card, Button, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

function MaterialPage() {
  const [fileList, setFileList] = useState<any[]>([]);

  const handleUpload = (info: any) => {
    if (info.file.status === 'done') {
      message.success(`${info.file.name} 上传成功`);
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} 上传失败`);
    }
    setFileList(info.fileList);
  };

  return (
    <Card title="素材管理">
      <Upload
        fileList={fileList}
        onChange={handleUpload}
        customRequest={({ onSuccess }) => {
          setTimeout(() => onSuccess?.('ok'), 1000);
        }}
      >
        <Button icon={<UploadOutlined />}>上传素材</Button>
      </Upload>
    </Card>
  );
}

export default MaterialPage;
