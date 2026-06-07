import { ReactNode, useRef, useEffect } from 'react';
import { useShell } from './shell-context';
import { TopBar } from './TopBar';
import { BottomTabBar } from './BottomTabBar';
import { FabButton } from './FabButton';
import { GlobalShortcuts } from './GlobalShortcuts';

interface MobileShellProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function MobileShell({ sidebar, children }: MobileShellProps) {
  const { isMobile, tabBarVisible, setTabBarVisible } = useShell();
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          background: 'var(--bg-primary)',
        }}
      >
        <GlobalShortcuts />
        <TopBar />
        <div className="page-container" style={{ flex: 1 }}>
          <div
            className="page-content"
            style={{ padding: '12px', paddingBottom: 'calc(var(--tab-bar-height-total) + 12px)' }}
          >
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
      <GlobalShortcuts />
      <div className="desktop-sidebar">{sidebar}</div>
      <div className="page-content" style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
