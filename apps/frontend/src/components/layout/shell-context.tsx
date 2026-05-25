import { createContext, useContext, useState, ReactNode } from 'react';

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

/**
 * 当前阶段（PC 端开发为重点）：禁用所有移动端布局判定，强制走桌面分支。
 * 相关移动端组件（MobileShell / BottomTabBar / FabButton / TopBar）保留，
 * 待后续移动端阶段恢复时把下面的 useState/matchMedia 还原即可。
 */
export function ShellProvider({ children }: { children: ReactNode }) {
  const [tabBarVisible, setTabBarVisible] = useState(true);

  return (
    <ShellContext.Provider
      value={{
        breakpoint: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
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
