import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  ApiOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  DatabaseOutlined,
  EditOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  aiApi,
  ArkConfigPublic,
  ArkDiagnoseResult,
  UpdateArkConfigPayload,
} from '../../services/ai';

const { Text, Paragraph } = Typography;

type SourceTagInfo = {
  color: string;
  label: string;
  icon: React.ReactNode;
  desc: string;
};

const SOURCE_META: Record<NonNullable<ArkConfigPublic['apiKeySource']>, SourceTagInfo> = {
  db: {
    color: 'cyan',
    label: 'DB Override',
    icon: <DatabaseOutlined />,
    desc: '已被 API 配置中心写入并持久化',
  },
  env: {
    color: 'blue',
    label: '环境变量',
    icon: <ThunderboltOutlined />,
    desc: '由部署平台 env 注入',
  },
  builtin: {
    color: 'default',
    label: '未配置默认',
    icon: <ExperimentOutlined />,
    desc: '公开仓库不提供默认凭证',
  },
};

interface ApiStatusCenterProps {
  /** 触发器,如果不传则用默认 Tag */
  trigger?: React.ReactElement;
}

interface EditState {
  modelKey: string;
  endpointId: string;
  apiKey: string;
  modelName: string;
}

export default function ApiStatusCenter({ trigger }: ApiStatusCenterProps) {
  const [open, setOpen] = useState(false);
  const [configs, setConfigs] = useState<ArkConfigPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [pingState, setPingState] = useState<{
    loading: boolean;
    result?: ArkDiagnoseResult;
  }>({ loading: false });
  const [editing, setEditing] = useState<EditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const list = await aiApi.getConfigs();
      setConfigs(list);
    } catch (err: any) {
      message.error(err?.message ?? '加载模型配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 启动时静默拉一次,以便 Tag tooltip 显示状态
  useEffect(() => {
    loadConfigs();
  }, []);

  // 打开抽屉时刷新一次
  useEffect(() => {
    if (open) {
      loadConfigs();
      setPingState({ loading: false });
    }
  }, [open]);

  const handlePing = async () => {
    setPingState({ loading: true });
    try {
      const result = await aiApi.diagnose();
      setPingState({ loading: false, result });
      if (result.ok) {
        message.success(`Ping 成功 (${result.durationMs ?? '-'} ms)`);
      } else {
        message.error(`Ping 失败: ${result.reason ?? '未知错误'}`);
      }
    } catch (err: any) {
      setPingState({
        loading: false,
        result: { ok: false, stage: 'call', reason: err?.message ?? '请求失败' },
      });
      message.error(err?.message ?? 'Ping 请求失败');
    }
  };

  const handleClearOverride = async (modelKey: string) => {
    Modal.confirm({
      title: `清除 [${modelKey}] 的 DB override?`,
      content: '清除后该模型将回落到环境变量配置，请确认。',
      okText: '清除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await aiApi.clearOverride(modelKey);
          message.success('已清除 override,已回落到 env/builtin');
          await loadConfigs();
        } catch (err: any) {
          message.error(err?.message ?? '清除失败');
        }
      },
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const endpointId = editing.endpointId.trim();
    const apiKey = editing.apiKey.trim();
    if (!endpointId || !apiKey) {
      message.warning('endpointId 和 apiKey 都不能为空');
      return;
    }
    setSavingEdit(true);
    try {
      const payload: UpdateArkConfigPayload = { endpointId, apiKey };
      await aiApi.updateConfig(editing.modelKey, payload);
      message.success(`[${editing.modelKey}] 已写入 DB,立即生效`);
      setEditing(null);
      await loadConfigs();
    } catch (err: any) {
      message.error(err?.message ?? '保存失败');
    } finally {
      setSavingEdit(false);
    }
  };

  const text = configs.find((c) => c.key === 'text-primary');
  const video = configs.find((c) => c.key === 'video-primary');

  const overallStatus = useMemo(() => {
    if (!configs.length) return { ok: false, color: 'default', label: '未加载' };
    return { ok: true, color: 'success', label: 'API 已连接' };
  }, [configs]);

  const triggerEl = trigger ? (
    <span onClick={() => setOpen(true)}>{trigger}</span>
  ) : (
    <Tooltip
      title={
        <div style={{ minWidth: 200 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>ARK 模型连接状态</div>
          {text && (
            <div style={{ fontSize: 12 }}>
              · 文本:{text.name} ({SOURCE_META[text.apiKeySource ?? 'builtin'].label})
            </div>
          )}
          {video && (
            <div style={{ fontSize: 12 }}>
              · 视频:{video.name} ({SOURCE_META[video.apiKeySource ?? 'builtin'].label})
            </div>
          )}
          <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>点击打开 API 配置中心</div>
        </div>
      }
    >
      <Tag
        color={overallStatus.color}
        onClick={() => setOpen(true)}
        style={{
          margin: 0,
          borderRadius: 'var(--radius-md)',
          fontWeight: 500,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        icon={<ApiOutlined />}
      >
        {overallStatus.label}
      </Tag>
    </Tooltip>
  );

  return (
    <>
      {triggerEl}
      <Drawer
        title={
          <Space>
            <ApiOutlined />
            <span>API 配置中心</span>
          </Space>
        }
        placement="right"
        width={520}
        open={open}
        onClose={() => setOpen(false)}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={loadConfigs}>
              刷新
            </Button>
          </Space>
        }
      >
        <Paragraph style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          管理 VidForge 调用的火山方舟 ARK 模型。修改后会写入数据库 (
          <code>ark_model_overrides</code>),立即对所有用户生效;清除则回落到环境变量 /
          环境变量或数据库中的配置。
        </Paragraph>

        {pingState.result && (
          <Alert
            type={pingState.result.ok ? 'success' : 'error'}
            showIcon
            style={{ marginBottom: 16 }}
            message={
              pingState.result.ok
                ? `Ping 成功 (${pingState.result.durationMs ?? '-'} ms)`
                : `Ping 失败:${pingState.result.reason ?? '未知错误'}`
            }
            description={
              <div style={{ fontSize: 12 }}>
                {pingState.result.sample && <div>响应样例:{pingState.result.sample}</div>}
                {pingState.result.hint && <div>{pingState.result.hint}</div>}
              </div>
            }
          />
        )}

        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {[text, video].map((cfg) => {
            if (!cfg) return null;
            const meta = SOURCE_META[cfg.apiKeySource ?? 'builtin'];
            const isText = cfg.type === 'text';
            return (
              <Card
                key={cfg.key}
                size="small"
                title={
                  <Space>
                    <CheckCircleFilled style={{ color: '#10b981' }} />
                    <span>{cfg.name}</span>
                    <Tag color={meta.color} icon={meta.icon}>
                      {meta.label}
                    </Tag>
                  </Space>
                }
                extra={
                  <Space size={4}>
                    {isText && (
                      <Tooltip title="发送一次最小请求,实测连通性">
                        <Button
                          size="small"
                          type="primary"
                          icon={<ThunderboltOutlined />}
                          loading={pingState.loading}
                          onClick={handlePing}
                        >
                          Ping
                        </Button>
                      </Tooltip>
                    )}
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() =>
                        setEditing({
                          modelKey: cfg.key,
                          endpointId: cfg.endpointId,
                          apiKey: '',
                          modelName: cfg.name,
                        })
                      }
                    >
                      编辑
                    </Button>
                    {cfg.apiKeySource === 'db' && (
                      <Tooltip title="清除 DB override,回落到 env/builtin">
                        <Button size="small" danger onClick={() => handleClearOverride(cfg.key)}>
                          清除
                        </Button>
                      </Tooltip>
                    )}
                  </Space>
                }
              >
                <Descriptions
                  size="small"
                  column={1}
                  labelStyle={{ width: 100, color: 'var(--text-tertiary)' }}
                  contentStyle={{ color: 'var(--text-primary)' }}
                >
                  <Descriptions.Item label="模型 key">
                    <Text code>{cfg.key}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Endpoint ID">
                    <Text code>{cfg.endpointId}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="API Key">
                    <Text code>{cfg.apiKey || '-'}</Text>
                    {cfg.apiKeyFingerprint && (
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        (len {cfg.apiKeyFingerprint.length})
                      </Text>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="来源说明">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {meta.desc}
                    </Text>
                  </Descriptions.Item>
                  {cfg.rateLimit && (
                    <Descriptions.Item label="限速">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {cfg.rateLimit}
                      </Text>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            );
          })}
        </Space>

        <Card size="small" style={{ marginTop: 16 }}>
          <Space direction="vertical" size={4}>
            <Text strong style={{ fontSize: 13 }}>
              <CloseCircleFilled style={{ color: '#ef4444', marginRight: 6 }} />
              安全提示
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              · 当前任意登录用户都可修改 key,后续会接入管理员角色
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              · DB 中存储为明文,生产环境建议结合 KMS / 密钥管理服务
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              · 优先级:DB override &gt; env；公开仓库不包含默认凭证
            </Text>
          </Space>
        </Card>
      </Drawer>

      <Modal
        title={editing ? `编辑 ${editing.modelName} (${editing.modelKey})` : ''}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={handleSaveEdit}
        okText="保存并立即生效"
        confirmLoading={savingEdit}
        destroyOnClose
      >
        {editing && (
          <Form layout="vertical">
            <Form.Item
              label="Endpoint ID"
              extra="火山方舟控制台中创建的接入点 ID,例如 ep-2026...-xxxx"
            >
              <Input
                value={editing.endpointId}
                onChange={(e) => setEditing({ ...editing, endpointId: e.target.value })}
                placeholder="ep-..."
              />
            </Form.Item>
            <Form.Item
              label="API Key"
              extra="留空表示沿用原 key,只改 endpoint。新 key 将以明文保存到 ark_model_overrides 表。"
            >
              <Input.Password
                value={editing.apiKey}
                onChange={(e) => setEditing({ ...editing, apiKey: e.target.value })}
                placeholder="ark-..."
              />
            </Form.Item>
            <Alert
              type="info"
              showIcon
              message="保存后立即对所有用户生效;若想恢复 env/builtin,点击卡片右上角「清除」按钮即可。"
              style={{ marginTop: 8 }}
            />
          </Form>
        )}
      </Modal>
    </>
  );
}
