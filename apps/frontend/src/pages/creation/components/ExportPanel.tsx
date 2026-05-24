import React, { useState } from 'react';
import { Modal, Radio, Space, Switch, Typography, Button, message, Table, Tag } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { exportApi, ExportTask } from '../../../services/export';

const { Text } = Typography;

interface ExportPanelProps {
  creationTaskId: string;
  open: boolean;
  onClose: () => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ creationTaskId, open, onClose }) => {
  const [format, setFormat] = useState('mp4');
  const [resolution, setResolution] = useState('1080p');
  const [embedSubtitles, setEmbedSubtitles] = useState(true);
  const [keepShots, setKeepShots] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exports, setExports] = useState<ExportTask[]>([]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportApi.create({
        creationTaskId, format, resolution,
        embedSubtitles, keepIndividualShots: keepShots,
      });
      message.success('导出任务已创建');
      const list = await exportApi.getList();
      setExports(list);
    } catch {
      message.error('导出失败');
    }
    setExporting(false);
  };

  const columns = [
    { title: '任务', dataIndex: 'id', key: 'id', render: (v: string) => v.slice(0, 8) + '...' },
    { title: '格式', dataIndex: 'format', key: 'format' },
    { title: '分辨率', dataIndex: 'resolution', key: 'resolution' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => {
        if (v === 'completed') return <Tag color="success">完成</Tag>;
        if (v === 'processing') return <Tag color="processing">导出中</Tag>;
        if (v === 'failed') return <Tag color="error">失败</Tag>;
        return <Tag color="default">等待中</Tag>;
      },
    },
    {
      title: '操作', key: 'action',
      render: (_: any, record: ExportTask) => (
        record.status === 'completed' ? <Button type="link" size="small"><DownloadOutlined /> 下载</Button> : null
      ),
    },
  ];

  return (
    <Modal title="导出设置" open={open} onCancel={onClose} width={520} footer={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>导出格式</Text>
          <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)}>
            <Radio.Button value="mp4">MP4 H.264</Radio.Button>
            <Radio.Button value="mov">MOV ProRes</Radio.Button>
            <Radio.Button value="webm">WebM</Radio.Button>
            <Radio.Button value="gif">GIF</Radio.Button>
          </Radio.Group>
        </div>

        <div>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>分辨率</Text>
          <Radio.Group value={resolution} onChange={(e) => setResolution(e.target.value)}>
            <Radio.Button value="2160p">4K</Radio.Button>
            <Radio.Button value="1080p">1080p</Radio.Button>
            <Radio.Button value="720p">720p</Radio.Button>
            <Radio.Button value="480p">480p</Radio.Button>
          </Radio.Group>
        </div>

        <div>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>附加选项</Text>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ color: 'var(--text-primary)' }}>嵌入字幕</Text>
              <Switch checked={embedSubtitles} onChange={setEmbedSubtitles} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ color: 'var(--text-primary)' }}>保留分镜独立文件</Text>
              <Switch checked={keepShots} onChange={setKeepShots} />
            </div>
          </Space>
        </div>

        <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
          预估: {resolution} {format.toUpperCase()} ~ 45MB | 预计耗时: ~30s
        </Text>

        <Button type="primary" block size="large" onClick={handleExport} loading={exporting} icon={<DownloadOutlined />}>
          开始导出
        </Button>

        {exports.length > 0 && (
          <Table dataSource={exports} columns={columns} pagination={false} size="small" rowKey="id" />
        )}
      </div>
    </Modal>
  );
};
