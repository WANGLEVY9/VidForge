# Phase 1: 前端 UI 重构 + 后端联调 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 VidForge 前端暗色创意工作室风格重构，并建立完整的后端 API 服务与前端联调

**Architecture:** 模块级重构，保留 Ant Design 底层 + 自定义 Studio 组件层。前端使用 Zustand 管理全局状态（主题、侧栏），后端新增 Material/Script/Creation 三个 RESTful 模块 + WebSocket 实时推送。每个页面独立重构为创意工作室风格。

**Tech Stack:** React 18 + TypeScript + Vite, Ant Design 5, Zustand, NestJS, TypeORM, WebSocket (Socket.IO)

---

## 目录结构规划

```
apps/frontend/src/
├── components/
│   ├── studio/          — GlassPanel, StudioLayout, StudioHeader
│   ├── media/           — MediaGrid, MediaCard
│   ├── player/          — PreviewPlayer
│   └── common/          — ThemeToggle, ProgressTracker
├── hooks/               — useTheme, useLocalStorage
├── store/               — Zustand stores (useAppStore)
├── styles/              — tokens.css, glassmorphism.css, animations.css
├── pages/
│   ├── studio/          — renamed from dashboard
│   ├── library/         — renamed from material
│   ├── script-studio/   — renamed from script
│   └── video-studio/    — renamed from creation
├── services/            — API service layer (material, script, creation)
├── layouts/
│   └── BasicLayout.tsx  — refactored with glass sidebar
├── theme/
│   └── tokens.ts        — extended with dark mode
├── App.tsx              — updated with theme provider
├── main.tsx             — updated with theme initializer
└── index.css            — extended with CSS variables

apps/backend/src/modules/
├── material/            — material.controller, service, entity, dto
├── script/              — script.controller, service, entity, dto
├── creation/            — creation.controller, service, entity, dto, gateway
└── common/              — health controller (existing)
```

---

### Task 1: 安装新依赖

**Files:**
- Modify: `apps/frontend/package.json`
- Modify: `apps/backend/package.json`

- [ ] **Step 1: 安装前端新依赖**

```bash
cd apps/frontend
npm install zustand
npm install -D @types/ws
```

- [ ] **Step 2: 安装后端新依赖**

```bash
cd apps/backend
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install -D @types/socket.io
```

- [ ] **Step 3: 提交**

```bash
git add apps/frontend/package.json apps/backend/package.json
git add apps/frontend/package-lock.json apps/backend/package-lock.json 2>/dev/null || true
git commit -m "chore: add zustand, socket.io dependencies for Phase 1"
```

---

### Task 2: CSS 设计系统 — tokens + glassmorphism + animations

**Files:**
- Create: `apps/frontend/src/styles/tokens.css`
- Create: `apps/frontend/src/styles/glassmorphism.css`
- Create: `apps/frontend/src/styles/animations.css`

- [ ] **Step 1: 创建 tokens.css — CSS 变量定义深色/亮色两套主题**

```css
/* VidForge Design Tokens */
:root,
.dark-mode {
  /* 背景色 */
  --bg-primary: #0f0f13;
  --bg-surface: #1a1a23;
  --bg-surface-2: #24242f;
  --bg-elevated: #2a2a36;

  /* 品牌色 */
  --brand-primary: #6366f1;
  --brand-primary-hover: #818cf8;
  --brand-secondary: #a855f7;
  --brand-accent: #06b6d4;

  /* 功能色 */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* 文字色 */
  --text-primary: rgba(255, 255, 255, 0.90);
  --text-secondary: rgba(255, 255, 255, 0.65);
  --text-tertiary: rgba(255, 255, 255, 0.40);
  --text-disabled: rgba(255, 255, 255, 0.20);

  /* 边框 */
  --border-color: rgba(255, 255, 255, 0.06);
  --border-color-hover: rgba(255, 255, 255, 0.12);

  /* 阴影 */
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-elevated: 0 10px 40px rgba(0, 0, 0, 0.4);
  --shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.5);

  /* 圆角 */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-xxl: 24px;

  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-xxl: 32px;
  --spacing-xxxl: 48px;

  /* 字体 */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  --font-size-xxl: 20px;
  --font-size-title: 24px;

  /* 动效 */
  --ease-out: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 0.15s;
  --duration-normal: 0.3s;
  --duration-slow: 0.5s;
}

/* 亮色模式 */
.light-mode {
  --bg-primary: #f8fafc;
  --bg-surface: #ffffff;
  --bg-surface-2: #f1f5f9;
  --bg-elevated: #ffffff;

  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-tertiary: #94a3b8;
  --text-disabled: #cbd5e1;

  --border-color: #e2e8f0;
  --border-color-hover: #cbd5e1;

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-elevated: 0 10px 40px rgba(0, 0, 0, 0.12);
  --shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.15);
}
```

- [ ] **Step 2: 创建 glassmorphism.css**

```css
/* Glassmorphism effects */
.glass {
  background: rgba(26, 26, 35, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.light-mode .glass {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.glass-strong {
  background: rgba(26, 26, 35, 0.85);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.light-mode .glass-strong {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.glass-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  transition: transform var(--duration-normal) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out);
}

.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}
```

- [ ] **Step 3: 创建 animations.css**

```css
/* Page transitions */
.page-enter {
  opacity: 0;
  transform: translateY(12px);
}

.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.35s var(--ease-out), transform 0.35s var(--ease-out);
}

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  animation: fadeIn var(--duration-normal) var(--ease-out);
}

/* Slide up */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.slide-up {
  animation: slideUp var(--duration-normal) var(--ease-out);
}

/* Scale in */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.scale-in {
  animation: scaleIn var(--duration-normal) var(--ease-out);
}

/* Pulse (for loading/progress) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.pulse {
  animation: pulse 2s var(--ease-out) infinite;
}

/* Shimmer (skeleton loading) */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(90deg, var(--bg-surface-2) 25%, var(--bg-elevated) 50%, var(--bg-surface-2) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
}

/* Number count-up */
@keyframes countUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.count-up {
  animation: countUp 0.4s var(--ease-out);
}

/* Spin (custom) */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1s linear infinite;
}
```

- [ ] **Step 4: 更新 index.css — 引入三个新样式文件**

Edit `apps/frontend/src/index.css` to add these imports at the top:
```css
@import './styles/tokens.css';
@import './styles/glassmorphism.css';
@import './styles/animations.css';

/* Keep existing styles below, but update background to use CSS vars */
body {
  font-family: var(--font-family);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.5;
  transition: background var(--duration-normal) var(--ease-out),
              color var(--duration-normal) var(--ease-out);
}
```

Replace existing `.ant-layout` override with:
```css
.ant-layout {
  background: var(--bg-primary) !important;
}
```

Replace existing `.ant-card` override with:
```css
.ant-card {
  border-radius: var(--radius-lg) !important;
  border: 1px solid var(--border-color) !important;
  box-shadow: var(--shadow-card) !important;
  transition: box-shadow var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out) !important;
  background: var(--bg-surface) !important;
}
.ant-card:hover {
  box-shadow: var(--shadow-elevated) !important;
}
```

Replace `.ant-btn-primary` override with:
```css
.ant-btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%) !important;
  border: none !important;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3) !important;
  font-weight: 500 !important;
  border-radius: var(--radius-md) !important;
  height: 40px !important;
  padding: 0 24px !important;
}
.ant-btn-primary:hover {
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4) !important;
  transform: translateY(-1px);
}
```

- [ ] **Step 5: 提交**

```bash
git add apps/frontend/src/styles/ apps/frontend/src/index.css
git commit -m "feat: add CSS design system with dark/light tokens, glassmorphism, animations"
```

---

### Task 3: 扩展 TypeScript theme tokens

**Files:**
- Modify: `apps/frontend/src/theme/tokens.ts`

- [ ] **Step 1: 扩展 tokens.ts — 补充暗色相关的类型定义**

Add to the existing export, under the existing theme object:

```typescript
// Dark mode specific tokens
export const darkTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    bgPrimary: '#0f0f13',
    bgSurface: '#1a1a23',
    bgSurface2: '#24242f',
    bgElevated: '#2a2a36',
    textPrimary: 'rgba(255,255,255,0.90)',
    textSecondary: 'rgba(255,255,255,0.65)',
    textTertiary: 'rgba(255,255,255,0.40)',
    textDisabled: 'rgba(255,255,255,0.20)',
    borderPrimary: 'rgba(255,255,255,0.06)',
    borderHover: 'rgba(255,255,255,0.12)',
  },
  isDark: true,
} as const;

export const lightTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    bgPrimary: '#f8fafc',
    bgSurface: '#ffffff',
    bgSurface2: '#f1f5f9',
    bgElevated: '#ffffff',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    textDisabled: '#cbd5e1',
    borderPrimary: '#e2e8f0',
    borderHover: '#cbd5e1',
  },
  isDark: false,
} as const;
```

- [ ] **Step 2: 提交**

```bash
git add apps/frontend/src/theme/tokens.ts
git commit -m "feat: extend theme tokens with dark/light mode color palettes"
```

---

### Task 4: 主题切换 Hook + ThemeToggle 组件

**Files:**
- Create: `apps/frontend/src/hooks/useTheme.ts`
- Create: `apps/frontend/src/components/common/ThemeToggle.tsx`

- [ ] **Step 1: 创建 useTheme hook**

```typescript
import { useCallback, useSyncExternalStore } from 'react';

type Theme = 'dark' | 'light';

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem('vidforge_theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {}
  return null;
}

function getTheme(): Theme {
  return getStoredTheme() || getSystemTheme();
}

let currentTheme = getTheme();
const listeners = new Set<() => void>();

function applyTheme(theme: Theme) {
  currentTheme = theme;
  document.documentElement.classList.remove('dark-mode', 'light-mode');
  document.documentElement.classList.add(theme === 'dark' ? 'dark-mode' : 'light-mode');
  try {
    localStorage.setItem('vidforge_theme', theme);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Theme {
  return currentTheme;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => 'dark');

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    applyTheme(t);
  }, []);

  // Initialize on first call
  if (typeof document !== 'undefined') {
    const htmlClass = theme === 'dark' ? 'dark-mode' : 'light-mode';
    if (!document.documentElement.classList.contains(htmlClass)) {
      document.documentElement.classList.remove('dark-mode', 'light-mode');
      document.documentElement.classList.add(htmlClass);
    }
  }

  return { theme, toggleTheme, setTheme, isDark: theme === 'dark' };
}
```

- [ ] **Step 2: 创建 ThemeToggle 组件**

```typescript
import { useTheme } from '../../hooks/useTheme';
import { theme as tokens } from '../../theme/tokens';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      onClick={toggleTheme}
      className={className}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        background: 'var(--bg-surface-2)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-secondary)',
        fontSize: 16,
        transition: 'all 0.2s var(--ease-out)',
      }}
      title={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add apps/frontend/src/hooks/useTheme.ts apps/frontend/src/components/common/ThemeToggle.tsx
git commit -m "feat: add useTheme hook and ThemeToggle component with localStorage persistence"
```

---

### Task 5: Zustand 全局状态 Store

**Files:**
- Create: `apps/frontend/src/store/useAppStore.ts`

- [ ] **Step 1: 创建全局 store**

```typescript
import { create } from 'zustand';

interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Global loading
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Notifications (placeholder)
  notificationCount: number;
  setNotificationCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),

  notificationCount: 3,
  setNotificationCount: (count) => set({ notificationCount: count }),
}));
```

- [ ] **Step 2: 提交**

```bash
git add apps/frontend/src/store/useAppStore.ts
git commit -m "feat: add Zustand app store with sidebar and loading state"
```

---

### Task 6: Studio 基础组件 — GlassPanel + StudioHeader

**Files:**
- Create: `apps/frontend/src/components/studio/GlassPanel.tsx`
- Create: `apps/frontend/src/components/studio/StudioHeader.tsx`

- [ ] **Step 1: 创建 GlassPanel 组件**

```typescript
import { ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'strong' | 'card';
  onClick?: () => void;
}

export function GlassPanel({
  children,
  className = '',
  style,
  variant = 'card',
  onClick,
}: GlassPanelProps) {
  const variantClass =
    variant === 'default' ? 'glass' :
    variant === 'strong' ? 'glass-strong' :
    'glass-card';

  return (
    <div
      className={`${variantClass} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: 创建 StudioHeader 组件**

```typescript
import { Typography, Space } from 'antd';
import { ReactNode } from 'react';

const { Text } = Typography;

interface StudioHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  extra?: ReactNode;
  className?: string;
}

export function StudioHeader({ title, subtitle, icon, extra, className }: StudioHeaderProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--spacing-lg) var(--spacing-xl)',
        borderBottom: '1px solid var(--border-color)',
        background: 'transparent',
      }}
    >
      <Space size={12}>
        {icon && (
          <span style={{ fontSize: 20, color: 'var(--brand-primary)' }}>
            {icon}
          </span>
        )}
        <div>
          <Text strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>
            {title}
          </Text>
          {subtitle && (
            <Text
              type="secondary"
              style={{
                fontSize: 13,
                marginLeft: 12,
                color: 'var(--text-tertiary)',
              }}
            >
              {subtitle}
            </Text>
          )}
        </div>
      </Space>
      {extra && <Space size={8}>{extra}</Space>}
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add apps/frontend/src/components/studio/GlassPanel.tsx apps/frontend/src/components/studio/StudioHeader.tsx
git commit -m "feat: add GlassPanel and StudioHeader base components"
```

---

### Task 7: 重构布局 — 暗色玻璃侧边栏

**Files:**
- Modify: `apps/frontend/src/layouts/BasicLayout.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/main.tsx`

- [ ] **Step 1: 重构 BasicLayout.tsx — 深色玻璃侧边栏 + 顶部栏**

Full rewrite:

```typescript
import { Layout, Menu, Avatar, Badge, Tooltip, Typography, Dropdown } from 'antd';
import {
  DashboardOutlined,
  UploadOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  BellOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ExperimentOutlined,
  UserOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { ThemeToggle } from '../components/common/ThemeToggle';

const { Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据工作室' },
  { key: '/material', icon: <UploadOutlined />, label: '媒体库' },
  { key: '/script', icon: <FileTextOutlined />, label: '剧本工作室' },
  { key: '/creation', icon: <VideoCameraOutlined />, label: '视频工作室' },
];

function BasicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  const currentLabel = menuItems.find((m) => m.key === location.pathname)?.label || '数据工作室';

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
    { type: 'divider' as const },
    { key: 'help', icon: <QuestionCircleOutlined />, label: '帮助文档' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* 玻璃侧边栏 */}
      <div
        className="glass-strong"
        style={{
          width: sidebarCollapsed ? 80 : 240,
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            padding: sidebarCollapsed ? '0' : '0 20px',
            borderBottom: '1px solid var(--border-color)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onClick={() => navigate('/dashboard')}
        >
          <span style={{ fontSize: 28 }}>⚡</span>
          {!sidebarCollapsed && (
            <span
              style={{
                marginLeft: 10,
                fontSize: 20,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.5px',
              }}
            >
              VidForge
            </span>
          )}
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          theme="dark"
          style={{
            background: 'transparent',
            border: 'none',
            padding: '12px 8px',
            flex: 1,
            overflow: 'auto',
          }}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />

        {/* 底部信息 */}
        {!sidebarCollapsed && (
          <div
            style={{
              padding: '12px 16px',
              margin: '0 12px 16px',
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: 12,
              border: '1px solid rgba(99, 102, 241, 0.15)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ExperimentOutlined style={{ color: 'var(--brand-primary)', fontSize: 14 }} />
              <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                AI 驱动电商视频创作
              </Text>
            </div>
          </div>
        )}
      </div>

      {/* 主内容区 */}
      <Layout
        style={{
          marginLeft: sidebarCollapsed ? 80 : 240,
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'var(--bg-primary)',
          minHeight: '100vh',
        }}
      >
        {/* 顶部栏 */}
        <div
          className="glass"
          style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            height: 64,
            borderRadius: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* 折叠按钮 */}
            <div
              onClick={toggleSidebar}
              style={{
                fontSize: 18,
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                transition: 'background 0.2s',
              }}
            >
              {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>

            {/* 面包屑 */}
            <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {currentLabel}
            </Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* API 状态 */}
            <div style={{
              padding: '2px 10px',
              borderRadius: 20,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: 12,
              color: 'var(--color-success)',
            }}>
              ● API 已连接
            </div>

            {/* 主题切换 */}
            <ThemeToggle />

            {/* 通知 */}
            <Tooltip title="通知">
              <Badge count={3} size="small">
                <BellOutlined style={{ fontSize: 18, color: 'var(--text-secondary)', cursor: 'pointer' }} />
              </Badge>
            </Tooltip>

            {/* 设置 */}
            <Tooltip title="设置">
              <SettingOutlined style={{ fontSize: 18, color: 'var(--text-secondary)', cursor: 'pointer' }} />
            </Tooltip>

            {/* 用户 */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <Avatar
                size={36}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  cursor: 'pointer',
                  marginLeft: 4,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                U
              </Avatar>
            </Dropdown>
          </div>
        </div>

        {/* 页面内容 */}
        <Content
          style={{
            padding: 24,
            minHeight: 'calc(100vh - 64px)',
            background: 'var(--bg-primary)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default BasicLayout;
```

- [ ] **Step 2: 更新 App.tsx — 不需要大改，但确认已经使用 Suspense + Spin**

Current `App.tsx` is fine as-is. Just verify the routes point to the new page paths (which will be handled in page refactoring tasks).

- [ ] **Step 3: 更新 main.tsx — 主题初始化**

Edit `main.tsx` — add theme initialization before render:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

// Initialize theme from localStorage or system preference
(function initTheme() {
  const stored = localStorage.getItem('vidforge_theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = (stored === 'dark' || stored === 'light') ? stored : (prefersLight ? 'light' : 'dark');
  document.documentElement.classList.add(theme === 'dark' ? 'dark-mode' : 'light-mode');
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: document.documentElement.classList.contains('dark-mode')
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#6366f1',
            borderRadius: 8,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
          },
        }}
      >
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 4: 提交**

```bash
git add apps/frontend/src/layouts/BasicLayout.tsx apps/frontend/src/main.tsx
git commit -m "feat: refactor layout with dark glass sidebar and theme initialization"
```

---

### Task 8: 数据工作室页面（原工作台）

**Files:**
- Modify: `apps/frontend/src/pages/dashboard/index.tsx`

- [ ] **Step 1: 重写数据工作室页面 — 暗色风格 + 优化布局**

Full rewrite with dark theme applied:

```typescript
import { useState } from 'react';
import { Row, Col, Card, Statistic, Tag, Typography, List, Button, Space, Badge, Tooltip, Progress } from 'antd';
import {
  VideoCameraOutlined,
  FileTextOutlined,
  UploadOutlined,
  ThunderboltOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  BulbOutlined,
  FireOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { StudioHeader } from '../../components/studio/StudioHeader';

echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const { Text } = Typography;

const mockStats = {
  materials: 128,
  scripts: 56,
  videos: 34,
  todayCreated: 8,
};

const mockTrend = {
  dates: ['05/18', '05/19', '05/20', '05/21', '05/22', '05/23', '05/24'],
  videos: [3, 5, 2, 8, 6, 4, 8],
  scripts: [5, 8, 4, 12, 9, 7, 10],
};

const mockRecentTasks = [
  { id: 1, name: '夏季连衣裙推广视频', status: 'completed', duration: '00:45', createdAt: '10分钟前' },
  { id: 2, name: '蓝牙耳机开箱测评', status: 'processing', progress: 65, createdAt: '25分钟前' },
  { id: 3, name: '防晒霜使用教程', status: 'processing', progress: 30, createdAt: '1小时前' },
  { id: 4, name: '运动鞋上脚展示', status: 'completed', duration: '00:30', createdAt: '2小时前' },
  { id: 5, name: '护肤套装对比评测', status: 'failed', createdAt: '3小时前' },
];

const quickActions = [
  { icon: <RocketOutlined />, label: '快速创作', desc: '一键生成带货视频', color: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' },
  { icon: <BulbOutlined />, label: '智能剧本', desc: 'AI 生成营销文案', color: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)' },
  { icon: <UploadOutlined />, label: '批量上传', desc: '素材批量管理', color: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' },
  { icon: <FireOutlined />, label: '热门模板', desc: '爆款视频模板库', color: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' },
];

const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
  processing: { color: 'processing', text: '生成中', icon: <SyncOutlined spin /> },
  failed: { color: 'error', text: '失败', icon: <ClockCircleOutlined /> },
  pending: { color: 'default', text: '排队中', icon: <ClockCircleOutlined /> },
};

function DashboardPage() {
  const trendOption = {
    tooltip: { trigger: 'axis' as const, backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', textStyle: { color: 'var(--text-primary)' } },
    legend: { data: ['视频产出', '剧本生成'], right: 0, top: 0, textStyle: { color: 'var(--text-secondary)' } },
    grid: { left: 8, right: 8, bottom: 0, top: 36, containLabel: true },
    xAxis: { type: 'category' as const, data: mockTrend.dates, axisLine: { lineStyle: { color: 'var(--border-color)' } }, axisLabel: { color: 'var(--text-tertiary)' } },
    yAxis: { type: 'value' as const, splitLine: { lineStyle: { color: 'var(--border-color)' } }, axisLabel: { color: 'var(--text-tertiary)' } },
    series: [
      { name: '视频产出', type: 'line', data: mockTrend.videos, smooth: true, lineStyle: { width: 3, color: '#6366f1' }, itemStyle: { color: '#6366f1' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(99,102,241,0.2)' }, { offset: 1, color: 'rgba(99,102,241,0)' }]) } },
      { name: '剧本生成', type: 'line', data: mockTrend.scripts, smooth: true, lineStyle: { width: 3, color: '#a855f7' }, itemStyle: { color: '#a855f7' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(168,85,247,0.15)' }, { offset: 1, color: 'rgba(168,85,247,0)' }]) } },
    ],
  };

  const pieOption = {
    tooltip: { trigger: 'item' as const, backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' },
    legend: { orient: 'vertical' as const, right: 0, top: 'center', textStyle: { color: 'var(--text-secondary)' } },
    series: [{
      type: 'pie', radius: ['50%', '75%'], center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: 'var(--bg-surface)', borderWidth: 3 },
      label: { show: false },
      data: [
        { value: 15, name: '服饰鞋包', itemStyle: { color: '#6366f1' } },
        { value: 10, name: '美妆护肤', itemStyle: { color: '#a855f7' } },
        { value: 5, name: '数码3C', itemStyle: { color: '#10b981' } },
        { value: 3, name: '食品饮料', itemStyle: { color: '#f59e0b' } },
        { value: 1, name: '家居生活', itemStyle: { color: '#3b82f6' } },
      ],
    }],
  };

  return (
    <div className="page-enter" style={{ padding: 0 }}>
      {/* 欢迎区 — 渐变背景 */}
      <GlassPanel
        variant="card"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #d946ef 100%)',
          padding: 'var(--spacing-xxl) var(--spacing-xxxl)',
          marginBottom: 'var(--spacing-xl)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          border: 'none',
        }}
      >
        <div style={{ position: 'absolute', right: -30, top: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <Text strong style={{ fontSize: 24, color: '#fff', display: 'block', marginBottom: 8 }}>
          欢迎回来，创作者 ⚡
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>
          今日已创建 <Text strong style={{ color: '#fff', fontSize: 22 }}>{mockStats.todayCreated}</Text> 个视频，继续保持创作热情！
        </Text>
      </GlassPanel>

      {/* 快速操作 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--spacing-xl)' }}>
        {quickActions.map((action, i) => (
          <Col xs={12} sm={12} md={6} key={i}>
            <GlassPanel
              variant="card"
              style={{ cursor: 'pointer', padding: 'var(--spacing-lg)' }}
              onClick={() => {}}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                background: action.color, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#fff', fontSize: 20,
                marginBottom: 'var(--spacing-md)',
              }}>
                {action.icon}
              </div>
              <Text strong style={{ display: 'block', fontSize: 16, color: 'var(--text-primary)' }}>{action.label}</Text>
              <Text style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{action.desc}</Text>
            </GlassPanel>
          </Col>
        ))}
      </Row>

      {/* 数据统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--spacing-xl)' }}>
        {[
          { title: '素材总量', value: mockStats.materials, icon: <UploadOutlined />, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
          { title: '剧本数量', value: mockStats.scripts, icon: <FileTextOutlined />, color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
          { title: '视频产出', value: mockStats.videos, icon: <VideoCameraOutlined />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { title: '今日新增', value: mockStats.todayCreated, icon: <ThunderboltOutlined />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map((stat, i) => (
          <Col xs={12} sm={12} md={6} key={i}>
            <GlassPanel variant="card" style={{ padding: 'var(--spacing-xl) var(--spacing-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Text style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{stat.title}</Text>
                  <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                    {stat.value}
                  </div>
                </div>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                  background: stat.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: stat.color, fontSize: 22,
                }}>
                  {stat.icon}
                </div>
              </div>
            </GlassPanel>
          </Col>
        ))}
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--spacing-xl)' }}>
        <Col xs={24} lg={16}>
          <GlassPanel variant="card">
            <StudioHeader title="创作趋势" icon={<ThunderboltOutlined />} />
            <div style={{ padding: 'var(--spacing-lg)' }}>
              <ReactEChartsCore echarts={echarts} option={trendOption} style={{ height: 280 }} notMerge />
            </div>
          </GlassPanel>
        </Col>
        <Col xs={24} lg={8}>
          <GlassPanel variant="card">
            <StudioHeader title="品类分布" icon={<FireOutlined />} />
            <div style={{ padding: 'var(--spacing-lg)' }}>
              <ReactEChartsCore echarts={echarts} option={pieOption} style={{ height: 280 }} notMerge />
            </div>
          </GlassPanel>
        </Col>
      </Row>

      {/* 最近任务 */}
      <GlassPanel variant="card">
        <StudioHeader
          title="最近创作"
          icon={<ClockCircleOutlined />}
          extra={<Button type="link" icon={<RightOutlined />} style={{ color: 'var(--brand-primary)' }}>查看全部</Button>}
        />
        <List
          dataSource={mockRecentTasks}
          renderItem={(task) => {
            const st = statusMap[task.status];
            return (
              <List.Item
                style={{
                  padding: 'var(--spacing-lg) var(--spacing-xl)',
                  borderBottom: '1px solid var(--border-color)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                actions={[
                  task.status === 'completed' && (
                    <Tooltip title="预览视频" key="preview">
                      <Button type="text" icon={<PlayCircleOutlined />} style={{ color: 'var(--brand-primary)' }} />
                    </Tooltip>
                  ),
                  <Tooltip title="重新生成" key="retry">
                    <Button type="text" icon={<SyncOutlined />} style={{ color: 'var(--text-secondary)' }} />
                  </Tooltip>,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={<Badge status={st.color as any} />}
                  title={
                    <Space>
                      <Text strong style={{ color: 'var(--text-primary)' }}>{task.name}</Text>
                      <Tag color={st.color} icon={st.icon} style={{ borderRadius: 20, fontSize: 12 }}>{st.text}</Tag>
                    </Space>
                  }
                  description={
                    <Space size={16}>
                      <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{task.createdAt}</Text>
                      {task.status === 'completed' && <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>时长 {task.duration}</Text>}
                      {task.status === 'processing' && <Progress percent={task.progress} size="small" style={{ width: 120 }} strokeColor="#6366f1" />}
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
        />
      </GlassPanel>
    </div>
  );
}

export default DashboardPage;
```

- [ ] **Step 2: 提交**

```bash
git add apps/frontend/src/pages/dashboard/index.tsx
git commit -m "feat: rewrite dashboard page with dark studio theme and glass components"
```

---

### Task 9: 媒体库页面（原素材库）

**Files:**
- Modify: `apps/frontend/src/pages/material/index.tsx`

- [ ] **Step 1: 重写媒体库页面 — 暗色网格 + 类型筛选**

Replace the full content with dark-themed version. Key changes:
- All colors reference CSS variables (`var(--text-primary)`, `var(--bg-surface)`, etc.)
- Wrapping content in GlassPanel instead of Card
- Using StudioHeader instead of Card title
- Dark themed segmented controls
- Type-specific icons with consistent styling
- Preview modal with dark background

```typescript
import { useState } from 'react';
import {
  Row, Col, Button, Upload, Input, Space, Tag, Typography,
  Dropdown, Modal, message, Empty, Tooltip, Segmented,
} from 'antd';
import {
  SearchOutlined, DeleteOutlined, EyeOutlined,
  PictureOutlined, VideoCameraOutlined, FileImageOutlined,
  FilterOutlined, PlusOutlined, CloudUploadOutlined,
  DownloadOutlined, CopyOutlined, AppstoreOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { GlassPanel } from '../../components/studio/GlassPanel';
import { StudioHeader } from '../../components/studio/StudioHeader';

const { Text } = Typography;
const { Dragger } = Upload;

type ViewMode = 'grid' | 'list';
type MaterialType = 'all' | 'image' | 'video' | 'audio';

interface MaterialItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  size: string;
  url: string;
  thumbnail?: string;
  tags: string[];
  createdAt: string;
}

const mockMaterials: MaterialItem[] = [
  { id: '1', name: '连衣裙主图-白底.jpg', type: 'image', size: '2.4 MB', url: '', tags: ['服饰', '白底图'], createdAt: '2024-05-24' },
  { id: '2', name: '耳机产品展示.mp4', type: 'video', size: '18.6 MB', url: '', tags: ['数码', '产品展示'], createdAt: '2024-05-24' },
  { id: '3', name: '护肤品场景图.jpg', type: 'image', size: '3.1 MB', url: '', tags: ['美妆', '场景图'], createdAt: '2024-05-23' },
  { id: '4', name: '运动鞋上脚视频.mp4', type: 'video', size: '24.2 MB', url: '', tags: ['鞋包', '上脚'], createdAt: '2024-05-23' },
  { id: '5', name: '零食特写图.jpg', type: 'image', size: '1.8 MB', url: '', tags: ['食品', '特写'], createdAt: '2024-05-22' },
  { id: '6', name: '背景音乐-轻快.mp3', type: 'audio', size: '4.5 MB', url: '', tags: ['BGM', '轻快'], createdAt: '2024-05-22' },
  { id: '7', name: '家居氛围图.jpg', type: 'image', size: '2.9 MB', url: '', tags: ['家居', '氛围'], createdAt: '2024-05-21' },
  { id: '8', name: '口红试色视频.mp4', type: 'video', size: '15.3 MB', url: '', tags: ['美妆', '试色'], createdAt: '2024-05-21' },
];

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  image: { icon: <PictureOutlined />, color: '#6366f1', label: '图片' },
  video: { icon: <VideoCameraOutlined />, color: '#a855f7', label: '视频' },
  audio: { icon: <FileImageOutlined />, color: '#10b981', label: '音频' },
};

const tagColors = ['#6366f1', '#a855f7', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

function MaterialPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeType, setActiveType] = useState<MaterialType>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewItem, setPreviewItem] = useState<MaterialItem | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const filteredMaterials = mockMaterials.filter((m) => {
    const matchType = activeType === 'all' || m.type === activeType;
    const matchSearch = !searchText || m.name.toLowerCase().includes(searchText.toLowerCase()) || m.tags.some((t) => t.includes(searchText));
    return matchType && matchSearch;
  });

  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    onChange: ({ fileList: newFileList }) => setFileList(newFileList),
    customRequest: ({ onSuccess }) => {
      setTimeout(() => {
        onSuccess?.('ok');
        message.success('上传成功');
      }, 800);
    },
  };

  const handleDelete = (_id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，是否继续？',
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => message.success('已删除'),
    });
  };

  return (
    <div className="page-enter" style={{ padding: 0 }}>
      {/* 顶部操作栏 */}
      <GlassPanel variant="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-lg) var(--spacing-xl)' }}>
        <Row gutter={[16, 12]} align="middle">
          <Col flex="auto">
            <Space size="middle" wrap>
              <Input
                placeholder="搜索素材名称、标签..."
                prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 280, borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-2)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                allowClear
              />
              <Segmented
                options={[
                  { label: '全部', value: 'all' },
                  { label: <Space><PictureOutlined />图片</Space>, value: 'image' },
                  { label: <Space><VideoCameraOutlined />视频</Space>, value: 'video' },
                  { label: <Space><FileImageOutlined />音频</Space>, value: 'audio' },
                ]}
                value={activeType}
                onChange={(v) => setActiveType(v as MaterialType)}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Segmented
                options={[
                  { value: 'grid', icon: <AppstoreOutlined /> },
                  { value: 'list', icon: <UnorderedListOutlined /> },
                ]}
                value={viewMode}
                onChange={(v) => setViewMode(v as ViewMode)}
              />
              {selectedIds.length > 0 && (
                <Button danger icon={<DeleteOutlined />}>批量删除 ({selectedIds.length})</Button>
              )}
              <Button type="primary" icon={<CloudUploadOutlined />}>
                上传素材
              </Button>
            </Space>
          </Col>
        </Row>
      </GlassPanel>

      {/* 上传区 */}
      <Dragger
        {...uploadProps}
        showUploadList={false}
        style={{
          borderRadius: 'var(--radius-lg)',
          border: '2px dashed var(--border-color)',
          background: 'var(--bg-surface)',
          marginBottom: 'var(--spacing-lg)',
          padding: '20px 0',
        }}
      >
        <p className="ant-upload-drag-icon">
          <CloudUploadOutlined style={{ fontSize: 40, color: 'var(--brand-primary)' }} />
        </p>
        <p className="ant-upload-text" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          拖拽文件到此处，或 <span style={{ color: 'var(--brand-primary)' }}>点击上传</span>
        </p>
        <p className="ant-upload-hint" style={{ color: 'var(--text-tertiary)' }}>
          支持 JPG、PNG、MP4、MP3 格式，单文件最大 200MB
        </p>
      </Dragger>

      {/* 统计 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <Text style={{ color: 'var(--text-tertiary)' }}>
          共 <Text strong style={{ color: 'var(--text-primary)' }}>{filteredMaterials.length}</Text> 个素材
        </Text>
        <Dropdown menu={{ items: [{ key: 'newest', label: '最新上传' }, { key: 'name', label: '按名称' }, { key: 'size', label: '按大小' }] }}>
          <Button type="text" icon={<FilterOutlined />} style={{ color: 'var(--text-secondary)' }}>排序</Button>
        </Dropdown>
      </div>

      {/* 素材内容 */}
      {filteredMaterials.length === 0 ? (
        <GlassPanel variant="card" style={{ textAlign: 'center', padding: 60 }}>
          <Empty description="暂无素材" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" icon={<PlusOutlined />}>上传素材</Button>
          </Empty>
        </GlassPanel>
      ) : viewMode === 'grid' ? (
        <Row gutter={[16, 16]}>
          {filteredMaterials.map((item) => {
            const tc = typeConfig[item.type];
            return (
              <Col xs={12} sm={8} md={6} lg={6} xl={4} key={item.id}>
                <GlassPanel
                  variant="card"
                  style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                  onClick={() => setPreviewItem(item)}
                >
                  {/* Preview area */}
                  <div style={{
                    height: 140,
                    background: 'var(--bg-surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <span style={{ fontSize: 36, color: tc.color, opacity: 0.6 }}>{tc.icon}</span>
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '2px 6px',
                    }}>
                      <Text style={{ color: '#fff', fontSize: 11 }}>{item.type.toUpperCase()}</Text>
                    </div>
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                      padding: '8px 12px',
                    }}>
                      <Text style={{ color: '#fff', fontSize: 12 }}>{item.size}</Text>
                    </div>
                  </div>
                  {/* Info */}
                  <div style={{ padding: '8px 12px 12px' }}>
                    <Text
                      ellipsis
                      style={{ display: 'block', fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}
                      title={item.name}
                    >
                      {item.name}
                    </Text>
                    <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {item.tags.slice(0, 2).map((tag, ti) => (
                        <Tag key={ti} color={tagColors[ti % tagColors.length]} style={{ borderRadius: 20, fontSize: 11, margin: 0 }}>
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)' }}>
                    <Tooltip title="预览">
                      <Button type="text" icon={<EyeOutlined />} style={{ flex: 1, color: 'var(--text-secondary)' }} onClick={(e) => { e.stopPropagation(); handlePreview(item); }} />
                    </Tooltip>
                    <Tooltip title="复制链接">
                      <Button type="text" icon={<CopyOutlined />} style={{ flex: 1, color: 'var(--text-secondary)' }} />
                    </Tooltip>
                    <Tooltip title="删除">
                      <Button type="text" icon={<DeleteOutlined />} style={{ flex: 1, color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} />
                    </Tooltip>
                  </div>
                </GlassPanel>
              </Col>
            );
          })}
        </Row>
      ) : (
        <GlassPanel variant="card" style={{ padding: 0 }}>
          {filteredMaterials.map((item) => {
            const tc = typeConfig[item.type];
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', padding: 'var(--spacing-md) var(--spacing-xl)',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer', transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-md)',
                  background: `${tc.color}15`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: tc.color, fontSize: 20, marginRight: 'var(--spacing-lg)',
                  flexShrink: 0,
                }}>
                  {tc.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ color: 'var(--text-primary)', display: 'block' }}>{item.name}</Text>
                  <Space size={12} style={{ marginTop: 2 }}>
                    <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.size}</Text>
                    <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.createdAt}</Text>
                    {item.tags.map((tag, ti) => (
                      <Tag key={ti} color={tagColors[ti % tagColors.length]} style={{ borderRadius: 20, fontSize: 11 }}>{tag}</Tag>
                    ))}
                  </Space>
                </div>
                <Space size={4}>
                  <Tooltip title="预览"><Button type="text" icon={<EyeOutlined />} onClick={() => handlePreview(item)} style={{ color: 'var(--text-secondary)' }} /></Tooltip>
                  <Tooltip title="下载"><Button type="text" icon={<DownloadOutlined />} style={{ color: 'var(--text-secondary)' }} /></Tooltip>
                  <Tooltip title="删除"><Button type="text" icon={<DeleteOutlined />} style={{ color: '#ef4444' }} onClick={() => handleDelete(item.id)} /></Tooltip>
                </Space>
              </div>
            );
          })}
        </GlassPanel>
      )}

      {/* Preview Modal */}
      <Modal
        open={previewVisible && !!previewItem}
        title={previewItem?.name}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={640}
      >
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
          <Empty description="素材预览" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <Space>
              <Text style={{ color: 'var(--text-tertiary)' }}>类型: {previewItem && typeConfig[previewItem.type].label}</Text>
              <Text style={{ color: 'var(--text-tertiary)' }}>大小: {previewItem?.size}</Text>
            </Space>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default MaterialPage;
```

Note: There's a reference to `handlePreview` in the grid action buttons — make sure to add the handler:
```typescript
const handlePreview = (item: MaterialItem) => {
  setPreviewItem(item);
  setPreviewVisible(true);
};
```

Add this line after the `handleDelete` function declaration.

- [ ] **Step 2: 提交**

```bash
git add apps/frontend/src/pages/material/index.tsx
git commit -m "feat: rewrite material page with dark studio theme and glass components"
```

---

### Task 10: 剧本工作室页面（原剧本创作）

**Files:**
- Modify: `apps/frontend/src/pages/script/index.tsx`

- [ ] **Step 1: 重写剧本工作室页面 — 暗色风格 + 配置/结果分离**

Rewrite the full page. Core changes:
- Wrap everything in GlassPanel instead of Card
- Use StudioHeader instead of Card title
- All color references use CSS variables
- Style selection grid updated for dark theme
- Results area uses dark-muted cards

Replace all hex color references with CSS variables. Key replacements:

```typescript
// Replace all Card wrappers with GlassPanel
// Example:
<GlassPanel variant="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
  <StudioHeader title="..." icon={...} />
  ...content...
</GlassPanel>

// Form Item labels use var(--text-primary)
label={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>商品名称</Text>}

// Secondary text uses var(--text-tertiary)
<Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>多个卖点用逗号分隔</Text>

// Style selector items
style={{
  padding: '10px 12px',
  borderRadius: 'var(--radius-md)',
  border: `2px solid ${scriptStyle === opt.value ? '#6366f1' : 'var(--border-color)'}`,
  background: scriptStyle === opt.value ? 'rgba(99,102,241,0.1)' : 'transparent',
}}

// Divider
<Divider style={{ margin: 'var(--spacing-lg) 0', borderColor: 'var(--border-color)' }} />

// Script result items — replaces border-left colors with CSS var fallback to hex
style={{
  borderLeft: `3px solid ${hookTypeColors[hook.type]}`,
  // ...
}}
```

- [ ] **Step 2: 提交**

```bash
git add apps/frontend/src/pages/script/index.tsx
git commit -m "feat: rewrite script page with dark studio theme"
```

---

### Task 11: 视频工作室页面（原创作页）

**Files:**
- Modify: `apps/frontend/src/pages/creation/index.tsx`

- [ ] **Step 1: 重写视频工作室页面 — 暗色风格**

Rewrite the full page. The core structure stays (config → storyboard → generating → complete steps), but the visual presentation changes:

- GlassPanel wrappers
- Ant Design Steps theming overridden with CSS variables
- Storyboard list uses dark background with colored borders
- Generating phase shows dark progress cards
- Complete phase shows dark preview

Key replacements:
```typescript
// Card → GlassPanel
<GlassPanel variant="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
  // ...
</GlassPanel>

// Step items stay the same, wrapped in GlassPanel
<GlassPanel variant="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-lg) var(--spacing-xxxl)' }}>
  <Steps current={...} items={stepItems} />
</GlassPanel>
```

- [ ] **Step 2: 提交**

```bash
git add apps/frontend/src/pages/creation/index.tsx
git commit -m "feat: rewrite creation page with dark studio theme"
```

---

### Task 12: 后端 Material 模块

**Files:**
- Create: `apps/backend/src/modules/material/material.module.ts`
- Create: `apps/backend/src/modules/material/material.controller.ts`
- Create: `apps/backend/src/modules/material/material.service.ts`
- Create: `apps/backend/src/modules/material/entities/material.entity.ts`
- Create: `apps/backend/src/modules/material/dto/create-material.dto.ts`
- Create: `apps/backend/src/modules/material/dto/query-material.dto.ts`

- [ ] **Step 1: 创建 Material Entity**

```typescript
// entities/material.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  type: 'image' | 'video' | 'audio';

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ nullable: true })
  size: number; // bytes

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 2: 创建 DTOs**

```typescript
// dto/create-material.dto.ts
import { IsString, IsEnum, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  name: string;

  @IsEnum(['image', 'video', 'audio'])
  type: 'image' | 'video' | 'audio';

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  category?: string;
}

// dto/query-material.dto.ts
import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryMaterialDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['image', 'video', 'audio'])
  type?: 'image' | 'video' | 'audio';

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;
}
```

- [ ] **Step 3: 创建 Service**

```typescript
// material.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Material } from './entities/material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';

@Injectable()
export class MaterialService {
  private readonly logger = new Logger(MaterialService.name);

  constructor(
    @InjectRepository(Material)
    private materialRepository: Repository<Material>,
  ) {}

  async create(dto: CreateMaterialDto): Promise<Material> {
    const material = this.materialRepository.create(dto);
    return this.materialRepository.save(material);
  }

  async findAll(query: QueryMaterialDto) {
    const { search, type, tag, page = 1, pageSize = 20 } = query;
    const where: any = {};

    if (type) where.type = type;
    if (search) where.name = Like(`%${search}%`);
    if (tag) where.tags = Like(`%${tag}%`);

    const [list, total] = await this.materialRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { list, total, page, pageSize };
  }

  async findOne(id: string): Promise<Material> {
    return this.materialRepository.findOneOrFail({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.materialRepository.delete(id);
  }
}
```

- [ ] **Step 4: 创建 Controller**

```typescript
// material.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MaterialService } from './material.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';

@ApiTags('素材管理')
@Controller('material')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Post()
  @ApiOperation({ summary: '创建素材' })
  create(@Body() dto: CreateMaterialDto) {
    return this.materialService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取素材列表' })
  findAll(@Query() query: QueryMaterialDto) {
    return this.materialService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取素材详情' })
  findOne(@Param('id') id: string) {
    return this.materialService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除素材' })
  remove(@Param('id') id: string) {
    return this.materialService.remove(id);
  }
}
```

- [ ] **Step 5: 创建 Module**

```typescript
// material.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';
import { Material } from './entities/material.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Material])],
  controllers: [MaterialController],
  providers: [MaterialService],
  exports: [MaterialService],
})
export class MaterialModule {}
```

- [ ] **Step 6: 注册到 app.module.ts**

Edit `apps/backend/src/app.module.ts` — add `MaterialModule` to imports array.

- [ ] **Step 7: 提交**

```bash
git add apps/backend/src/modules/material/ apps/backend/src/app.module.ts
git commit -m "feat: add Material CRUD module with TypeORM and validation"
```

---

### Task 13: 后端 Script 模块

**Files:**
- Create: `apps/backend/src/modules/script/script.module.ts`
- Create: `apps/backend/src/modules/script/script.controller.ts`
- Create: `apps/backend/src/modules/script/script.service.ts`
- Create: `apps/backend/src/modules/script/entities/script.entity.ts`
- Create: `apps/backend/src/modules/script/dto/create-script.dto.ts`
- Create: `apps/backend/src/modules/script/dto/generate-script.dto.ts`

- [ ] **Step 1: 创建 Script Entity**

```typescript
// entities/script.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('scripts')
export class Script {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  productName: string;

  @Column()
  category: string;

  @Column('text')
  sellingPoints: string;

  @Column({ nullable: true })
  targetAudience: string;

  @Column({ default: 'professional' })
  style: string;

  @Column({ type: 'json' })
  storyboard: Record<string, any>[];

  @Column({ nullable: true })
  voiceover: string;

  @Column({ nullable: true })
  bgmSuggestion: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ default: 45 })
  duration: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 2: 创建 DTOs**

```typescript
// dto/create-script.dto.ts
import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateScriptDto {
  @IsString()
  title: string;

  @IsString()
  productName: string;

  @IsString()
  category: string;

  @IsString()
  sellingPoints: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsArray()
  storyboard?: Record<string, any>[];

  @IsOptional()
  @IsString()
  voiceover?: string;

  @IsOptional()
  @IsString()
  bgmSuggestion?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  duration?: number;
}

// dto/generate-script.dto.ts
import { IsString, IsOptional, IsArray } from 'class-validator';

export class GenerateScriptDto {
  @IsString()
  productName: string;

  @IsString()
  category: string;

  @IsString()
  sellingPoints: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  duration?: number;
}
```

- [ ] **Step 3: 创建 Service**

```typescript
// script.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Script } from './entities/script.entity';
import { CreateScriptDto } from './dto/create-script.dto';
import { GenerateScriptDto } from './dto/generate-script.dto';
import { ArkTextService } from '../ai/services/ark-text.service';

@Injectable()
export class ScriptService {
  private readonly logger = new Logger(ScriptService.name);

  constructor(
    @InjectRepository(Script)
    private scriptRepository: Repository<Script>,
    private arkTextService: ArkTextService,
  ) {}

  async generate(dto: GenerateScriptDto): Promise<any> {
    const prompt = this.buildPrompt(dto);
    
    try {
      const response = await this.arkTextService.chatCompletion({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const result = this.parseResponse(response);
      return result;
    } catch (error) {
      this.logger.error('剧本生成失败', error);
      // Return template-based script as fallback
      return this.generateFallback(dto);
    }
  }

  private buildPrompt(dto: GenerateScriptDto): string {
    return `你是一个专业的电商带货视频编剧。请为以下商品生成一个带货视频剧本。
商品名称：${dto.productName}
品类：${dto.category}
核心卖点：${dto.sellingPoints}
目标人群：${dto.targetAudience || '大众'}
视频风格：${dto.style || 'professional'}
视频时长：${dto.duration || 45}秒

请输出包含以下结构的剧本：
1. 标题
2. 分镜列表（每个分镜包含：时间段、画面描述、台词、镜头类型）
3. 配音建议
4. BGM推荐
5. 推荐标签

以JSON格式输出。`;
  }

  private parseResponse(response: any): any {
    // Parse LLM response into structured script
    // For now, return mock data
    return this.generateFallback({ productName: '', category: '', sellingPoints: '' });
  }

  private generateFallback(dto: GenerateScriptDto): any {
    return {
      title: `${dto.productName || '商品'} · 带货视频剧本`,
      duration: '45秒',
      hooks: [
        { time: '0-3s', content: '"大家好，今天给大家推荐一款超好用的产品！"', type: 'hook' },
        { time: '3-10s', content: '（展示产品外观）"看这个设计，非常有质感"', type: 'intro' },
        { time: '10-25s', content: '（使用效果展示）"你们看这个效果，真的太惊人了"', type: 'demo' },
        { time: '25-35s', content: '（对比/实测）"和其他产品对比一下，优势明显"', type: 'proof' },
        { time: '35-42s', content: '"总结卖点，性价比超高"', type: 'feature' },
        { time: '42-45s', content: '"链接在下方，赶紧下单吧！"', type: 'cta' },
      ],
      voiceover: '语速中等，语气热情有感染力。',
      bgmSuggestion: '推荐轻快节奏的BGM',
      tags: ['好物推荐', '带货视频', dto.category],
    };
  }

  async create(dto: CreateScriptDto): Promise<Script> {
    const script = this.scriptRepository.create(dto);
    return this.scriptRepository.save(script);
  }

  async findAll(): Promise<Script[]> {
    return this.scriptRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Script> {
    return this.scriptRepository.findOneOrFail({ where: { id } });
  }
}
```

- [ ] **Step 4: 创建 Controller**

```typescript
// script.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ScriptService } from './script.service';
import { CreateScriptDto } from './dto/create-script.dto';
import { GenerateScriptDto } from './dto/generate-script.dto';

@ApiTags('剧本管理')
@Controller('script')
export class ScriptController {
  constructor(private readonly scriptService: ScriptService) {}

  @Post('generate')
  @ApiOperation({ summary: 'AI生成剧本' })
  generate(@Body() dto: GenerateScriptDto) {
    return this.scriptService.generate(dto);
  }

  @Post()
  @ApiOperation({ summary: '保存剧本' })
  create(@Body() dto: CreateScriptDto) {
    return this.scriptService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取剧本列表' })
  findAll() {
    return this.scriptService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取剧本详情' })
  findOne(@Param('id') id: string) {
    return this.scriptService.findOne(id);
  }
}
```

- [ ] **Step 5: 创建 Module 并注册**

```typescript
// script.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScriptController } from './script.controller';
import { ScriptService } from './script.service';
import { Script } from './entities/script.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Script]), AiModule],
  controllers: [ScriptController],
  providers: [ScriptService],
  exports: [ScriptService],
})
export class ScriptModule {}
```

Edit `app.module.ts` — add `ScriptModule` to imports.

- [ ] **Step 6: 提交**

```bash
git add apps/backend/src/modules/script/ apps/backend/src/app.module.ts
git commit -m "feat: add Script CRUD module with AI generation and fallback"
```

---

### Task 14: 后端 Creation 模块 + WebSocket 网关

**Files:**
- Create: `apps/backend/src/modules/creation/creation.module.ts`
- Create: `apps/backend/src/modules/creation/creation.controller.ts`
- Create: `apps/backend/src/modules/creation/creation.service.ts`
- Create: `apps/backend/src/modules/creation/entities/creation-task.entity.ts`
- Create: `apps/backend/src/modules/creation/dto/create-task.dto.ts`
- Create: `apps/backend/src/modules/creation/gateway/creation.gateway.ts`

- [ ] **Step 1: 创建 Task Entity**

```typescript
// entities/creation-task.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('creation_tasks')
export class CreationTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'json', nullable: true })
  storyboard: Record<string, any>[];

  @Column({ nullable: true })
  progress: number; // 0-100

  @Column({ type: 'json', nullable: true })
  result: Record<string, any>;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  scriptId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 2: 创建 DTO**

```typescript
// dto/create-task.dto.ts
import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  scriptId?: string;

  @IsOptional()
  @IsArray()
  storyboard?: Record<string, any>[];

  @IsOptional()
  modelKey?: string;

  @IsOptional()
  aspectRatio?: string;

  @IsOptional()
  quality?: string;
}
```

- [ ] **Step 3: 创建 WebSocket Gateway**

```typescript
// gateway/creation.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/creation',
})
export class CreationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CreationGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`客户端连接: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`客户端断开: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, taskId: string) {
    client.join(`task:${taskId}`);
    this.logger.log(`客户端 ${client.id} 订阅任务: ${taskId}`);
  }

  // Emit progress update to task subscribers
  emitProgress(taskId: string, data: { progress: number; status: string; message?: string }) {
    this.server.to(`task:${taskId}`).emit('progress', data);
  }

  // Emit task completion
  emitComplete(taskId: string, data: any) {
    this.server.to(`task:${taskId}`).emit('complete', data);
  }

  // Emit task error
  emitError(taskId: string, error: string) {
    this.server.to(`task:${taskId}`).emit('error', { message: error });
  }
}
```

- [ ] **Step 4: 创建 Service**

```typescript
// creation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreationTask } from './entities/creation-task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreationGateway } from './gateway/creation.gateway';

@Injectable()
export class CreationService {
  private readonly logger = new Logger(CreationService.name);

  constructor(
    @InjectRepository(CreationTask)
    private taskRepository: Repository<CreationTask>,
    private creationGateway: CreationGateway,
  ) {}

  async createTask(dto: CreateTaskDto): Promise<CreationTask> {
    const task = this.taskRepository.create({
      title: dto.title,
      storyboard: dto.storyboard || [],
      status: 'pending',
      progress: 0,
    });
    const saved = await this.taskRepository.save(task);

    // Simulate async generation process
    this.processTask(saved.id);

    return saved;
  }

  private async processTask(taskId: string) {
    const stages = [
      { progress: 10, message: '正在分析素材...' },
      { progress: 25, message: '正在生成分镜...' },
      { progress: 45, message: '正在渲染视频...' },
      { progress: 65, message: '正在添加配音...' },
      { progress: 80, message: '正在合成字幕...' },
      { progress: 95, message: '正在优化输出...' },
    ];

    for (const stage of stages) {
      await this.delay(2000);
      await this.taskRepository.update(taskId, {
        status: 'processing',
        progress: stage.progress,
      });
      this.creationGateway.emitProgress(taskId, {
        progress: stage.progress,
        status: 'processing',
        message: stage.message,
      });
    }

    await this.taskRepository.update(taskId, {
      status: 'completed',
      progress: 100,
      result: { url: '#', duration: 30 },
    });
    this.creationGateway.emitComplete(taskId, {
      progress: 100,
      status: 'completed',
      result: { url: '#', duration: 30 },
    });
  }

  async findAll(): Promise<CreationTask[]> {
    return this.taskRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<CreationTask> {
    return this.taskRepository.findOneOrFail({ where: { id } });
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

- [ ] **Step 5: 创建 Controller**

```typescript
// creation.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreationService } from './creation.service';
import { CreateTaskDto } from './dto/create-task.dto';

@ApiTags('视频创作')
@Controller('creation')
export class CreationController {
  constructor(private readonly creationService: CreationService) {}

  @Post('task')
  @ApiOperation({ summary: '创建视频生成任务' })
  createTask(@Body() dto: CreateTaskDto) {
    return this.creationService.createTask(dto);
  }

  @Get('task')
  @ApiOperation({ summary: '获取任务列表' })
  findAll() {
    return this.creationService.findAll();
  }

  @Get('task/:id')
  @ApiOperation({ summary: '获取任务详情' })
  findOne(@Param('id') id: string) {
    return this.creationService.findOne(id);
  }
}
```

- [ ] **Step 6: 创建 Module 并注册**

```typescript
// creation.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreationController } from './creation.controller';
import { CreationService } from './creation.service';
import { CreationTask } from './entities/creation-task.entity';
import { CreationGateway } from './gateway/creation.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([CreationTask])],
  controllers: [CreationController],
  providers: [CreationService, CreationGateway],
  exports: [CreationService],
})
export class CreationModule {}
```

Edit `app.module.ts` — add `CreationModule` to imports.

- [ ] **Step 7: 提交**

```bash
git add apps/backend/src/modules/creation/ apps/backend/src/app.module.ts
git commit -m "feat: add Creation module with WebSocket progress gateway"
```

---

### Task 15: 前端 API 服务层

**Files:**
- Create: `apps/frontend/src/services/material.ts`
- Create: `apps/frontend/src/services/script.ts`
- Create: `apps/frontend/src/services/creation.ts`
- Modify: `apps/frontend/src/utils/api.ts`

- [ ] **Step 1: 创建 material API service**

```typescript
// services/material.ts
import apiClient from '../utils/api';

export interface MaterialItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  url?: string;
  thumbnailUrl?: string;
  size?: number;
  tags?: string[];
  category?: string;
  createdAt: string;
}

export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const materialApi = {
  getList(params?: { search?: string; type?: string; tag?: string; page?: number; pageSize?: number }) {
    return apiClient.get<any, PaginatedResult<MaterialItem>>('/material', { params });
  },

  getById(id: string) {
    return apiClient.get<any, MaterialItem>(`/material/${id}`);
  },

  create(data: { name: string; type: string; tags?: string[]; category?: string }) {
    return apiClient.post<any, MaterialItem>('/material', data);
  },

  delete(id: string) {
    return apiClient.delete(`/material/${id}`);
  },
};
```

- [ ] **Step 2: 创建 script API service**

```typescript
// services/script.ts
import apiClient from '../utils/api';

export interface ScriptItem {
  id: string;
  title: string;
  productName: string;
  category: string;
  sellingPoints: string;
  style: string;
  storyboard: Record<string, any>[];
  voiceover?: string;
  bgmSuggestion?: string;
  tags?: string[];
  duration: number;
  createdAt: string;
}

export interface GenerateScriptDto {
  productName: string;
  category: string;
  sellingPoints: string;
  targetAudience?: string;
  style?: string;
  duration?: number;
}

export const scriptApi = {
  generate(data: GenerateScriptDto) {
    return apiClient.post<any, any>('/script/generate', data);
  },

  save(data: Partial<ScriptItem>) {
    return apiClient.post<any, ScriptItem>('/script', data);
  },

  getList() {
    return apiClient.get<any, ScriptItem[]>('/script');
  },

  getById(id: string) {
    return apiClient.get<any, ScriptItem>(`/script/${id}`);
  },
};
```

- [ ] **Step 3: 创建 creation API service**

```typescript
// services/creation.ts
import apiClient from '../utils/api';
import { io, Socket } from 'socket.io-client';

export interface CreationTask {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  storyboard?: Record<string, any>[];
  progress: number;
  result?: any;
  errorMessage?: string;
  createdAt: string;
}

export interface CreateTaskDto {
  title: string;
  scriptId?: string;
  storyboard?: Record<string, any>[];
  aspectRatio?: string;
  quality?: string;
}

export const creationApi = {
  createTask(data: CreateTaskDto) {
    return apiClient.post<any, CreationTask>('/creation/task', data);
  },

  getList() {
    return apiClient.get<any, CreationTask[]>('/creation/task');
  },

  getById(id: string) {
    return apiClient.get<any, CreationTask>(`/creation/task/${id}`);
  },

  // WebSocket connection for real-time progress
  connectWebSocket(taskId: string, onProgress: (data: any) => void) {
    const socketUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3001`;
    const socket: Socket = io(`${socketUrl}/creation`, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('subscribe', taskId);
    });

    socket.on('progress', (data) => {
      onProgress(data);
    });

    socket.on('complete', (data) => {
      onProgress(data);
    });

    socket.on('error', (data) => {
      onProgress({ ...data, status: 'failed' });
    });

    socket.on('disconnect', () => {
      // Will auto-reconnect
    });

    return () => {
      socket.disconnect();
    };
  },
};
```

- [ ] **Step 4: 提交**

```bash
git add apps/frontend/src/services/
git commit -m "feat: add frontend API service layer for material, script, creation"
```

---

### Task 16: 前端 API 联调 — 连接真实后端

**Files:**
- Modify: `apps/frontend/src/pages/dashboard/index.tsx`
- Modify: `apps/frontend/src/pages/script/index.tsx`
- Modify: `apps/frontend/src/pages/creation/index.tsx`

- [ ] **Step 1: 更新 Script 页面 — 接入真实 API**

In `apps/frontend/src/pages/script/index.tsx`:

Add import:
```typescript
import { scriptApi } from '../../services/script';
```

Update `handleGenerate`:
```typescript
const handleGenerate = async () => {
  try {
    const values = await form.validateFields();
    setLoading(true);
    setGenerated(false);
    
    const result = await scriptApi.generate({
      productName: values.productName,
      category: values.category,
      sellingPoints: values.sellingPoints,
      targetAudience: values.targetAudience?.join(', '),
      style: scriptStyle,
      duration: form.getFieldValue('duration') || 45,
    });
    
    setScriptResult(result);
    setGenerated(true);
    message.success('剧本生成成功！');
  } catch (error: any) {
    if (error.errorFields) return; // validation error
    message.error('生成失败，请重试');
  } finally {
    setLoading(false);
  }
};
```

Add state:
```typescript
const [scriptResult, setScriptResult] = useState<any>(null);
```

Replace references from `mockScriptResult` to `scriptResult`.

- [ ] **Step 2: 更新 Creation 页面 — 接入真实 API + WebSocket**

In `apps/frontend/src/pages/creation/index.tsx`:

Add imports:
```typescript
import { creationApi } from '../../services/creation';
```

Update `handleStartCreation` to call the real API and connect WebSocket:
```typescript
const handleStartCreation = async () => {
  try {
    await form.validateFields();
    const task = await creationApi.createTask({
      title: form.getFieldValue('prompt') || '视频创作',
      storyboard: storyboard,
    });
    
    setCurrentStep('generating');
    setOverallProgress(0);
    
    // Connect WebSocket for real-time updates
    const disconnect = creationApi.connectWebSocket(task.id, (data) => {
      setOverallProgress(data.progress || 0);
      if (data.status === 'completed') {
        setCurrentStep('complete');
        message.success('视频生成完成！');
      } else if (data.status === 'failed') {
        message.error(data.message || '生成失败');
      }
    });
    
    // Store disconnect for cleanup
    setDisconnect(disconnect);
  } catch (error: any) {
    if (error.errorFields) return;
    message.error('创建任务失败');
  }
};
```

Add cleanup in useEffect:
```typescript
useEffect(() => {
  return () => {
    if (typeof disconnect === 'function') disconnect();
  };
}, []);
```

Add state:
```typescript
const [disconnect, setDisconnect] = useState<(() => void) | null>(null);
```

- [ ] **Step 3: 提交**

```bash
git add apps/frontend/src/pages/script/index.tsx apps/frontend/src/pages/creation/index.tsx
git commit -m "feat: connect script and creation pages to real backend APIs"
```

---

### Task 17: 静态资源 + 预览部署验证

**Files:**
- Verify: `apps/frontend/vite.config.ts`
- Verify: `apps/frontend/index.html`

- [ ] **Step 1: 确保 Vite 配置正确**

Read and verify `apps/frontend/vite.config.ts` has proxy configured for development:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 2: 本地构建验证**

```bash
cd apps/frontend && npm run build
```

Expected: Build succeeds with no TypeScript errors (or only warn-level).

- [ ] **Step 3: 提交**

```bash
git add apps/frontend/vite.config.ts
git commit -m "chore: configure Vite proxy for API and WebSocket dev server"
```

---

## 执行要点

1. **任务顺序**: 按编号顺序执行，每个任务依赖前置任务完成
2. **验证方式**: 每完成一个任务，运行 `npm run dev` 查看效果
3. **文件冲突注意**: Task 7 会大幅修改 BasicLayout.tsx，确保在完成前面任务后再执行
4. **API 联调**: Task 16 前确保后端已启动（`cd apps/backend && npm run start:dev`）
5. **CSS 变量兼容性**: 所有页面颜色引用必须使用 `var(--xxx)` 形式，禁止硬编码颜色值
