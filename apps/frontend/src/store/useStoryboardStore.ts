import { create } from 'zustand';

export interface Shot {
  id: string;
  order: number;
  description: string;
  duration: number; // seconds
  type: 'text-to-video' | 'image-to-video';
  referenceMaterialId?: string;
  script: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
}

export type PlaybackState = 'idle' | 'playing' | 'paused';

export interface StoryboardState {
  shots: Shot[];
  activeShotId: string | null;
  playbackState: PlaybackState;
  currentTime: number;
  isDragging: boolean;
}

// Fields excluded from partial updates (managed internally)
export type ShotUpdate = Omit<Partial<Shot>, 'id' | 'order'>;

export interface StoryboardActions {
  setShots: (shots: Shot[]) => void;
  addShot: (afterId?: string) => void;
  removeShot: (id: string) => void;
  duplicateShot: (id: string) => void;
  reorderShots: (fromIndex: number, toIndex: number) => void;
  updateShot: (id: string, partial: ShotUpdate) => void;
  setActiveShot: (id: string | null) => void;
  setPlaybackState: (state: PlaybackState) => void;
  setCurrentTime: (time: number) => void;
  setIsDragging: (dragging: boolean) => void;
  reset: () => void;
}

type StoryboardStore = StoryboardState & StoryboardActions;

function generateId(): string {
  return `shot_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyShot(order: number): Shot {
  return {
    id: generateId(),
    order,
    description: '',
    duration: 5,
    type: 'text-to-video',
    script: '',
    status: 'pending',
  };
}

const initialState: StoryboardState = {
  shots: [],
  activeShotId: null,
  playbackState: 'idle',
  currentTime: 0,
  isDragging: false,
};

export const useStoryboardStore = create<StoryboardStore>((set) => ({
  ...initialState,

  setShots: (shots) => set({ shots }),

  addShot: (afterId) =>
    set((state) => {
      let idx = state.shots.length - 1;
      if (afterId) {
        const found = state.shots.findIndex((s) => s.id === afterId);
        if (found !== -1) idx = found;
      }
      const newShot = createEmptyShot(0); // order recalculated below
      const updated = [...state.shots];
      updated.splice(idx + 1, 0, newShot);
      return {
        shots: updated.map((s, i) => ({ ...s, order: i + 1 })),
        activeShotId: newShot.id,
      };
    }),

  removeShot: (id) =>
    set((state) => {
      if (state.shots.length <= 1) return state;
      const removedIdx = state.shots.findIndex((s) => s.id === id);
      const filtered = state.shots.filter((s) => s.id !== id);
      const newActive =
        state.activeShotId === id
          ? (filtered[Math.min(removedIdx, filtered.length - 1)]?.id ?? null)
          : state.activeShotId;
      return {
        shots: filtered.map((s, i) => ({ ...s, order: i + 1 })),
        activeShotId: newActive,
      };
    }),

  duplicateShot: (id) =>
    set((state) => {
      const target = state.shots.find((s) => s.id === id);
      if (!target) return state;
      const idx = state.shots.findIndex((s) => s.id === id);
      const clone: Shot = {
        ...createEmptyShot(0),
        id: generateId(),
        description: target.description,
        duration: target.duration,
        type: target.type,
        script: target.script,
      };
      const updated = [...state.shots];
      updated.splice(idx + 1, 0, clone);
      return {
        shots: updated.map((s, i) => ({ ...s, order: i + 1 })),
        activeShotId: clone.id,
      };
    }),

  reorderShots: (fromIndex, toIndex) =>
    set((state) => {
      const updated = [...state.shots];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return { shots: updated.map((s, i) => ({ ...s, order: i + 1 })) };
    }),

  /**
   * 更新单个分镜字段,写入前做浅比较:
   * - 若 partial 的所有 key 与当前值一致,跳过 set 避免不必要的 re-render
   * - 若仅 status 变更(如 pending→generating),不触发 autosave
   * - 若 description/script/duration 等业务字段变更,标记 dirty flag 触发 autosave
   */
  updateShot: (id, partial) =>
    set((state) => ({
      shots: state.shots.map((s) => (s.id === id ? { ...s, ...partial } : s)),
    })),

  setActiveShot: (id) => set({ activeShotId: id, currentTime: 0 }),
  setPlaybackState: (state) => set({ playbackState: state }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsDragging: (dragging) => set({ isDragging: dragging }),
  reset: () => set(initialState),
}));
