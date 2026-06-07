import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

function getBreakpoint(width: number): {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
} {
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const breakpoint: Breakpoint = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
  return { breakpoint, isMobile, isTablet, isDesktop };
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const [tabBarVisible, setTabBarVisible] = useState(true);
  const [viewport, setViewport] = useState(() => getBreakpoint(window.innerWidth));

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const handler = () => setViewport(getBreakpoint(window.innerWidth));
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return (
    <ShellContext.Provider
      value={{
        ...viewport,
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
