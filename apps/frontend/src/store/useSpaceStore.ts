import { create } from 'zustand';
import { ProductSpace, spaceApi } from '../services/space';

const ACTIVE_KEY = 'vidforge_active_space_id';

interface SpaceState {
  spaces: ProductSpace[];
  activeId: string | null;
  loaded: boolean;
  loading: boolean;
}

interface SpaceActions {
  load: () => Promise<void>;
  setActive: (id: string | null) => void;
  upsert: (space: ProductSpace) => void;
  clear: () => void;
}

type SpaceStore = SpaceState & SpaceActions;

function readActive(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export const useSpaceStore = create<SpaceStore>((set, get) => ({
  spaces: [],
  activeId: readActive(),
  loaded: false,
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const list = await spaceApi.list();
      const cur = get().activeId;
      // 校验 activeId 是否还存在
      let nextActive: string | null = cur;
      if (!cur || !list.some((s) => s.id === cur)) {
        const def = list.find((s) => s.isDefault) ?? list[0];
        nextActive = def?.id ?? null;
      }
      if (nextActive) localStorage.setItem(ACTIVE_KEY, nextActive);
      set({ spaces: list, activeId: nextActive, loaded: true, loading: false });
    } catch {
      set({ loaded: true, loading: false });
    }
  },

  setActive: (id) => {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
    set({ activeId: id });
  },

  upsert: (space) => {
    const list = get().spaces;
    const idx = list.findIndex((s) => s.id === space.id);
    const next = idx === -1 ? [...list, space] : list.map((s) => (s.id === space.id ? space : s));
    set({ spaces: next });
  },

  clear: () => {
    localStorage.removeItem(ACTIVE_KEY);
    set({ spaces: [], activeId: null, loaded: false });
  },
}));
