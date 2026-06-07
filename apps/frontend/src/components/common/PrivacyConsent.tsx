import React, { useState } from 'react';
import { Modal, Switch, Button, Typography, Space, Divider } from 'antd';
import { SafetyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { ConsentSettings } from '../../services/consent';

const { Text, Title } = Typography;

interface PrivacyConsentProps {
  visible: boolean;
  onAccept: (settings: ConsentSettings) => void;
  onDecline: () => void;
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 0',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const PrivacyConsent: React.FC<PrivacyConsentProps> = ({ visible, onAccept, onDecline }) => {
  const [settings, setSettings] = useState<ConsentSettings>({
    analytics: true,
    drafts: true,
    logging: true,
  });

  const handleToggle = (key: keyof ConsentSettings) => (checked: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: checked }));
  };

  const handleAccept = () => {
    onAccept(settings);
  };

  return (
    <Modal
      open={visible}
      closable={false}
      maskClosable={false}
      destroyOnClose
      footer={null}
      width={480}
      centered
      styles={{
        content: {
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-modal)',
          padding: 32,
        },
        mask: {
          background: 'rgba(0, 0, 0, 0.6)',
        },
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <SafetyOutlined
          style={{
            fontSize: 48,
            color: 'var(--brand-primary)',
            marginBottom: 12,
          }}
        />
        <Title
          level={4}
          style={{
            color: 'var(--text-primary)',
            margin: 0,
            marginBottom: 8,
          }}
        >
          隐私设置
        </Title>
        <Text style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          感谢您使用 VidForge。为了提供更好的服务，我们会在本地存储必要的数据。
          请选择您允许的本地数据存储类别：
        </Text>
      </div>

      <div
        style={{
          background: 'var(--bg-surface-2)',
          borderRadius: 'var(--radius-md)',
          padding: '4px 16px',
          marginBottom: 20,
        }}
      >
        {/* 草稿自动保存 */}
        <div style={rowStyle}>
          <div style={labelStyle}>
            <Text style={{ color: 'var(--text-primary)', fontWeight: 500 }}>草稿自动保存</Text>
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
              在本地保存剧本和视频创作草稿
            </Text>
          </div>
          <Switch checked={settings.drafts} onChange={handleToggle('drafts')} />
        </div>

        <Divider style={{ margin: 0, borderColor: 'var(--border-color)' }} />

        {/* 使用统计和分析 */}
        <div style={rowStyle}>
          <div style={labelStyle}>
            <Text style={{ color: 'var(--text-primary)', fontWeight: 500 }}>使用统计和分析</Text>
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
              记录页面性能数据以优化体验
            </Text>
          </div>
          <Switch checked={settings.analytics} onChange={handleToggle('analytics')} />
        </div>

        <Divider style={{ margin: 0, borderColor: 'var(--border-color)' }} />

        {/* 调试日志 */}
        <div style={rowStyle}>
          <div style={labelStyle}>
            <Text style={{ color: 'var(--text-primary)', fontWeight: 500 }}>调试日志</Text>
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
              本地存储调试日志（最多 200 条）
            </Text>
          </div>
          <Switch checked={settings.logging} onChange={handleToggle('logging')} />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          marginBottom: 20,
          padding: '8px 12px',
          background: 'rgba(99, 102, 241, 0.08)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <InfoCircleOutlined
          style={{ color: 'var(--brand-primary)', marginTop: 2, flexShrink: 0 }}
        />
        <Text style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
          所有数据仅存储在您的浏览器本地，不会自动上传至服务器。您可以随时在设置中修改隐私偏好或清除本地数据。
        </Text>
      </div>

      <Space style={{ width: '100%' }} size={12}>
        <Button
          type="primary"
          size="large"
          block
          onClick={handleAccept}
          style={{
            background:
              'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
            border: 'none',
            height: 44,
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
          }}
        >
          接受
        </Button>
        <Button
          size="large"
          block
          onClick={onDecline}
          style={{
            height: 44,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            background: 'transparent',
          }}
        >
          拒绝全部
        </Button>
      </Space>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Text style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
          您可以随时在设置中修改隐私偏好
        </Text>
      </div>
    </Modal>
  );
};

export default PrivacyConsent;
