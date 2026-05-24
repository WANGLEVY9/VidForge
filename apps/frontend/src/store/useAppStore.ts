import { create } from 'zustand';

interface AppState {
  sidebarCollapsed: boolean;
  globalLoading: boolean;
  notificationCount: number;
}

interface AppActions {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setGlobalLoading: (loading: boolean) => void;
  setNotificationCount: (count: number) => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>((set) => ({
  sidebarCollapsed: false,
  globalLoading: false,
  notificationCount: 0,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
  setNotificationCount: (count) => set({ notificationCount: count }),
}));
