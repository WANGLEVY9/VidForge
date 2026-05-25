import { useEffect, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * 鉴权路由守卫：
 * - 启动时尝试用本地 token 拉一次 me() 验证
 * - 未登录跳 /auth/login 并保留 redirect 参数
 * - bootstrap 期间显示加载态
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    if (!bootstrapped) bootstrap();
  }, [bootstrapped, bootstrap]);

  if (!bootstrapped) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!token) {
    const redirect = location.pathname + location.search;
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <>{children}</>;
}
