import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { RequireAuth } from './components/common/RequireAuth';
import { useAuthStore } from './store/useAuthStore';
import { useSpaceStore } from './store/useSpaceStore';

// 旧的业务页（暂时复用，后续逐步迁移到 Workspace 板块）
const MaterialPage = lazy(() => import('@/pages/material'));
const ScriptPage = lazy(() => import('@/pages/script'));
const CreationPage = lazy(() => import('@/pages/creation'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const AbComparePage = lazy(() => import('@/pages/ab-compare'));

// 新增页面
const AuthPage = lazy(() => import('@/pages/auth/AuthPage'));
const ProfilePage = lazy(() => import('@/pages/profile'));
const WorkspaceListPage = lazy(() => import('@/pages/workspace/WorkspaceListPage'));
const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const BasicLayout = lazy(() => import('./layouts/BasicLayout'));
const WorkspaceLayout = lazy(() => import('./layouts/WorkspaceLayout'));

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
    <Spin size="large" />
  </div>
);

/**
 * 用户登录后自动加载商品空间
 */
function SpaceBootstrap() {
  const token = useAuthStore((s) => s.token);
  const loaded = useSpaceStore((s) => s.loaded);
  const load = useSpaceStore((s) => s.load);

  useEffect(() => {
    if (token && !loaded) load();
  }, [token, loaded, load]);

  return null;
}

/**
 * 兼容旧路径：/dashboard /material /script /creation /ab-compare
 * 自动跳到当前默认空间下的对应板块
 */
function LegacyRedirect({ tab }: { tab: 'data' | 'material' | 'script' | 'video' | 'ab' }) {
  const navigate = useNavigate();
  const activeId = useSpaceStore((s) => s.activeId);
  const spaces = useSpaceStore((s) => s.spaces);
  const loaded = useSpaceStore((s) => s.loaded);

  useEffect(() => {
    if (!loaded) return;
    const target = activeId ?? spaces[0]?.id;
    if (target) {
      navigate(`/workspace/${target}/${tab}`, { replace: true });
    } else {
      navigate('/workspace', { replace: true });
    }
  }, [loaded, activeId, spaces, navigate, tab]);

  return <Loading />;
}

function App() {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <SpaceBootstrap />
      <Routes>
        {/* 无需登录的开源项目展示页 */}
        <Route
          path="/"
          element={
            <Suspense fallback={<Loading />}>
              <LandingPage />
            </Suspense>
          }
        />

        {/* 鉴权页：不走 BasicLayout */}
        <Route
          path="/auth/login"
          element={
            <Suspense fallback={<Loading />}>
              <AuthPage mode="login" />
            </Suspense>
          }
        />
        <Route
          path="/auth/register"
          element={
            <Suspense fallback={<Loading />}>
              <AuthPage mode="register" />
            </Suspense>
          }
        />

        {/* 受保护的主应用 */}
        <Route
          element={
            <RequireAuth>
              <Suspense fallback={<Loading />}>
                <BasicLayout />
              </Suspense>
            </RequireAuth>
          }
        >
          {/* 商品空间列表 */}
          <Route
            path="workspace"
            element={
              <ErrorBoundary>
                <Suspense fallback={<Loading />}>
                  <WorkspaceListPage />
                </Suspense>
              </ErrorBoundary>
            }
          />

          {/* 单个商品空间内的多板块（带 Tabs 的二级 Layout） */}
          <Route
            path="workspace/:spaceId"
            element={
              <Suspense fallback={<Loading />}>
                <WorkspaceLayout />
              </Suspense>
            }
          >
            <Route index element={<Navigate to="material" replace />} />
            <Route
              path="material"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<Loading />}>
                    <MaterialPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="script"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<Loading />}>
                    <ScriptPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="video"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<Loading />}>
                    <CreationPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="data"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<Loading />}>
                    <DashboardPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="ab"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<Loading />}>
                    <AbComparePage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
          </Route>

          {/* 个人中心 */}
          <Route
            path="profile"
            element={
              <ErrorBoundary>
                <Suspense fallback={<Loading />}>
                  <ProfilePage />
                </Suspense>
              </ErrorBoundary>
            }
          />

          {/* 兼容旧路径 */}
          <Route path="dashboard" element={<LegacyRedirect tab="data" />} />
          <Route path="material" element={<LegacyRedirect tab="material" />} />
          <Route path="script" element={<LegacyRedirect tab="script" />} />
          <Route path="creation" element={<LegacyRedirect tab="video" />} />
          <Route path="ab-compare" element={<LegacyRedirect tab="ab" />} />
        </Route>

        {/* 兜底 404 → 工作台 */}
        <Route path="*" element={<Navigate to="/workspace" replace state={{ from: location }} />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
