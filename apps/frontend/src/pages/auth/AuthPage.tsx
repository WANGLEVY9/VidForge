import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Typography, message, Alert, Divider } from 'antd';
import { RocketOutlined, MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { authApi } from '../../services/auth';
import { useAuthStore } from '../../store/useAuthStore';

const { Title, Text } = Typography;

interface LocalProps {
  mode: 'login' | 'register';
}

export default function AuthPage({ mode }: LocalProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const token = useAuthStore((s) => s.token);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  // 已登录直接跳转
  useEffect(() => {
    if (token) {
      const redirect = searchParams.get('redirect') || '/workspace';
      navigate(redirect, { replace: true });
    }
  }, [token, navigate, searchParams]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      const res =
        mode === 'login'
          ? await authApi.login({ email: values.email, password: values.password })
          : await authApi.register({
              email: values.email,
              username: values.username,
              password: values.password,
            });
      setSession(res.token, res.user);
      message.success(mode === 'login' ? '登录成功' : '注册成功');
      const redirect = searchParams.get('redirect') || '/workspace';
      navigate(redirect, { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        (mode === 'login' ? '登录失败' : '注册失败');
      setError(Array.isArray(msg) ? msg.join('；') : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login({ email: 'demo@vidforge.app', password: 'demo1234' });
      setSession(res.token, res.user);
      message.success('已登录 Demo 账号');
      const redirect = searchParams.get('redirect') || '/workspace';
      navigate(redirect, { replace: true });
    } catch (err: any) {
      setError('Demo 账号当前不可用，请稍后再试或注册新账号');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(80% 60% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%), var(--bg-primary)',
        padding: 24,
      }}
    >
      <div
        className="glass-strong"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '40px 36px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <RocketOutlined
              style={{
                fontSize: 36,
                background:
                  'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            />
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, var(--brand-primary) 0%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              VidForge
            </span>
          </div>
          <Title level={4} style={{ color: 'var(--text-primary)', margin: 0 }}>
            {mode === 'login' ? '欢迎回来' : '创建你的账户'}
          </Title>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
            {mode === 'login'
              ? '登录以继续创作你的电商带货视频'
              : '立即注册，免费体验 AI 视频创作能力'}
          </Text>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 20, borderRadius: 'var(--radius-md)' }}
          />
        )}

        <Form form={form} layout="vertical" size="large" onFinish={handleSubmit}>
          <Form.Item
            name="email"
            label={<Text style={{ color: 'var(--text-primary)' }}>邮箱</Text>}
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="you@example.com" autoComplete="email" />
          </Form.Item>

          {mode === 'register' && (
            <Form.Item
              name="username"
              label={<Text style={{ color: 'var(--text-primary)' }}>昵称</Text>}
              rules={[
                { required: true, message: '请输入昵称' },
                { min: 2, message: '昵称至少 2 个字符' },
                { max: 40, message: '昵称最多 40 个字符' },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="用于平台展示" />
            </Form.Item>
          )}

          <Form.Item
            name="password"
            label={<Text style={{ color: 'var(--text-primary)' }}>密码</Text>}
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={mode === 'register' ? '至少 6 位' : '请输入密码'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            size="large"
            style={{ height: 46, marginTop: 8 }}
          >
            {mode === 'login' ? '登录' : '创建账户'}
          </Button>
        </Form>

        {mode === 'login' && (
          <>
            <Divider style={{ margin: '20px 0', borderColor: 'var(--border-color)' }} plain>
              <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>或</Text>
            </Divider>
            <Button block size="large" onClick={handleDemoLogin} style={{ height: 44 }}>
              使用 Demo 账号体验
            </Button>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          {mode === 'login' ? (
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
              还没有账号？{' '}
              <Link to="/auth/register" style={{ color: 'var(--brand-primary)' }}>
                立即注册
              </Link>
            </Text>
          ) : (
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
              已有账号？{' '}
              <Link to="/auth/login" style={{ color: 'var(--brand-primary)' }}>
                立即登录
              </Link>
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}
