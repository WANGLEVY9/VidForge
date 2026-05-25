import { Component, ReactNode, ErrorInfo } from 'react';
import { Button, Typography, Space, Collapse } from 'antd';
import { WarningOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack?: string;
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
    this.setState({ componentStack: errorInfo.componentStack ?? undefined });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, componentStack: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const stack = this.state.error?.stack ?? '';
      const compStack = this.state.componentStack ?? '';
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            minHeight: 400,
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 720, width: '100%' }}>
            <Space direction="vertical" align="center" style={{ width: '100%', marginBottom: 24 }}>
              <WarningOutlined style={{ fontSize: 48, color: '#ef4444' }} />
              <Title level={4} style={{ color: 'var(--text-primary)', margin: 0 }}>
                页面出现异常
              </Title>
              <Text style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                {this.state.error?.message || '未知错误'}
              </Text>
              <Space>
                <Button type="primary" icon={<ReloadOutlined />} onClick={this.handleReset}>
                  重试
                </Button>
                <Button onClick={() => window.location.reload()}>刷新页面</Button>
                <Button onClick={() => (window.location.href = '/dashboard')}>返回工作台</Button>
              </Space>
            </Space>
            {(stack || compStack) && (
              <Collapse
                size="small"
                items={[
                  {
                    key: 'stack',
                    label: '错误详情（点击展开）',
                    children: (
                      <Paragraph
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          whiteSpace: 'pre-wrap',
                          color: 'var(--text-secondary)',
                          maxHeight: 320,
                          overflow: 'auto',
                          margin: 0,
                        }}
                      >
                        {stack}
                        {compStack && '\n\nComponent stack:' + compStack}
                      </Paragraph>
                    ),
                  },
                ]}
              />
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
