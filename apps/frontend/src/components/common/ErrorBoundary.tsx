import { Component, ReactNode, ErrorInfo } from 'react';
import { Button, Typography, Space } from 'antd';
import { WarningOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, flexDirection: 'column', gap: 16 }}>
          <WarningOutlined style={{ fontSize: 48, color: '#ef4444' }} />
          <Title level={4} style={{ color: 'var(--text-primary)', margin: 0 }}>页面出现异常</Title>
          <Text style={{ color: 'var(--text-secondary)', maxWidth: 400, textAlign: 'center' }}>
            {this.state.error?.message || '未知错误'}
          </Text>
          <Space>
            <Button type="primary" icon={<ReloadOutlined />} onClick={this.handleReset}>重试</Button>
            <Button onClick={() => window.location.href = '/dashboard'}>返回首页</Button>
          </Space>
        </div>
      );
    }
    return this.props.children;
  }
}
