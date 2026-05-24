import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

// Initialize theme before React renders to prevent flash
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
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
          },
        }}
      >
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
