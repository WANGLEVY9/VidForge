// VidForge 设计系统 - 主题 Tokens
// 科技感 × 电商效率 × AI 智能

export const theme = {
  colors: {
    // 品牌色
    primary: '#6366f1',
    primaryHover: '#818cf8',
    primaryActive: '#4f46e5',
    primaryBg: '#eef2ff',
    
    // 辅助色
    secondary: '#ec4899',
    secondaryHover: '#f472b6',
    
    // 功能色
    success: '#10b981',
    successBg: '#ecfdf5',
    warning: '#f59e0b',
    warningBg: '#fffbeb',
    error: '#ef4444',
    errorBg: '#fef2f2',
    info: '#3b82f6',
    infoBg: '#eff6ff',
    
    // 中性色
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    textDisabled: '#cbd5e1',
    
    // 背景色
    bgLayout: '#f8fafc',
    bgContainer: '#ffffff',
    bgElevated: '#ffffff',
    bgSpotlight: '#f1f5f9',
    
    // 边框
    borderColor: '#e2e8f0',
    borderColorSecondary: '#f1f5f9',
    
    // 渐变
    gradientPrimary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    gradientSecondary: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
    gradientDark: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    gradientCard: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  
  shadows: {
    card: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
    cardHover: '0 10px 25px rgba(0, 0, 0, 0.08), 0 4px 10px rgba(0, 0, 0, 0.04)',
    dropdown: '0 10px 40px rgba(0, 0, 0, 0.12)',
    modal: '0 20px 60px rgba(0, 0, 0, 0.15)',
    glow: '0 0 20px rgba(99, 102, 241, 0.3)',
  },
  
  fonts: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    fontSize: {
      xs: 12,
      sm: 13,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 20,
      xxxl: 24,
      title: 30,
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  animation: {
    durationFast: '0.15s',
    durationNormal: '0.3s',
    durationSlow: '0.5s',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export type Theme = typeof theme;
