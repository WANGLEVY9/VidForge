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
