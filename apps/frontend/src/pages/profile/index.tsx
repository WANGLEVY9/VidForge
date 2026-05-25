import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, message, Avatar, Tag, Divider, Space, Modal } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, LogoutOutlined } from '@ant-design/icons';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { useAuthStore } from '../../store/useAuthStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { authApi } from '../../services/auth';

const { Title, Text } = Typography;

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearSpaces = useSpaceStore((s) => s.clear);

  const [profileForm] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  if (!user) return null;

  const handleSaveProfile = async (values: any) => {
    setSavingProfile(true);
    try {
      const updated = await authApi.updateProfile({
        username: values.username,
        bio: values.bio,
      });
      patchUser(updated);
      message.success('个人资料已更新');
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '保存失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    setSavingPwd(true);
    try {
      await authApi.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      pwdForm.resetFields();
      message.success('密码已更新，下次登录请使用新密码');
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '修改失败');
    } finally {
      setSavingPwd(false);
    }
  };

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出登录？',
      okText: '退出',
      cancelText: '取消',
      onOk: () => {
        clearSession();
        clearSpaces();
        navigate('/auth/login', { replace: true });
      },
    });
  };

  return (
    <div className="page-enter" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: 'var(--text-primary)', margin: 0 }}>
          个人中心
        </Title>
        <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
          管理你的账户信息与安全设置
        </Text>
      </div>

      {/* 账户信息 */}
      <GlassPanel variant="card" style={{ padding: 24, marginBottom: 16 }}>
        <Space size="large" align="center">
          <Avatar
            size={72}
            style={{
              background:
                'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
              fontSize: 28,
              fontWeight: 600,
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Space>
              <Text strong style={{ color: 'var(--text-primary)', fontSize: 18 }}>
                {user.username}
              </Text>
              {user.role === 'demo' && <Tag color="orange">Demo</Tag>}
              {user.role === 'admin' && <Tag color="purple">管理员</Tag>}
            </Space>
            <div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: 13 }}>
              <MailOutlined /> {user.email}
            </div>
            {user.bio && (
              <div style={{ marginTop: 6, color: 'var(--text-tertiary)', fontSize: 13 }}>
                {user.bio}
              </div>
            )}
          </div>
        </Space>
      </GlassPanel>

      {/* 编辑资料 */}
      <GlassPanel variant="card" style={{ padding: 24, marginBottom: 16 }}>
        <Title level={5} style={{ color: 'var(--text-primary)', marginTop: 0 }}>
          基本资料
        </Title>
        <Form
          form={profileForm}
          layout="vertical"
          initialValues={{ username: user.username, bio: user.bio || '' }}
          onFinish={handleSaveProfile}
        >
          <Form.Item
            name="username"
            label={<Text style={{ color: 'var(--text-primary)' }}>昵称</Text>}
            rules={[
              { required: true, message: '请输入昵称' },
              { min: 2, message: '至少 2 字' },
              { max: 40, message: '最多 40 字' },
            ]}
          >
            <Input prefix={<UserOutlined />} />
          </Form.Item>

          <Form.Item
            name="bio"
            label={<Text style={{ color: 'var(--text-primary)' }}>个人简介</Text>}
            rules={[{ max: 280, message: '最多 280 字' }]}
          >
            <Input.TextArea rows={3} placeholder="一句话介绍你自己..." />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={savingProfile}>
            保存资料
          </Button>
        </Form>
      </GlassPanel>

      {/* 修改密码 */}
      <GlassPanel variant="card" style={{ padding: 24, marginBottom: 16 }}>
        <Title level={5} style={{ color: 'var(--text-primary)', marginTop: 0 }}>
          修改密码
        </Title>
        <Form form={pwdForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="oldPassword"
            label={<Text style={{ color: 'var(--text-primary)' }}>当前密码</Text>}
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label={<Text style={{ color: 'var(--text-primary)' }}>新密码</Text>}
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '至少 6 位' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={<Text style={{ color: 'var(--text-primary)' }}>再次输入新密码</Text>}
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value === getFieldValue('newPassword')) return Promise.resolve();
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={savingPwd}>
            更新密码
          </Button>
        </Form>
      </GlassPanel>

      <Divider style={{ borderColor: 'var(--border-color)' }} />

      <GlassPanel variant="card" style={{ padding: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={5} style={{ color: '#ef4444', margin: 0 }}>
            危险操作
          </Title>
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
            退出登录将清除本地存储的会话信息，下次访问需要重新登录。
          </Text>
          <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>
            退出登录
          </Button>
        </Space>
      </GlassPanel>
    </div>
  );
}
