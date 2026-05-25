import { create } from 'zustand';
import { authApi, PublicUser } from '../services/auth';

const TOKEN_KEY = 'vidforge_token';
const USER_KEY = 'vidforge_user';

function readUser(): PublicUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  token: string | null;
  user: PublicUser | null;
  /** 是否已经发起过 me() 请求 */
  bootstrapped: boolean;
  loading: boolean;
}

interface AuthActions {
  setSession: (token: string, user: PublicUser) => void;
  clearSession: () => void;
  /** 启动时尝试用本地 token 拉一次 me 验证有效性 */
  bootstrap: () => Promise<void>;
  refreshMe: () => Promise<PublicUser | null>;
  patchUser: (patch: Partial<PublicUser>) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  user: typeof window !== 'undefined' ? readUser() : null,
  bootstrapped: false,
  loading: false,

  setSession: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user, bootstrapped: true });
  },

  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, bootstrapped: true });
  },

  bootstrap: async () => {
    const { token } = get();
    if (!token) {
      set({ bootstrapped: true });
      return;
    }
    set({ loading: true });
    try {
      const user = await authApi.me();
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, bootstrapped: true, loading: false });
    } catch {
      // token 无效，清掉
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      set({ token: null, user: null, bootstrapped: true, loading: false });
    }
  },

  refreshMe: async () => {
    try {
      const user = await authApi.me();
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user });
      return user;
    } catch {
      return null;
    }
  },

  patchUser: (patch) => {
    const cur = get().user;
    if (!cur) return;
    const next = { ...cur, ...patch };
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    set({ user: next });
  },
}));
