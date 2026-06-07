import React, { useState, useEffect } from 'react';
import { Modal, Switch, Radio, Button, Typography, Space, Divider, Popconfirm } from 'antd';
import {
  SafetyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import {
  getConsentRecord,
  setConsentRecord,
  getPrivacySettings,
  updatePrivacySettings,
  clearAllLocalData,
  getStoredDataSummary,
} from '../../services/consent';
import type {
  ConsentSettings,
  PrivacySettings as PrivacySettingsType,
} from '../../services/consent';

const { Text } = Typography;

interface PrivacySettingsProps {
  visible: boolean;
  onClose: () => void;
}

const sectionTitleStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontWeight: 600,
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 0',
};

const PrivacySettings: React.FC<PrivacySettingsProps> = ({ visible, onClose }) => {
  const existingRecord = getConsentRecord();
  const initialSettings: ConsentSettings = existingRecord
    ? existingRecord.settings
    : { analytics: false, drafts: false, logging: false };

  const [consentSettings, setConsentSettings] = useState<ConsentSettings>(initialSettings);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettingsType>(getPrivacySettings());
  const [dataSummary, setDataSummary] = useState<{ key: string; size: number }[]>([]);

  useEffect(() => {
    if (visible) {
      const record = getConsentRecord();
      setConsentSettings(
        record ? record.settings : { analytics: false, drafts: false, logging: false }
      );
      setPrivacySettings(getPrivacySettings());
      setDataSummary(getStoredDataSummary());
    }
  }, [visible]);

  const handleConsentToggle = (key: keyof ConsentSettings) => (checked: boolean) => {
    setConsentSettings((prev) => ({ ...prev, [key]: checked }));
  };

  const handleRetentionChange = (e: any) => {
    setPrivacySettings({ dataRetentionMonths: e.target.value });
  };

  const handleSave = () => {
    // Update consent record with current settings
    const record = getConsentRecord();
    if (record) {
      setConsentRecord({
        ...record,
        settings: consentSettings,
        timestamp: new Date().toISOString(),
      });
    }

    // Update privacy settings
    updatePrivacySettings(privacySettings);

    onClose();
  };

  const handleClearAllData = () => {
    clearAllLocalData();
    setDataSummary([]);
  };

  const handleExportData = () => {
    const exportData: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('vidforge_')) {
        exportData[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vidforge-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      title={
        <Space>
          <SafetyOutlined style={{ color: 'var(--brand-primary)' }} />
          <span style={{ color: 'var(--text-primary)' }}>隐私与安全设置</span>
        </Space>
      }
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            onClick={handleSave}
            style={{
              background:
                'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
              border: 'none',
            }}
          >
            保存设置
          </Button>
        </Space>
      }
      width={520}
      centered
      styles={{
        content: {
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
        },
        header: {
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-color)',
          padding: '16px 24px',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        },
        body: {
          padding: 24,
          maxHeight: 520,
          overflow: 'auto',
        },
        footer: {
          borderTop: '1px solid var(--border-color)',
          padding: '12px 24px',
        },
        mask: {
          background: 'rgba(0, 0, 0, 0.6)',
        },
      }}
    >
      {/* Section 1: 数据同意偏好 */}
      <div style={sectionTitleStyle}>
        <SafetyOutlined style={{ color: 'var(--brand-primary)' }} />
        <span>数据同意偏好</span>
      </div>
      <div
        style={{
          background: 'var(--bg-surface-2)',
          borderRadius: 'var(--radius-md)',
          padding: '4px 16px',
          marginBottom: 24,
        }}
      >
        <div style={toggleRowStyle}>
          <Text style={{ color: 'var(--text-primary)' }}>草稿自动保存</Text>
          <Switch checked={consentSettings.drafts} onChange={handleConsentToggle('drafts')} />
        </div>
        <Divider style={{ margin: 0, borderColor: 'var(--border-color)' }} />
        <div style={toggleRowStyle}>
          <Text style={{ color: 'var(--text-primary)' }}>使用统计和分析</Text>
          <Switch checked={consentSettings.analytics} onChange={handleConsentToggle('analytics')} />
        </div>
        <Divider style={{ margin: 0, borderColor: 'var(--border-color)' }} />
        <div style={toggleRowStyle}>
          <Text style={{ color: 'var(--text-primary)' }}>调试日志</Text>
          <Switch checked={consentSettings.logging} onChange={handleConsentToggle('logging')} />
        </div>
      </div>

      <Divider style={{ borderColor: 'var(--border-color)', margin: '0 0 20px 0' }} />

      {/* Section 2: 数据保留 */}
      <div style={sectionTitleStyle}>
        <DatabaseOutlined style={{ color: 'var(--brand-primary)' }} />
        <span>数据保留</span>
      </div>
      <div
        style={{
          background: 'var(--bg-surface-2)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: 24,
        }}
      >
        <Text
          style={{
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-sm)',
            display: 'block',
            marginBottom: 12,
          }}
        >
          本地数据保留期限
        </Text>
        <Radio.Group
          value={privacySettings.dataRetentionMonths}
          onChange={handleRetentionChange}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <Radio value={1} style={{ color: 'var(--text-primary)' }}>
            1 个月
          </Radio>
          <Radio value={3} style={{ color: 'var(--text-primary)' }}>
            3 个月
          </Radio>
          <Radio value={6} style={{ color: 'var(--text-primary)' }}>
            6 个月
          </Radio>
          <Radio value={12} style={{ color: 'var(--text-primary)' }}>
            12 个月
          </Radio>
        </Radio.Group>
      </div>

      <Divider style={{ borderColor: 'var(--border-color)', margin: '0 0 20px 0' }} />

      {/* Section 3: 管理本地数据 */}
      <div style={sectionTitleStyle}>
        <DatabaseOutlined style={{ color: 'var(--brand-primary)' }} />
        <span>管理本地数据</span>
      </div>
      <div
        style={{
          background: 'var(--bg-surface-2)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: 16,
        }}
      >
        {dataSummary.length === 0 ? (
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
            暂无本地存储数据
          </Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {dataSummary.map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 0',
                }}
              >
                <Text style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                  {item.key}
                </Text>
                <Text style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                  {formatSize(item.size)}
                </Text>
              </div>
            ))}
          </div>
        )}

        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportData}
            style={{
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              background: 'transparent',
            }}
          >
            导出数据
          </Button>
          <Popconfirm
            title="确认清除"
            description="此操作将清除所有本地存储的 VidForge 数据，此操作不可撤销。"
            onConfirm={handleClearAllData}
            okText="确认"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              style={{
                border: '1px solid var(--color-error)',
                color: 'var(--color-error)',
                background: 'transparent',
              }}
            >
              清除所有本地数据
            </Button>
          </Popconfirm>
        </Space>
      </div>
    </Modal>
  );
};

export default PrivacySettings;
