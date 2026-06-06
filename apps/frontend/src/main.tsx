import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import { useTheme } from './hooks/useTheme';
import './index.css';

// Register Service Worker for PWA
(function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
})();

// Initialize theme before React renders to prevent flash
(function initTheme() {
  const stored = localStorage.getItem('vidforge_theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = (stored === 'dark' || stored === 'light') ? stored : (prefersLight ? 'light' : 'dark');
  document.documentElement.classList.add(theme === 'dark' ? 'dark-mode' : 'light-mode');
})();

/**
 * 把 ConfigProvider 抽到组件内,让 antd 主题算法跟随 useTheme() 实时切换。
 * 否则 ConfigProvider 在 main 里只读取一次 dark-mode class,主题切换后 antd 不会重新换算法,
 * 导致浅色模式下 antd 内置组件(按钮/表单/Modal/Dropdown 等)还呈现深色。
 */
function ThemedAntApp() {
  const { isDark } = useTheme();
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 8,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
        },
      }}
    >
      <App />
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemedAntApp />
    </BrowserRouter>
  </React.StrictMode>,
);
