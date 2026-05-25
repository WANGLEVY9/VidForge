# Phase 4: Mobile Adaptation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make VidForge fully functional and visually cohesive on mobile devices (<768px) by adding a responsive shell with bottom tab navigation, touch interactions, and page-level responsive layouts.

**Architecture:** A `MobileShell` component wraps the existing `BasicLayout` content. It uses `matchMedia` breakpoint detection to swap between desktop sidebar and mobile bottom-tab navigation. The existing Ant Design Layout + Outlet pattern remains unchanged — MobileShell adds mobile UI layers on top.

**Tech Stack:** React 18, Ant Design v5, CSS Container Queries, matchMedia API, Zustand (existing), react-router-dom 6

---

## File Structure

### New Files (7)
1. `src/components/layout/shell-context.ts` — React Context for breakpoint state + provider
2. `src/components/layout/TopBar.tsx` — Mobile top bar (search, notifications, user)
3. `src/components/layout/BottomTabBar.tsx` — Glassmorphism bottom tab bar with auto-hide
4. `src/components/layout/FabButton.tsx` — Floating action button with radial menu
5. `src/components/layout/SwipeableView.tsx` — Touch swipe wrapper for page navigation
6. `src/components/layout/MobileShell.tsx` — Responsive shell that orchestrates all mobile components
7. `src/styles/responsive.css` — Container queries, breakpoints, touch adaptations

### Modified Files (10)
8. `src/styles/tokens.css` — Add mobile CSS variables (safe areas, shell dimensions, touch target)
9. `src/styles/animations.css` — Add mobile keyframes (tab indicator, FAB spring, page slide)
10. `src/styles/glassmorphism.css` — Add `.glass-tab-bar` class
11. `src/index.css` — Import `responsive.css`
12. `src/layouts/BasicLayout.tsx` — Integrate MobileShell, wrap `<Outlet>` content
13. `src/pages/dashboard/index.tsx` — Mobile: single-column charts, horizontal scroll stat cards, collapsible panels
14. `src/pages/material/index.tsx` — Mobile: 2-column grid, collapsible search, touch-friendly item sizing
15. `src/pages/script/index.tsx` — Mobile: collapsible config panel, accordion result sections
16. `src/pages/creation/index.tsx` — Mobile: carousel storyboard, bottom-drawer export, icon-only steps
17. `src/pages/ab-compare/index.tsx` — Mobile: stacked vertical players, horizontal scroll metrics, 2-col action grid

---

### Task 1: CSS Foundation — Tokens + responsive.css + animations + glassmorphism

**Files:**
- Modify: `src/styles/tokens.css` — append mobile CSS variables (lines 49+)
- Create: `src/styles/responsive.css`
- Modify: `src/styles/animations.css` — append mobile keyframes (lines 87+)
- Modify: `src/styles/glassmorphism.css` — append `.glass-tab-bar` (lines 37+)
- Modify: `src/index.css` — add `@import './styles/responsive.css'` (line 5)

- [ ] **Step 1: Append mobile tokens to tokens.css**

```css
/* ======== Mobile-specific tokens ======== */
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
  --top-bar-height: 48px;
  --tab-bar-height: 56px;
  --tab-bar-height-total: calc(56px + var(--safe-area-bottom));
  --fab-size: 56px;
  --fab-bottom: calc(var(--tab-bar-height) + 16px + var(--safe-area-bottom));
  --touch-target-min: 44px;
}
```

Edit `src/styles/tokens.css` — add the block above after `.light-mode { ... }` closing brace (after line 65).

- [ ] **Step 2: Create responsive.css**

```css
/* VidForge Responsive — Container Queries + Touch Adaptations */

/* Shell container for container queries */
.page-container {
  container-type: inline-size;
  container-name: page;
}

/* ======== Breakpoint: < 768px ======== */
@container page (width < 768px) {
  .desktop-sidebar { display: none; }
  .mobile-tab-bar { display: flex; }
  .page-content { padding-bottom: var(--tab-bar-height-total); }
  .mobile-top-bar { display: flex; }
  .desktop-top-bar { display: none; }
}

@container page (width >= 768px) {
  .desktop-sidebar { display: flex; }
  .mobile-tab-bar { display: none; }
  .page-content { padding-bottom: 0; }
  .mobile-top-bar { display: none; }
  .desktop-top-bar { display: flex; }
}

/* ======== Touch device optimizations ======== */
@media (hover: none) and (pointer: coarse) {
  .touch-target {
    min-height: var(--touch-target-min);
    min-width: var(--touch-target-min);
  }
  .hover-lift {
    transform: none !important;
  }
  /* Ensure cards have proper tap feedback */
  .touch-feedback:active {
    transform: scale(0.97);
    transition: transform 0.1s;
  }
}

/* Disable hover effects on touch devices */
@media (hover: none) {
  .glass-card:hover {
    transform: none !important;
    box-shadow: var(--shadow-card) !important;
  }
}

/* Safe area handling for notched devices */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .safe-area-top {
    padding-top: env(safe-area-inset-top);
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .page-slide { transition: none !important; }
  .fab-enter { animation: none !important; }
}
```

- [ ] **Step 3: Append animations to animations.css**

```css
/* ======== Mobile Animations ======== */

/* Tab bar active indicator slide-in */
@keyframes tabIndicator {
  from { width: 0; opacity: 0; }
  to { width: 20px; opacity: 1; }
}

.tab-indicator {
  animation: tabIndicator 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* FAB menu spring enter */
@keyframes fabEnter {
  0% { transform: scale(0) translateY(10px); opacity: 0; }
  60% { transform: scale(1.1) translateY(-2px); opacity: 1; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

.fab-enter {
  animation: fabEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Page slide transition for SwipeableView */
.page-slide {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}
```

- [ ] **Step 4: Append .glass-tab-bar to glassmorphism.css**

```css
/* Mobile tab bar glass effect */
.glass-tab-bar {
  background: rgba(15, 15, 19, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: var(--safe-area-bottom);
}
```

- [ ] **Step 5: Add @import to index.css**

Edit `src/index.css` — add `@import './styles/responsive.css';` after the existing imports (line 5).

- [ ] **Step 6: Verify CSS builds**

Run: `cd apps/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type/CSS errors (CSS imports are handled by Vite, no TS errors expected)

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/styles/tokens.css apps/frontend/src/styles/responsive.css apps/frontend/src/styles/animations.css apps/frontend/src/styles/glassmorphism.css apps/frontend/src/index.css
git commit -m "feat(mobile): add responsive CSS foundation — tokens, container queries, touch adaptations"
```

---

### Task 2: Shell Components — ShellContext, TopBar, BottomTabBar, FabButton, SwipeableView

**Files:**
- Create: `src/components/layout/shell-context.ts`
- Create: `src/components/layout/TopBar.tsx`
- Create: `src/components/layout/BottomTabBar.tsx`
- Create: `src/components/layout/FabButton.tsx`
- Create: `src/components/layout/SwipeableView.tsx`

- [ ] **Step 1: Create shell-context.ts**

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface ShellContextValue {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  tabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
}

const ShellContext = createContext<ShellContextValue>({
  breakpoint: 'desktop',
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  tabBarVisible: true,
  setTabBarVisible: () => {},
});

export function ShellProvider({ children }: { children: ReactNode }) {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  });
  const [tabBarVisible, setTabBarVisible] = useState(true);

  useEffect(() => {
    const mobileMq = window.matchMedia('(max-width: 767px)');
    const tabletMq = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');

    const handleChange = () => {
      if (mobileMq.matches) setBreakpoint('mobile');
      else if (tabletMq.matches) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };

    mobileMq.addEventListener('change', handleChange);
    tabletMq.addEventListener('change', handleChange);
    return () => {
      mobileMq.removeEventListener('change', handleChange);
      tabletMq.removeEventListener('change', handleChange);
    };
  }, []);

  return (
    <ShellContext.Provider
      value={{
        breakpoint,
        isMobile: breakpoint === 'mobile',
        isTablet: breakpoint === 'tablet',
        isDesktop: breakpoint === 'desktop',
        tabBarVisible,
        setTabBarVisible,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  return useContext(ShellContext);
}
```

- [ ] **Step 2: Create TopBar.tsx**

```typescript
import { useState } from 'react';
import { Input, Badge, Avatar, Space } from 'antd';
import { SearchOutlined, BellOutlined } from '@ant-design/icons';

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div
      className="mobile-top-bar"
      style={{
        height: 'var(--top-bar-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        background: 'rgba(15,15,19,0.9)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, background: 'linear-gradient(135deg, var(--brand-primary) 0%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        VidForge
      </div>
      <Space size={12}>
        {searchOpen && (
          <Input
            size="small"
            placeholder="搜索..."
            prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
            style={{ width: 180, borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-2)', borderColor: 'var(--border-color)' }}
            onBlur={() => setSearchOpen(false)}
            autoFocus
          />
        )}
        <SearchOutlined
          style={{ fontSize: 18, color: 'var(--text-secondary)', cursor: 'pointer' }}
          onClick={() => setSearchOpen(!searchOpen)}
        />
        <Badge count={3} size="small">
          <BellOutlined style={{ fontSize: 18, color: 'var(--text-secondary)', cursor: 'pointer' }} />
        </Badge>
        <Avatar size={28} style={{ background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)', cursor: 'pointer', fontSize: 12 }}>U</Avatar>
      </Space>
    </div>
  );
}
```

- [ ] **Step 3: Create BottomTabBar.tsx**

```typescript
import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from 'antd';
import { DashboardOutlined, UploadOutlined, FileTextOutlined, VideoCameraOutlined, ExperimentOutlined } from '@ant-design/icons';

interface TabConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  href: string;
}

const tabs: TabConfig[] = [
  { key: 'dashboard', label: '工作台', icon: <DashboardOutlined />, href: '/dashboard' },
  { key: 'material', label: '素材库', icon: <UploadOutlined />, href: '/material' },
  { key: 'script', label: '剧本', icon: <FileTextOutlined />, href: '/script' },
  { key: 'creation', label: '创作', icon: <VideoCameraOutlined />, href: '/creation' },
  { key: 'ab-compare', label: 'AB对比', icon: <ExperimentOutlined />, href: '/ab-compare', badge: 0 },
];

interface BottomTabBarProps {
  visible: boolean;
}

export function BottomTabBar({ visible }: BottomTabBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="glass-tab-bar mobile-tab-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: 'var(--tab-bar-height-total)',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {tabs.map((tab) => {
        const active = location.pathname === tab.href;
        return (
          <div
            key={tab.key}
            className="touch-target touch-feedback"
            onClick={() => navigate(tab.href)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              flex: 1,
              height: 56,
              cursor: 'pointer',
              position: 'relative',
              color: active ? 'var(--brand-primary)' : 'var(--text-tertiary)',
              transition: 'color 0.2s',
            }}
          >
            {tab.badge !== undefined ? (
              <Badge count={tab.badge} size="small" style={{ fontSize: 10 }}>
                <span style={{ fontSize: 20 }}>{tab.icon}</span>
              </Badge>
            ) : (
              <span style={{ fontSize: 20, transform: active ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s', display: 'inline-block' }}>
                {tab.icon}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{tab.label}</span>
            {active && (
              <div
                className="tab-indicator"
                style={{
                  position: 'absolute',
                  top: 0,
                  width: 20,
                  height: 2,
                  borderRadius: '0 0 2px 2px',
                  background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create FabButton.tsx**

```typescript
import { useState, useRef, useEffect } from 'react';
import { PlusOutlined, ThunderboltOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Tooltip } from 'antd';

interface FabAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const defaultActions: FabAction[] = [
  { key: 'quick-create', label: '快速创作', icon: <ThunderboltOutlined />, onClick: () => {} },
  { key: 'upload', label: '上传素材', icon: <CloudUploadOutlined />, onClick: () => {} },
];

interface FabButtonProps {
  actions?: FabAction[];
  hidden?: boolean;
}

export function FabButton({ actions = defaultActions, hidden = false }: FabButtonProps) {
  const [open, setOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [navigate]);

  if (hidden) return null;

  return (
    <div ref={fabRef} style={{ position: 'fixed', bottom: 'var(--fab-bottom)', right: 16, zIndex: 101 }}>
      {/* Action menu */}
      {open && (
        <div style={{ position: 'absolute', bottom: 64, right: 0, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          {actions.map((action, i) => (
            <div
              key={action.key}
              className="fab-enter"
              style={{
                animationDelay: `${i * 0.05}s`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
            >
              <span style={{
                padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                background: 'rgba(15,15,19,0.85)', color: 'var(--text-primary)',
                fontSize: 12, whiteSpace: 'nowrap',
              }}>
                {action.label}
              </span>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 18,
                boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
              }}>
                {action.icon}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: 'var(--fab-size)',
          height: 'var(--fab-size)',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 24,
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(99,102,241,0.5)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        <PlusOutlined />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create SwipeableView.tsx**

```typescript
import { useRef, useCallback, ReactNode } from 'react';

interface SwipeableViewProps {
  pages: { key: string; content: ReactNode }[];
  activeKey: string;
  onChange: (key: string) => void;
  threshold?: number;
}

export function SwipeableView({ pages, activeKey, onChange, threshold = 60 }: SwipeableViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, isDragging: false, currentX: 0 });
  const activeIndex = pages.findIndex((p) => p.key === activeKey);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragRef.current.startX = e.touches[0].clientX;
    dragRef.current.startY = e.touches[0].clientY;
    dragRef.current.isDragging = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - dragRef.current.startX;
    const deltaY = e.touches[0].clientY - dragRef.current.startY;

    if (!dragRef.current.isDragging) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        dragRef.current.isDragging = true;
      } else {
        return; // vertical scroll, ignore
      }
    }

    if (dragRef.current.isDragging) {
      dragRef.current.currentX = deltaX;
      if (containerRef.current) {
        const el = containerRef.current;
        // Allow pull only within bounds
        const boundedX = (activeIndex === 0 && deltaX > 0) ? deltaX * 0.3
          : (activeIndex === pages.length - 1 && deltaX < 0) ? deltaX * 0.3
          : deltaX;
        el.style.transform = `translate3d(${boundedX}px, 0, 0)`;
      }
    }
  }, [activeIndex, pages.length]);

  const handleTouchEnd = useCallback(() => {
    if (!dragRef.current.isDragging) return;

    const deltaX = dragRef.current.currentX;
    if (containerRef.current) {
      containerRef.current.style.transform = '';
    }

    if (Math.abs(deltaX) > threshold) {
      if (deltaX < 0 && activeIndex < pages.length - 1) {
        onChange(pages[activeIndex + 1].key);
      } else if (deltaX > 0 && activeIndex > 0) {
        onChange(pages[activeIndex - 1].key);
      }
    }
    dragRef.current.isDragging = false;
    dragRef.current.currentX = 0;
  }, [threshold, activeIndex, pages, onChange]);

  return (
    <div
      ref={containerRef}
      className="page-slide"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ flex: 1, overflow: 'hidden' }}
    >
      {pages[activeIndex]?.content}
    </div>
  );
}
```

- [ ] **Step 6: Verify TS compiles**

Run: `cd apps/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No TypeScript errors. The new components are not yet used in any page, so no import errors.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/components/layout/
git commit -m "feat(mobile): add shell components — ShellContext, TopBar, BottomTabBar, FabButton, SwipeableView"
```

---

### Task 3: MobileShell Integration — Wire shell into BasicLayout

**Files:**
- Create: `src/components/layout/MobileShell.tsx`
- Modify: `src/layouts/BasicLayout.tsx` — wrap content, add MobileShell

- [ ] **Step 1: Create MobileShell.tsx**

```typescript
import { ReactNode, useRef, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useShell } from './shell-context';
import { TopBar } from './TopBar';
import { BottomTabBar } from './BottomTabBar';
import { FabButton } from './FabButton';
import { SwipeableView } from './SwipeableView';

interface MobileShellProps {
  sidebar: ReactNode;
  children: ReactNode;
}

const pageKeys = ['dashboard', 'material', 'script', 'creation', 'ab-compare'];
const pathToKey: Record<string, string> = {
  '/dashboard': 'dashboard', '/material': 'material', '/script': 'script',
  '/creation': 'creation', '/ab-compare': 'ab-compare',
};
const keyToPath: Record<string, string> = {
  dashboard: '/dashboard', material: '/material', script: '/script',
  creation: '/creation', 'ab-compare': '/ab-compare',
};

export function MobileShell({ sidebar, children }: MobileShellProps) {
  const { isMobile, tabBarVisible, setTabBarVisible } = useShell();
  const location = useLocation();
  const navigate = useNavigate();
  const lastScrollY = useRef(0);
  const [swipePages] = useState(() =>
    pageKeys.map((key) => ({ key, content: null as ReactNode }))
  );

  // Auto-hide tab bar on scroll down
  useEffect(() => {
    if (!isMobile) return;
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 60) {
        setTabBarVisible(false);
      } else {
        setTabBarVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, setTabBarVisible]);

  const handleSwipeChange = useCallback((key: string) => {
    const path = keyToPath[key];
    if (path) navigate(path);
  }, [navigate]);

  const currentKey = pathToKey[location.pathname] || 'dashboard';

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <TopBar />
        <div className="page-container" style={{ flex: 1 }}>
          <div className="page-content">
            <SwipeableView
              pages={swipePages}
              activeKey={currentKey}
              onChange={handleSwipeChange}
            >
              {children}
            </SwipeableView>
          </div>
        </div>
        <BottomTabBar visible={tabBarVisible} />
        <FabButton hidden={!tabBarVisible} />
      </div>
    );
  }

  // Desktop / tablet: render existing sidebar layout
  return (
    <div className="page-container" style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="desktop-sidebar">{sidebar}</div>
      <div className="page-content" style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
```

Wait — the SwipeableView doesn't take `children`, it takes `pages` prop. Let me fix this. The SwipeableView is used as a wrapper that provides touch gesture detection. On mobile, the content is just the current page's children rendered normally (the SwipeableView gesture is purely additive). Let me simplify:

```typescript
import { ReactNode, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useShell } from './shell-context';
import { TopBar } from './TopBar';
import { BottomTabBar } from './BottomTabBar';
import { FabButton } from './FabButton';

interface MobileShellProps {
  sidebar: ReactNode;
  children: ReactNode;
}

const pageKeys = ['/dashboard', '/material', '/script', '/creation', '/ab-compare'];

export function MobileShell({ sidebar, children }: MobileShellProps) {
  const { isMobile, tabBarVisible, setTabBarVisible } = useShell();
  const location = useLocation();
  const lastScrollY = useRef(0);

  // Auto-hide tab bar on scroll down (mobile only)
  useEffect(() => {
    if (!isMobile) return;
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 60) {
        setTabBarVisible(false);
      } else {
        setTabBarVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, setTabBarVisible]);

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <TopBar />
        <div className="page-container" style={{ flex: 1 }}>
          <div className="page-content" style={{ padding: '12px', paddingBottom: 'calc(var(--tab-bar-height-total) + 12px)' }}>
            {children}
          </div>
        </div>
        <BottomTabBar visible={tabBarVisible} />
        <FabButton hidden={!tabBarVisible} />
      </div>
    );
  }

  // Desktop / tablet
  return (
    <div className="page-container" style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="desktop-sidebar">{sidebar}</div>
      <div className="page-content" style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Modify BasicLayout.tsx to integrate MobileShell**

Replace the existing return statement. The sidebar JSX stays the same. The main layout becomes wrapped in MobileShell.

Old:
```tsx
return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar ... */}
      <Layout style={{ marginLeft: collapsed ? 80 : 240, ... }}>
        {/* Header ... */}
        <Content style={{ padding: 24, ... }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
```

New — wrap with ShellProvider + MobileShell. The sidebar JSX block stays unchanged but becomes a variable passed to MobileShell:

```tsx
import { ShellProvider } from '../components/layout/shell-context';
import { MobileShell } from '../components/layout/MobileShell';

function BasicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed: collapsed, toggleSidebar } = useAppStore();

  // ... handleUserMenuClick stays the same ...

  const sidebar = (
    <div
      className="glass-strong desktop-sidebar"
      style={{
        width: collapsed ? 80 : 240,
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width var(--duration-normal) var(--ease-out)',
        borderRight: '1px solid var(--border-color)',
      }}
    >
      {/* Logo (same as before) */}
      <div style={{ ... }} onClick={() => navigate('/dashboard')}>
        <RocketOutlined style={{ ... }} />
        {!collapsed && <span style={{ ... }}>VidForge</span>}
      </div>

      {/* Menu (same as before) */}
      <Menu mode="inline" selectedKeys={[location.pathname]} style={{ ... }} theme="dark" items={menuItems} onClick={({ key }) => navigate(key)} />

      {/* AI label (same as before) */}
      {!collapsed && <div style={{ ... }}>...</div>}
    </div>
  );

  return (
    <ShellProvider>
      <MobileShell sidebar={sidebar}>
        {/* Desktop top bar */}
        <div className="desktop-top-bar" style={{ ... }}>
          {/* collapse toggle, breadcrumb, ThemeToggle, notification bell, settings, user avatar */}
        </div>

        {/* Page content */}
        <div style={{ padding: 24, minHeight: 'calc(100vh - 64px)', background: 'var(--bg-primary)' }}>
          <Outlet />
        </div>
      </MobileShell>
    </ShellProvider>
  );
}
```

The key change: sidebar becomes a JSX variable, `Layout` + `Header` + `Content` wrappers are replaced by `ShellProvider` + `MobileShell`. The desktop top bar gets `className="desktop-top-bar"` so responsive.css hides it on mobile.

- [ ] **Step 3: Verify TS compiles**

Run: `cd apps/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors. The BasicLayout now has correct imports and JSX.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/layout/MobileShell.tsx apps/frontend/src/layouts/BasicLayout.tsx
git commit -m "feat(mobile): integrate MobileShell with ShellProvider into BasicLayout"
```

---

### Task 4: Dashboard Mobile Adaptation

**Files:**
- Modify: `src/pages/dashboard/index.tsx`

- [ ] **Step 1: Add responsive CSS class + adjust chart layout**

Add a container query wrapper for the dashboard content:

```tsx
// Wrap the entire return in <div className="page-container">
// Wrap each chart section so CQ can stack them on mobile
```

Key changes:
1. Metric cards: keep the existing `Row`/`Col` layout — Ant Design Col already handles `xs={12}` stacking
2. Trend chart + Rose chart: wrap in a div with class, CQ makes them stack at <768px (already handled by `xs={24}` Col)
3. Radar + Stacked bar: same — `Col xs={24}` already stacks them
4. Queue + Heatmap: same — `Col xs={24}` already stacks them
5. The Segmented period selector: on mobile, replace with a bottom-sheet-style dropdown

Actually, the dashboard ALREADY uses Ant Design `Col xs={24} lg={16}` patterns which naturally stack on small screens. The changes needed are:
- The period selector (`Segmented`) becomes a simple inline select on mobile (no need for a full bottom sheet — YAGNI)
- Stat cards show fewer items (hide 2 on mobile via CSS)
- Chart height reduces from 260px to 180px on mobile

The minimal change is to pass mobile-aware heights and add a `useShell()` hook to adjust:

```tsx
import { useShell } from '../../components/layout/shell-context';

function DashboardPage() {
  const { isMobile } = useShell();
  const chartHeight = isMobile ? 180 : 260;
  const smallChartHeight = isMobile ? 160 : 220;
  const statCards = isMobile ? stats.slice(0, 4) : stats; // show 4 on mobile

  // In JSX, use chartHeight/smallChartHeight in ReactEChartsCore style props
  // Use statCards for the card row
}
```

- [ ] **Step 2: Apply the changes to dashboard/index.tsx**

Changes summary:
1. Import `useShell` from shell-context
2. Add `const { isMobile } = useShell();`
3. Calculate `chartHeight` and `smallChartHeight` based on `isMobile`
4. Filter stat cards to 4 items on mobile
5. Make period selector `Segmented` size smaller on mobile
6. Hide secondary info rows (同比/环比/预测) on mobile

Edit `src/pages/dashboard/index.tsx`:

After line 47 (`function DashboardPage() {`):
```tsx
const { isMobile } = useShell();
const chartHeight = isMobile ? 180 : 260;
const smallChartHeight = isMobile ? 160 : 220;
const visibleStats = isMobile ? stats.slice(0, 4) : stats;
```

Import at line 1:
```tsx
import { useShell } from '../../components/layout/shell-context';
```

Replace stat card mapping `stats.map(...)` with `visibleStats.map(...)`.

Replace chart heights in JSX:
- `style={{ height: 260 }}` → `style={{ height: chartHeight }}`
- `style={{ height: 250 }}` → `style={{ height: smallChartHeight }}`
- `style={{ height: 220 }}` → `style={{ height: isMobile ? 160 : 220 }}`
- `style={{ height: 160 }}` → `style={{ height: isMobile ? 120 : 160 }}`

On mobile, hide the trend summary stat row (同比/环比/预测):
```tsx
{!isMobile && (
  <div style={{ padding: '0 var(--spacing-lg) var(--spacing-lg)', display: 'flex', gap: 24 }}>
    ...
  </div>
)}
```

- [ ] **Step 3: Verify TS compiles**

Run: `cd apps/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors. The `useShell` hook is correctly imported and used.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/pages/dashboard/index.tsx
git commit -m "feat(mobile): responsive dashboard — stacked charts, reduced stat cards, adaptive chart heights"
```

---

### Task 5: Material Page Mobile Adaptation

**Files:**
- Modify: `src/pages/material/index.tsx`

- [ ] **Step 1: Adjust grid for mobile**

The material page already uses `Col xs={12} sm={8} md={6} lg={6} xl={4}` which gives 2 columns on mobile (`xs={12}`). No grid changes needed.

Key changes:
1. Collapse the search bar and Segmented type filter into a single row on mobile
2. Hide the drag-upload zone on mobile (replace with FAB — already on shell level)
3. Increase touch target sizes for action buttons
4. Reduce card thumbnail height from 140px to 100px on mobile

- [ ] **Step 2: Apply changes to material/index.tsx**

Import `useShell`:
```tsx
import { useShell } from '../../components/layout/shell-context';
```

Inside `function MaterialPage()`:
```tsx
const { isMobile } = useShell();
```

Changes:
1. Search bar: reduce width from 280 to "100%" on mobile:
```tsx
style={{ width: isMobile ? '100%' : 280, ... }}
```

2. Type Segmented: use `size="small"` on mobile (Ant Design Segmented supports size prop):
```tsx
<Segmented size={isMobile ? 'small' : undefined} ... />
```

3. Hide drag-upload zone on mobile:
```tsx
{!isMobile && (
  <Dragger ...>...</Dragger>
)}
```

4. Card thumbnail height adaptive:
```tsx
style={{ height: isMobile ? 100 : 140, ... }}
```

5. Action buttons on cards: use icons only with larger hit areas on mobile (already icons-only, but make the invisible touch area bigger).

- [ ] **Step 3: Verify TS compiles**

Run: `cd apps/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/pages/material/index.tsx
git commit -m "feat(mobile): responsive material page — 2-col grid, collapsible search, hide drag-upload on mobile"
```

---

### Task 6: Script Page Mobile Adaptation

**Files:**
- Modify: `src/pages/script/index.tsx`

- [ ] **Step 1: Make config panel collapsible on mobile**

The script page currently has a side-by-side layout (`Col xs={24} lg={10}` config + `Col xs={24} lg={14}` result). On mobile, config is full-width above results.

Key changes:
1. Stack config + result vertically (already handled by `xs={24}`)
2. Add a "收起/展开" toggle for the config panel on mobile
3. Result sections (分镜, 配音, BGM, 标签) become accordion/collapsible

- [ ] **Step 2: Apply changes to script/index.tsx**

Import `useShell`:
```tsx
import { useShell } from '../../components/layout/shell-context';
```

Inside `function ScriptPage()`:
```tsx
const { isMobile } = useShell();
const [configExpanded, setConfigExpanded] = useState(!isMobile);
```

Add a toggle button at the top of the config panel (shown only on mobile):
```tsx
{isMobile && (
  <div
    onClick={() => setConfigExpanded(!configExpanded)}
    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md) var(--spacing-xl)', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
  >
    <Text strong style={{ color: 'var(--text-primary)' }}>剧本配置</Text>
    <Text style={{ color: 'var(--brand-primary)', fontSize: 13 }}>{configExpanded ? '收起' : '展开'}</Text>
  </div>
)}
```

Wrap the Form in a conditional:
```tsx
{configExpanded && (
  <div style={{ padding: 'var(--spacing-xl)' }}>
    <Form ...>...</Form>
  </div>
)}
```

Style grid on mobile: change from 2-column to horizontal scrolling:
```tsx
<div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(5, 120px)' : '1fr 1fr', gap: 8, overflowX: isMobile ? 'auto' : 'visible' }}>
```

- [ ] **Step 3: Verify TS compiles**

Run: `cd apps/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/pages/script/index.tsx
git commit -m "feat(mobile): responsive script page — collapsible config, horizontal style picker"
```

---

### Task 7: Creation Page Mobile Adaptation

**Files:**
- Modify: `src/pages/creation/index.tsx`

- [ ] **Step 1: Adapt creation page for mobile**

Key changes:
1. Steps indicator: show icon-only on mobile (keep title on desktop)
2. Config form (xs={24} lg={8}): already stacks, just reduce spacing
3. Storyboard editor area: make full width on mobile
4. Generation progress: adjust grid from 180px cards to fill width
5. Export panel: already a Modal, ensure it's full-screen on mobile

- [ ] **Step 2: Apply changes to creation/index.tsx**

Import `useShell`:
```tsx
import { useShell } from '../../components/layout/shell-context';
```

Inside `function CreationPage()`:
```tsx
const { isMobile } = useShell();
```

Steps simplification:
```tsx
<Steps
  current={['config', 'storyboard', 'generating', 'complete'].indexOf(currentStep)}
  items={stepItems.map((item) => ({
    ...item,
    title: isMobile ? '' : item.title,
    description: isMobile ? undefined : item.description,
  }))}
  size={isMobile ? 'small' : 'default'}
/>
```

Config panel reduces padding on mobile:
```tsx
<div style={{ padding: isMobile ? 'var(--spacing-md)' : 'var(--spacing-xl)' }}>
```

Generation progress grid: use 2 columns on mobile:
```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 12,
}}>
```

Completion page: stack buttons vertically on mobile:
```tsx
<Space size="middle" direction={isMobile ? 'vertical' : 'horizontal'} style={isMobile ? { width: '100%' } : undefined}>
  <Button block={isMobile} ...>导出视频</Button>
  <Button block={isMobile} ...>重新生成</Button>
  <Button block={isMobile} ...>编辑分镜</Button>
</Space>
```

- [ ] **Step 3: Verify TS compiles**

Run: `cd apps/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/pages/creation/index.tsx
git commit -m "feat(mobile): responsive creation page — icon-only steps, 2-col progress grid, stacked buttons"
```

---

### Task 8: AB Compare Page Mobile Adaptation

**Files:**
- Modify: `src/pages/ab-compare/index.tsx`
- Modify: `src/pages/ab-compare/components/ComparePlayer.tsx`
- Modify: `src/pages/ab-compare/components/CompareMetrics.tsx`

- [ ] **Step 1: Stack players vertically on mobile**

In `ComparePlayer.tsx`, change the flex container to column on mobile:

Import `useShell`:
```tsx
import { useShell } from '../../../components/layout/shell-context';
```

Inside `ComparePlayer`, replace:
```tsx
<div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
```
With:
```tsx
<div style={{
  display: 'flex',
  flexDirection: isMobile ? 'column' : 'row',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
}}>
```

Remove the right border on Version A player when stacked:
```tsx
borderRight: side === 'A' ? (isMobile ? 'none' : '1px solid var(--border-color)') : 'none',
```

- [ ] **Step 2: Make metrics table scrollable on mobile**

In `CompareMetrics.tsx`, wrap the Table in a horizontal scroll container on mobile.

Import `useShell`:
```tsx
import { useShell } from '../../../components/layout/shell-context';
```

Wrap in scrollable container:
```tsx
<div style={isMobile ? { overflowX: 'auto' } : undefined}>
  <Table ... />
</div>
```

- [ ] **Step 3: Stack action buttons into 2-column grid on mobile**

In `ab-compare/index.tsx`:
```tsx
<div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 'var(--spacing-lg)', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
  <Button block={isMobile}>应用版本 A</Button>
  <Button block={isMobile}>应用版本 B</Button>
  <Button block={isMobile}>另存为模板</Button>
  <Button block={isMobile}>导出报告</Button>
</div>
```

- [ ] **Step 4: Verify TS compiles**

Run: `cd apps/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/pages/ab-compare/
git commit -m "feat(mobile): responsive AB compare — stacked players, scrollable metrics, 2-col action grid"
```

---

## Spec Coverage Check

| Spec Section | Task |
|---|---|
| 1. Navigation Pattern (A+C hybrid) | Task 3 (MobileShell + BottomTabBar + FabButton) |
| 2. Responsive Breakpoints | Task 1 (responsive.css) + Task 2 (shell-context.ts) |
| 3. Shell Architecture | Task 3 (MobileShell.tsx) |
| 4.1 MobileShell | Task 3 |
| 4.2 BottomTabBar | Task 2 |
| 4.3 FabButton | Task 2 |
| 4.4 SwipeableView | Task 2 |
| 5.1 Dashboard | Task 4 |
| 5.2 Material | Task 5 |
| 5.3 Script | Task 6 |
| 5.4 Creation | Task 7 |
| 5.5 AB Compare | Task 8 |
| 6. CSS Strategy | Task 1 |
