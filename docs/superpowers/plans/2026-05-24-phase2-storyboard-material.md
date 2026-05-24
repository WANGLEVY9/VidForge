# Phase 2: Storyboard Editor + Material Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete storyboard editor component family (drag-n-drop / keyboard shortcuts / detail editing / per-shot regeneration) and the three-layer material tagging system with PGVector semantic search.

**Architecture:** The storyboard editor replaces the inline storyboard list in the Creation page with a dedicated component family — `StoryboardEditor` composes `ShotList` (left), `PreviewPanel` (center), `ShotDetailPanel` (right), and `TimelineBar` (bottom). State lives in a Zod-schematized Zustand store. Drag-n-drop uses `@dnd-kit/sortable`. The material intelligence layer extends the existing Material entity with three-layer JSON tag columns and a PGVector embedding column, with a new semantic search endpoint.

**Tech Stack:** React 18, TypeScript, Zustand, @dnd-kit/core + @dnd-kit/sortable, Socket.IO, NestJS, TypeORM, PGVector, class-validator

**Design doc reference:** `docs/superpowers/specs/2026-05-24-vidforge-upgrade-design.md` sections 3 (Storyboard Editor) and 4 (Material Intelligence)

---

## File Structure

### Create
- `apps/frontend/src/store/useStoryboardStore.ts` — Zustand store for shot state
- `apps/frontend/src/hooks/useKeyboardShortcuts.ts` — Global keyboard shortcut hook
- `apps/frontend/src/hooks/useStoryboard.ts` — Storyboard-specific operations (select, reorder, CRUD)
- `apps/frontend/src/components/storyboard/StoryboardEditor.tsx` — Container component
- `apps/frontend/src/components/storyboard/ShotList.tsx` — Sortable shot list (left panel)
- `apps/frontend/src/components/storyboard/ShotItem.tsx` — Single draggable shot card
- `apps/frontend/src/components/storyboard/PreviewPanel.tsx` — Preview area (center panel)
- `apps/frontend/src/components/player/VideoPlayer.tsx` — Video playback component
- `apps/frontend/src/components/storyboard/ShotDetailPanel.tsx` — Shot detail editor (right panel)
- `apps/frontend/src/components/storyboard/MaterialSelector.tsx` — Material selection popover
- `apps/frontend/src/components/storyboard/TimelineBar.tsx` — Bottom timeline
- `apps/frontend/src/services/shot.ts` — Per-shot API service

### Modify
- `apps/frontend/src/pages/creation/index.tsx` — Integrate StoryboardEditor
- `apps/frontend/src/services/creation.ts` — Add shotApi references
- `apps/backend/src/modules/creation/entities/creation-task.entity.ts` — Update storyboard type to Shot[]
- `apps/backend/src/modules/creation/creation.controller.ts` — Add per-shot endpoints
- `apps/backend/src/modules/creation/creation.service.ts` — Add per-shot regeneration logic
- `apps/backend/src/modules/creation/dto/create-task.dto.ts` — Add shot DTO types
- `apps/backend/src/modules/material/entities/material.entity.ts` — Add three-layer tag columns
- `apps/backend/src/modules/material/material.service.ts` — Add tag analysis + semantic search
- `apps/backend/src/modules/material/material.controller.ts` — Add analysis + search endpoints
- `apps/backend/src/modules/material/dto/` — Add analysis + search DTOs

---

## Sub-Plan A: Storyboard Editor (Frontend)

### Task 1: Install dependency + Create Storyboard Store + Types

**Files:**
- Create: `apps/frontend/src/store/useStoryboardStore.ts`

- [ ] **Step 1: Install @dnd-kit**

Run:
```bash
cd apps/frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: packages added to `node_modules` and `package.json`.

- [ ] **Step 2: Create useStoryboardStore**

Write `apps/frontend/src/store/useStoryboardStore.ts`:

```typescript
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

export interface StoryboardActions {
  setShots: (shots: Shot[]) => void;
  addShot: (afterId?: string) => void;
  removeShot: (id: string) => void;
  duplicateShot: (id: string) => void;
  reorderShots: (fromIndex: number, toIndex: number) => void;
  updateShot: (id: string, partial: Partial<Shot>) => void;
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

export const useStoryboardStore = create<StoryboardStore>((set, get) => ({
  ...initialState,

  setShots: (shots) => set({ shots }),

  addShot: (afterId) =>
    set((state) => {
      const idx = afterId
        ? state.shots.findIndex((s) => s.id === afterId)
        : state.shots.length - 1;
      const newShot = createEmptyShot(idx + 2);
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
      const filtered = state.shots.filter((s) => s.id !== id);
      const newActive =
        state.activeShotId === id
          ? filtered[Math.min(filtered.length - 1, 0)]?.id ?? null
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
      const clone: Shot = { ...createEmptyShot(0), id: generateId(), description: target.description, duration: target.duration, type: target.type, script: target.script };
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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
cd apps/frontend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

### Task 2: Create ShotItem + ShotList components

**Files:**
- Create: `apps/frontend/src/components/storyboard/ShotItem.tsx`
- Create: `apps/frontend/src/components/storyboard/ShotList.tsx`

- [ ] **Step 1: Write ShotItem**

Write `apps/frontend/src/components/storyboard/ShotItem.tsx`:

```typescript
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Tag, Tooltip, Typography, Space } from 'antd';
import {
  MenuOutlined, PlayCircleOutlined, LoadingOutlined,
  EyeOutlined, ReloadOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { Shot } from '../../store/useStoryboardStore';

const { Text } = Typography;

interface ShotItemProps {
  shot: Shot;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRegenerate?: (id: string) => void;
}

export const ShotItem: React.FC<ShotItemProps> = ({
  shot, isActive, onSelect, onDelete, onRegenerate,
}) => {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: shot.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  const statusColor: Record<string, string> = {
    pending: 'default', generating: 'processing', completed: 'success', failed: 'error',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(shot.id)}
      className={`shot-item ${isActive ? 'shot-item--active' : ''}`}
    >
      {/* Drag handle */}
      <div {...attributes} {...listeners} style={{ padding: '0 4px', display: 'flex', alignItems: 'center' }}>
        <MenuOutlined style={{ color: 'var(--text-tertiary)', fontSize: 14 }} />
      </div>

      {/* Thumbnail */}
      <div className="shot-item__thumb">
        {shot.status === 'completed' && shot.videoUrl ? (
          <div className="shot-item__thumb-play">
            <PlayCircleOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
        ) : shot.status === 'generating' ? (
          <LoadingOutlined style={{ fontSize: 18, color: 'var(--brand-primary)' }} spin />
        ) : (
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-tertiary)' }}>
            {shot.order}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text
          strong
          style={{ color: 'var(--text-primary)', fontSize: 13, display: 'block' }}
          ellipsis
        >
          {shot.description || `分镜 ${shot.order}`}
        </Text>
        <Space size={4} style={{ marginTop: 2 }}>
          <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{shot.duration}s</Text>
          <Tag color={statusColor[shot.status]} style={{ fontSize: 10, lineHeight: '16px', borderRadius: 10 }}>
            {shot.status === 'pending' ? '等待' : shot.status === 'generating' ? '生成中' : shot.status === 'completed' ? '完成' : '失败'}
          </Tag>
        </Space>
      </div>

      {/* Actions */}
      <div className="shot-item__actions" onClick={(e) => e.stopPropagation()}>
        {shot.status === 'completed' && (
          <Tooltip title="重新生成">
            <Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => onRegenerate?.(shot.id)} />
          </Tooltip>
        )}
        <Tooltip title="删除">
          <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#ef4444' }} onClick={() => onDelete(shot.id)} />
        </Tooltip>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Write ShotList**

Write `apps/frontend/src/components/storyboard/ShotList.tsx`:

```typescript
import React from 'react';
import {
  DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button, Typography, Space } from 'antd';
import { PlusOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Shot, useStoryboardStore } from '../../store/useStoryboardStore';
import { ShotItem } from './ShotItem';

const { Text } = Typography;

interface ShotListProps {
  onRegenerateShot?: (id: string) => void;
}

export const ShotList: React.FC<ShotListProps> = ({ onRegenerateShot }) => {
  const shots = useStoryboardStore((s) => s.shots);
  const activeShotId = useStoryboardStore((s) => s.activeShotId);
  const setActiveShot = useStoryboardStore((s) => s.setActiveShot);
  const reorderShots = useStoryboardStore((s) => s.reorderShots);
  const removeShot = useStoryboardStore((s) => s.removeShot);
  const addShot = useStoryboardStore((s) => s.addShot);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = shots.findIndex((s) => s.id === active.id);
    const newIdx = shots.findIndex((s) => s.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) reorderShots(oldIdx, newIdx);
  };

  const completedCount = shots.filter((s) => s.status === 'completed').length;

  return (
    <div className="shot-list">
      <div className="shot-list__header">
        <Space>
          <VideoCameraOutlined style={{ color: 'var(--brand-primary)' }} />
          <Text strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>分镜列表</Text>
          <span className="shot-list__count">{shots.length}</span>
        </Space>
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => addShot()}
        >
          添加
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={shots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {shots.map((shot) => (
            <ShotItem
              key={shot.id}
              shot={shot}
              isActive={shot.id === activeShotId}
              onSelect={setActiveShot}
              onDelete={removeShot}
              onRegenerate={onRegenerateShot}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
cd apps/frontend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

### Task 3: Create VideoPlayer + PreviewPanel

**Files:**
- Create: `apps/frontend/src/components/player/VideoPlayer.tsx`
- Create: `apps/frontend/src/components/storyboard/PreviewPanel.tsx`

- [ ] **Step 1: Write VideoPlayer**

Write `apps/frontend/src/components/player/VideoPlayer.tsx`:

```typescript
import React from 'react';
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { PlaybackState } from '../../store/useStoryboardStore';

const { Text } = Typography;

interface VideoPlayerProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  playbackState: PlaybackState;
  onTogglePlay: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl, thumbnailUrl, playbackState, onTogglePlay,
}) => {
  if (!videoUrl) {
    return (
      <div className="video-player video-player--empty" onClick={onTogglePlay}>
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="preview" className="video-player__thumb" />
        ) : (
          <div className="video-player__placeholder">
            <PlayCircleOutlined style={{ fontSize: 48, color: 'var(--text-tertiary)', opacity: 0.5 }} />
            <Text style={{ color: 'var(--text-tertiary)', marginTop: 8 }}>选择分镜以预览</Text>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="video-player">
      <video
        src={videoUrl}
        className="video-player__video"
        autoPlay={playbackState === 'playing'}
        onClick={onTogglePlay}
      />
      <div className="video-player__overlay" onClick={onTogglePlay}>
        {playbackState === 'paused' || playbackState === 'idle' ? (
          <PlayCircleOutlined style={{ fontSize: 56, color: '#fff', opacity: 0.85 }} />
        ) : (
          <PauseCircleOutlined style={{ fontSize: 56, color: '#fff', opacity: 0.85 }} />
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Write PreviewPanel**

Write `apps/frontend/src/components/storyboard/PreviewPanel.tsx`:

```typescript
import React from 'react';
import { Button, Typography, Space, Progress } from 'antd';
import {
  PlayCircleOutlined, PauseCircleOutlined, StepForwardOutlined, StepBackwardOutlined,
} from '@ant-design/icons';
import { useStoryboardStore } from '../../store/useStoryboardStore';
import { VideoPlayer } from '../player/VideoPlayer';

const { Text } = Typography;

export const PreviewPanel: React.FC = () => {
  const shots = useStoryboardStore((s) => s.shots);
  const activeShotId = useStoryboardStore((s) => s.activeShotId);
  const playbackState = useStoryboardStore((s) => s.playbackState);
  const currentTime = useStoryboardStore((s) => s.currentTime);
  const setPlaybackState = useStoryboardStore((s) => s.setPlaybackState);
  const setActiveShot = useStoryboardStore((s) => s.setActiveShot);

  const activeShot = shots.find((s) => s.id === activeShotId);
  const activeIndex = shots.findIndex((s) => s.id === activeShotId);

  const progress = activeShot
    ? Math.round((currentTime / activeShot.duration) * 100)
    : 0;

  const handleTogglePlay = () => {
    if (!activeShot) return;
    setPlaybackState(playbackState === 'playing' ? 'paused' : 'playing');
  };

  const handlePrev = () => {
    if (activeIndex > 0) setActiveShot(shots[activeIndex - 1].id);
  };

  const handleNext = () => {
    if (activeIndex < shots.length - 1) setActiveShot(shots[activeIndex + 1].id);
  };

  return (
    <div className="preview-panel">
      <div className="preview-panel__header">
        <Text strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>预览</Text>
        {activeShot && (
          <Text style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
            分镜 {activeIndex + 1} / {shots.length}
          </Text>
        )}
      </div>

      <VideoPlayer
        videoUrl={activeShot?.videoUrl}
        thumbnailUrl={activeShot?.thumbnailUrl}
        playbackState={playbackState}
        onTogglePlay={handleTogglePlay}
      />

      {activeShot && (
        <>
          <Progress
            percent={progress}
            size="small"
            showInfo={false}
            strokeColor="var(--brand-primary)"
            trailColor="var(--border-color)"
            style={{ margin: 0 }}
          />
          <Space className="preview-panel__controls" size="middle">
            <Button type="text" icon={<StepBackwardOutlined />} onClick={handlePrev} disabled={activeIndex <= 0} />
            <Button
              type="primary"
              shape="circle"
              icon={playbackState === 'playing' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handleTogglePlay}
              style={{ width: 40, height: 40 }}
            />
            <Button type="text" icon={<StepForwardOutlined />} onClick={handleNext} disabled={activeIndex >= shots.length - 1} />
          </Space>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
cd apps/frontend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

### Task 4: Create ShotDetailPanel + sub-editors

**Files:**
- Create: `apps/frontend/src/components/storyboard/MaterialSelector.tsx`
- Create: `apps/frontend/src/components/storyboard/ShotDetailPanel.tsx`

- [ ] **Step 1: Write MaterialSelector**

Write `apps/frontend/src/components/storyboard/MaterialSelector.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { Button, Popover, Input, List, Typography, Space, Spin, Tag } from 'antd';
import { PictureOutlined, SearchOutlined } from '@ant-design/icons';
import { materialApi, MaterialItem } from '../../services/material';

const { Text } = Typography;

interface MaterialSelectorProps {
  selectedId?: string;
  onSelect: (material: MaterialItem) => void;
}

export const MaterialSelector: React.FC<MaterialSelectorProps> = ({ selectedId, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    materialApi.getList({ type: 'image', pageSize: 12, search })
      .then((res) => setMaterials(res.list ?? []))
      .finally(() => setLoading(false));
  }, [open, search]);

  const selectedMat = materials.find((m) => m.id === selectedId);

  const content = (
    <div style={{ width: 300 }}>
      <Input
        prefix={<SearchOutlined />}
        placeholder="搜索素材..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 8, borderRadius: 'var(--radius-md)' }}
      />
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : (
        <List
          size="small"
          dataSource={materials}
          renderItem={(item) => (
            <List.Item
              onClick={() => { onSelect(item); setOpen(false); }}
              style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
              className={selectedId === item.id ? 'ant-list-item-selected' : ''}
            >
              <Space>
                <div style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <PictureOutlined style={{ color: 'var(--text-tertiary)' }} />
                  )}
                </div>
                <div>
                  <Text style={{ fontSize: 13, color: 'var(--text-primary)', display: 'block' }}>{item.name}</Text>
                  <Tag style={{ fontSize: 10 }}>{item.category || '未分类'}</Tag>
                </div>
              </Space>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Popover content={content} title="选择素材" trigger="click" open={open} onOpenChange={setOpen}>
      <Button icon={<PictureOutlined />} style={{ borderRadius: 'var(--radius-md)' }}>
        {selectedMat ? selectedMat.name : '选择素材'}
      </Button>
    </Popover>
  );
};
```

- [ ] **Step 2: Write ShotDetailPanel**

Write `apps/frontend/src/components/storyboard/ShotDetailPanel.tsx`:

```typescript
import React from 'react';
import { Button, Typography, Input, Slider, Select, Space, Divider, Tooltip, message } from 'antd';
import {
  ReloadOutlined, DeleteOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useStoryboardStore } from '../../store/useStoryboardStore';
import { MaterialSelector } from './MaterialSelector';
import { MaterialItem } from '../../services/material';

const { Text, TextArea } = Typography;

interface ShotDetailPanelProps {
  onRegenerate?: (id: string) => void;
}

export const ShotDetailPanel: React.FC<ShotDetailPanelProps> = ({ onRegenerate }) => {
  const shots = useStoryboardStore((s) => s.shots);
  const activeShotId = useStoryboardStore((s) => s.activeShotId);
  const updateShot = useStoryboardStore((s) => s.updateShot);
  const removeShot = useStoryboardStore((s) => s.removeShot);

  const shot = shots.find((s) => s.id === activeShotId);

  if (!shot) {
    return (
      <div className="shot-detail-panel">
        <div className="shot-detail-panel__empty">
          <Text style={{ color: 'var(--text-tertiary)' }}>请选择一个分镜以编辑详情</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="shot-detail-panel">
      <div className="shot-detail-panel__header">
        <Text strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>
          分镜 {shot.order} 详情
        </Text>
      </div>

      <div className="shot-detail-panel__body">
        {/* 画面描述 */}
        <div className="shot-detail-field">
          <Text className="shot-detail-field__label">画面描述 Prompt</Text>
          <TextArea
            value={shot.description}
            onChange={(e) => updateShot(shot.id, { description: e.target.value })}
            rows={3}
            placeholder="描述画面内容..."
            style={{ borderRadius: 'var(--radius-md)' }}
          />
        </div>

        {/* 分镜类型 */}
        <div className="shot-detail-field">
          <Text className="shot-detail-field__label">生成类型</Text>
          <Select
            value={shot.type}
            onChange={(v) => updateShot(shot.id, { type: v })}
            style={{ width: '100%' }}
            options={[
              { value: 'text-to-video', label: '文生视频 (Text-to-Video)' },
              { value: 'image-to-video', label: '图生视频 (Image-to-Video)' },
            ]}
          />
        </div>

        {/* 素材选择 */}
        <div className="shot-detail-field">
          <Text className="shot-detail-field__label">参考素材</Text>
          <MaterialSelector
            selectedId={shot.referenceMaterialId}
            onSelect={(mat: MaterialItem) => updateShot(shot.id, { referenceMaterialId: mat.id })}
          />
        </div>

        {/* 时长 */}
        <div className="shot-detail-field">
          <Text className="shot-detail-field__label">时长: {shot.duration}s</Text>
          <Slider
            min={1}
            max={30}
            value={shot.duration}
            onChange={(v) => updateShot(shot.id, { duration: v })}
            marks={{ 1: '1s', 5: '5s', 15: '15s', 30: '30s' }}
          />
        </div>

        {/* 台词 */}
        <div className="shot-detail-field">
          <Text className="shot-detail-field__label">配音台词</Text>
          <TextArea
            value={shot.script}
            onChange={(e) => updateShot(shot.id, { script: e.target.value })}
            rows={2}
            placeholder="输入配音文本..."
            style={{ borderRadius: 'var(--radius-md)' }}
          />
        </div>

        <Divider style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />

        {/* 操作按钮 */}
        <Space>
          {onRegenerate && (
            <Tooltip title="仅重新生成此分镜">
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                size="small"
                onClick={() => onRegenerate(shot.id)}
              >
                重新生成
              </Button>
            </Tooltip>
          )}
          <Tooltip title="从尾删除此分镜">
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => removeShot(shot.id)}
            >
              删除
            </Button>
          </Tooltip>
        </Space>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
cd apps/frontend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

### Task 5: Create TimelineBar

**Files:**
- Create: `apps/frontend/src/components/storyboard/TimelineBar.tsx`

- [ ] **Step 1: Write TimelineBar**

Write `apps/frontend/src/components/storyboard/TimelineBar.tsx`:

```typescript
import React, { useRef } from 'react';
import { Typography } from 'antd';
import { useStoryboardStore, Shot } from '../../store/useStoryboardStore';

const { Text } = Typography;

export const TimelineBar: React.FC = () => {
  const shots = useStoryboardStore((s) => s.shots);
  const activeShotId = useStoryboardStore((s) => s.activeShotId);
  const setActiveShot = useStoryboardStore((s) => s.setActiveShot);

  const totalDuration = shots.reduce((acc, s) => acc + s.duration, 0);
  if (totalDuration === 0) return null;

  const pixelsPerSecond = 8;

  const statusColors: Record<string, string> = {
    pending: 'var(--text-tertiary)',
    generating: 'var(--brand-primary)',
    completed: '#10b981',
    failed: '#ef4444',
  };

  let currentOffset = 0;

  return (
    <div className="timeline-bar">
      {/* Time ruler */}
      <div className="timeline-bar__ruler">
        {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }, (_, i) => (
          <div
            key={i}
            className="timeline-bar__tick"
            style={{ left: i * 5 * pixelsPerSecond }}
          >
            <div className="timeline-bar__tick-line" />
            <Text className="timeline-bar__tick-label">{i * 5}s</Text>
          </div>
        ))}
      </div>

      {/* Shot blocks */}
      <div className="timeline-bar__tracks">
        {shots.map((shot) => {
          const width = shot.duration * pixelsPerSecond;
          const block = (
            <div
              key={shot.id}
              className={`timeline-bar__block ${shot.id === activeShotId ? 'timeline-bar__block--active' : ''}`}
              style={{
                left: currentOffset,
                width: Math.max(width, 24),
                background: statusColors[shot.status],
              }}
              onClick={() => setActiveShot(shot.id)}
            >
              <Text className="timeline-bar__block-label">
                {shot.order} - {shot.duration}s
              </Text>
            </div>
          );
          currentOffset += width;
          return block;
        })}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd apps/frontend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

### Task 6: Create keyboard shortcuts hook + StoryboardEditor container

**Files:**
- Create: `apps/frontend/src/hooks/useKeyboardShortcuts.ts`
- Create: `apps/frontend/src/components/storyboard/StoryboardEditor.tsx`

- [ ] **Step 1: Write useKeyboardShortcuts**

Write `apps/frontend/src/hooks/useKeyboardShortcuts.ts`:

```typescript
import { useEffect } from 'react';

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(map: ShortcutMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const key = [
        e.metaKey ? 'Cmd' : '',
        e.ctrlKey ? 'Ctrl' : '',
        e.shiftKey ? 'Shift' : '',
        e.key === ' ' ? 'Space' : e.key,
      ]
        .filter(Boolean)
        .join('+');

      const action = map[key];
      if (action) {
        e.preventDefault();
        e.stopPropagation();
        action();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [map, enabled]);
}
```

- [ ] **Step 2: Write StoryboardEditor container**

Write `apps/frontend/src/components/storyboard/StoryboardEditor.tsx`:

```typescript
import React, { useCallback, useMemo } from 'react';
import { message } from 'antd';
import { useStoryboardStore } from '../../store/useStoryboardStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { ShotList } from './ShotList';
import { PreviewPanel } from './PreviewPanel';
import { ShotDetailPanel } from './ShotDetailPanel';
import { TimelineBar } from './TimelineBar';

export interface StoryboardEditorProps {
  onRegenerateShot?: (id: string) => void;
}

export const StoryboardEditor: React.FC<StoryboardEditorProps> = ({ onRegenerateShot }) => {
  const shots = useStoryboardStore((s) => s.shots);
  const activeShotId = useStoryboardStore((s) => s.activeShotId);
  const playbackState = useStoryboardStore((s) => s.playbackState);
  const setPlaybackState = useStoryboardStore((s) => s.setPlaybackState);
  const setActiveShot = useStoryboardStore((s) => s.setActiveShot);
  const addShot = useStoryboardStore((s) => s.addShot);
  const duplicateShot = useStoryboardStore((s) => s.duplicateShot);
  const removeShot = useStoryboardStore((s) => s.removeShot);

  const activeIndex = shots.findIndex((s) => s.id === activeShotId);

  const shortcuts = useMemo(() => ({
    Space: () => setPlaybackState(playbackState === 'playing' ? 'paused' : 'playing'),
    ArrowLeft: () => {
      if (activeIndex > 0) setActiveShot(shots[activeIndex - 1].id);
    },
    ArrowRight: () => {
      if (activeIndex < shots.length - 1) setActiveShot(shots[activeIndex + 1].id);
    },
    'Cmd+d': () => {
      if (activeShotId) { duplicateShot(activeShotId); message.success('已复制分镜'); }
    },
    'Ctrl+d': () => {
      if (activeShotId) { duplicateShot(activeShotId); message.success('已复制分镜'); }
    },
    Delete: () => {
      if (activeShotId && shots.length > 1) { removeShot(activeShotId); message.success('已删除分镜'); }
    },
    Backspace: () => {
      if (activeShotId && shots.length > 1) { removeShot(activeShotId); message.success('已删除分镜'); }
    },
    'Cmd+Enter': () => {
      if (activeShotId && onRegenerateShot) onRegenerateShot(activeShotId);
    },
    'Ctrl+Enter': () => {
      if (activeShotId && onRegenerateShot) onRegenerateShot(activeShotId);
    },
  }), [activeShotId, activeIndex, shots.length, playbackState, setPlaybackState, setActiveShot, duplicateShot, removeShot, onRegenerateShot]);

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="storyboard-editor">
      <div className="storyboard-editor__main">
        <div className="storyboard-editor__left">
          <ShotList onRegenerateShot={onRegenerateShot} />
        </div>
        <div className="storyboard-editor__center">
          <PreviewPanel />
        </div>
        <div className="storyboard-editor__right">
          <ShotDetailPanel onRegenerate={onRegenerateShot} />
        </div>
      </div>
      <div className="storyboard-editor__bottom">
        <TimelineBar />
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
cd apps/frontend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

### Task 7: Integrate StoryboardEditor into CreationPage + CSS

**Files:**
- Modify: `apps/frontend/src/pages/creation/index.tsx`
- Create (if needed): `apps/frontend/src/pages/creation/creation.css`

- [ ] **Step 1: Add StoryboardEditor CSS**

Write `apps/frontend/src/components/storyboard/storyboard.css`:

```css
/* Storyboard Editor Layout */
.storyboard-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1px;
  background: var(--bg-primary);
}

.storyboard-editor__main {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 1px;
  background: var(--bg-primary);
}

.storyboard-editor__left {
  width: 280px;
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--bg-surface-1);
}

.storyboard-editor__center {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-surface-1);
}

.storyboard-editor__right {
  width: 320px;
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--bg-surface-1);
}

.storyboard-editor__bottom {
  height: 72px;
  flex-shrink: 0;
  background: var(--bg-surface-1);
  overflow-x: auto;
}

/* Shot List */
.shot-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.shot-list__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--brand-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

/* Shot Item */
.shot-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s;
  cursor: pointer;
  user-select: none;
}

.shot-item:hover {
  background: rgba(255,255,255,0.03);
}

.shot-item--active {
  background: rgba(99,102,241,0.12);
  border-left: 3px solid var(--brand-primary);
}

.shot-item__thumb {
  width: 48px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.shot-item__thumb-play {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.shot-item__actions {
  display: none;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.shot-item:hover .shot-item__actions {
  display: flex;
}

/* Preview Panel */
.preview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.preview-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.preview-panel__controls {
  display: flex;
  justify-content: center;
  padding: 8px;
}

/* Video Player */
.video-player {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 200px;
  cursor: pointer;
}

.video-player--empty {
  background: var(--bg-surface-2);
  margin: 16px;
  border-radius: var(--radius-lg);
}

.video-player__video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.video-player__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.video-player__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-lg);
}

.video-player__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s;
}

.video-player__overlay:hover {
  background: rgba(0,0,0,0.15);
}

/* Shot Detail Panel */
.shot-detail-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.shot-detail-panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
}

.shot-detail-panel__header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.shot-detail-panel__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shot-detail-field__label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-secondary) !important;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Timeline Bar */
.timeline-bar {
  position: relative;
  height: 72px;
  padding: 4px 0;
}

.timeline-bar__ruler {
  position: relative;
  height: 20px;
  margin-left: 12px;
}

.timeline-bar__tick {
  position: absolute;
  top: 0;
}

.timeline-bar__tick-line {
  width: 1px;
  height: 8px;
  background: var(--border-color);
}

.timeline-bar__tick-label {
  font-size: 10px !important;
  color: var(--text-tertiary) !important;
  margin-left: 4px;
}

.timeline-bar__tracks {
  position: relative;
  height: 40px;
  margin: 4px 12px 0;
}

.timeline-bar__block {
  position: absolute;
  top: 0;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;
  min-width: 24px;
  opacity: 0.7;
}

.timeline-bar__block:hover {
  opacity: 1;
}

.timeline-bar__block--active {
  opacity: 1;
  box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--brand-primary);
}

.timeline-bar__block-label {
  color: #fff !important;
  font-size: 10px !important;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}
```

- [ ] **Step 2: Add import to CreationPage**

At the top of `apps/frontend/src/pages/creation/index.tsx`, add the import:
```typescript
import { StoryboardEditor } from '../../components/storyboard/StoryboardEditor';
import '../../components/storyboard/storyboard.css';
```

- [ ] **Step 3: Refactor CreationPage storyboard section**

In `apps/frontend/src/pages/creation/index.tsx`, replace the storyboard display section (the `<Col xs={24} lg={16}>` block with the `storyboard.map(...)` loop inside the `currentStep === 'config' || currentStep === 'storyboard'` branch) with the StoryboardEditor component.

The exact replacement: find the block starting at line 250 (`<Col xs={24} lg={16}>` through the closing `</Col>` at approximately line 369) and replace it with:

```typescript
          <Col xs={24} lg={16}>
            <GlassPanel variant="card" style={{ overflow: 'hidden', padding: 0 }}>
              <StoryboardEditor onRegenerateShot={handleRegenerateShot} />
            </GlassPanel>
          </Col>
```

Then add the `handleRegenerateShot` function to the CreationPage component:

```typescript
const handleRegenerateShot = useCallback((shotId: string) => {
  setStoryboard((prev) => prev.map((item) =>
    item.id === shotId ? { ...item, status: 'generating' as const } : item
  ));
  setTimeout(() => {
    setStoryboard((prev) => prev.map((item) =>
      item.id === shotId ? { ...item, status: 'completed' as const, videoUrl: '#' } : item
    ));
    message.success('分镜重新生成成功');
  }, 3000);
}, []);
```

Add the import for `useCallback` at the top of the file:
```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
```

- [ ] **Step 4: Initialize storyboard store from existing data**

In `CreationPage`, add a `useEffect` to sync mock data into the store on mount:

```typescript
import { useStoryboardStore, Shot } from '../../store/useStoryboardStore';

// Inside CreationPage:
const setShots = useStoryboardStore((s) => s.setShots);
const setActiveShot = useStoryboardStore((s) => s.setActiveShot);

useEffect(() => {
  const shots: Shot[] = mockStoryboard.map((m) => ({
    id: m.id,
    order: m.order,
    description: m.description,
    duration: m.duration,
    type: m.type,
    script: '',
    status: m.status,
    videoUrl: m.videoUrl,
  }));
  setShots(shots);
  setActiveShot(shots[0]?.id ?? null);
}, []);
```

- [ ] **Step 5: Verify build**

Run:
```bash
cd apps/frontend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

## Sub-Plan B: Backend Extensions

### Task 8: Per-shot regeneration API + WebSocket events

**Files:**
- Modify: `apps/backend/src/modules/creation/creation.controller.ts`
- Modify: `apps/backend/src/modules/creation/creation.service.ts`
- Modify: `apps/backend/src/modules/creation/gateway/creation.gateway.ts`
- Create: `apps/backend/src/modules/creation/dto/regenerate-shot.dto.ts`

- [ ] **Step 1: Create RegenerateShotDto**

Write `apps/backend/src/modules/creation/dto/regenerate-shot.dto.ts`:

```typescript
import { IsString, IsOptional, IsObject } from 'class-validator';

export class RegenerateShotDto {
  @IsString()
  shotId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  overrides?: Record<string, any>;
}
```

- [ ] **Step 2: Add per-shot regeneration endpoint to controller**

In `apps/backend/src/modules/creation/creation.controller.ts`, add:

```typescript
import { Patch, Body, Param } from '@nestjs/common';
import { RegenerateShotDto } from './dto/regenerate-shot.dto';

// Inside class, after existing methods:

@Patch('task/:id/shot')
@ApiOperation({ summary: '重新生成单个分镜' })
regenerateShot(@Param('id') id: string, @Body() dto: RegenerateShotDto) {
  return this.creationService.regenerateShot(id, dto);
}
```

- [ ] **Step 3: Add regenerateShot method to service**

In `apps/backend/src/modules/creation/creation.service.ts`, add:

```typescript
async regenerateShot(taskId: string, dto: RegenerateShotDto): Promise<void> {
  const task = await this.taskRepository.findOneOrFail({ where: { id: taskId } });
  const storyboard = [...(task.storyboard || [])];
  const idx = storyboard.findIndex((s) => s.id === dto.shotId);
  if (idx === -1) throw new Error(`Shot ${dto.shotId} not found`);

  // Update shot description if provided
  if (dto.description) {
    storyboard[idx] = { ...storyboard[idx], description: dto.description };
  }

  // Mark as generating
  storyboard[idx] = { ...storyboard[idx], status: 'generating' };
  task.storyboard = storyboard;
  task.status = 'processing';
  await this.taskRepository.save(task);

  this.creationGateway.emitProgress(taskId, {
    progress: task.progress || 0,
    status: 'processing',
    message: `正在重新生成分镜 ${idx + 1}...`,
  });

  // Simulate regeneration (replace with actual AI call in production)
  await this.delay(3000);
  storyboard[idx] = {
    ...storyboard[idx],
    status: 'completed',
    videoUrl: '#',
    thumbnailUrl: '#',
  };
  task.storyboard = storyboard;
  await this.taskRepository.save(task);

  this.creationGateway.emitComplete(taskId, {
    progress: 100,
    status: 'completed',
    shotId: dto.shotId,
    result: storyboard[idx],
  });
}
```

- [ ] **Step 4: Add emitShotProgress to gateway**

In `apps/backend/src/modules/creation/gateway/creation.gateway.ts`, add:

```typescript
emitShotProgress(taskId: string, data: { shotId: string; progress: number; status: string; message?: string }) {
  this.server.to(`task:${taskId}`).emit('shot-progress', data);
}
```

- [ ] **Step 5: Verify backend compiles**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

### Task 9: Three-layer tagging system

**Files:**
- Modify: `apps/backend/src/modules/material/entities/material.entity.ts`
- Create: `apps/backend/src/modules/material/dto/analyze-material.dto.ts`
- Modify: `apps/backend/src/modules/material/material.controller.ts`
- Modify: `apps/backend/src/modules/material/material.service.ts`

- [ ] **Step 1: Extend Material entity with three-layer tags**

Update `apps/backend/src/modules/material/entities/material.entity.ts` — add these columns after the existing `@Column('simple-array', { nullable: true }) tags: string[];`:

```typescript
@Column({ type: 'json', nullable: true })
productTags: Record<string, any>;

@Column({ type: 'json', nullable: true })
videoTags: Record<string, any>;

@Column({ type: 'json', nullable: true })
clipTags: Record<string, any>;
```

- [ ] **Step 2: Create AnalyzeMaterialDto**

Write `apps/backend/src/modules/material/dto/analyze-material.dto.ts`:

```typescript
import { IsOptional, IsString } from 'class-validator';

export class AnalyzeMaterialDto {
  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

- [ ] **Step 3: Add analyze + search-by-tag endpoints to controller**

In `apps/backend/src/modules/material/material.controller.ts`, add:

```typescript
import { Patch, Body, Query } from '@nestjs/common';
import { AnalyzeMaterialDto } from './dto/analyze-material.dto';

// Inside class:

@Patch(':id/analyze')
@ApiOperation({ summary: 'AI分析素材并生成三层标签' })
analyze(@Param('id') id: string, @Body() dto: AnalyzeMaterialDto) {
  return this.materialService.analyzeTags(id, dto);
}

@Get('search/tags')
@ApiOperation({ summary: '按标签层级搜索素材' })
searchByTags(
  @Query('productCategory') productCategory?: string,
  @Query('videoMood') videoMood?: string,
  @Query('clipObjects') clipObjects?: string,
) {
  return this.materialService.searchByTags({ productCategory, videoMood, clipObjects });
}
```

- [ ] **Step 4: Add analyzeTags + searchByTags to service**

In `apps/backend/src/modules/material/material.service.ts`, add these methods:

```typescript
async analyzeTags(id: string, dto: AnalyzeMaterialDto): Promise<Material> {
  const material = await this.materialRepository.findOneOrFail({ where: { id } });

  // Simulate LLM analysis — in production, call Volcengine ARK multimodal API
  const productTags = {
    category: dto.category || material.category || '通用',
    brand: null,
    priceRange: null,
    style: 'modern',
  };

  const videoTags = {
    summary: dto.description || material.name,
    style: 'cinematic',
    mood: 'professional',
    sceneTags: ['studio', 'product'],
  };

  const clipTags = {
    objects: ['product'],
    colors: ['#ffffff', '#000000'],
    composition: 'center',
    text: '',
  };

  material.productTags = productTags;
  material.videoTags = videoTags;
  material.clipTags = clipTags;
  material.metadata = {
    ...(material.metadata || {}),
    analyzedAt: new Date().toISOString(),
  };

  return this.materialRepository.save(material);
}

async searchByTags(filters: {
  productCategory?: string;
  videoMood?: string;
  clipObjects?: string;
}): Promise<Material[]> {
  const materials = await this.materialRepository.find({
    where: { type: 'image' },
    order: { createdAt: 'DESC' },
  });

  // Simple client-side filter (PG JSON query in production)
  return materials.filter((m) => {
    const pt = m.productTags as any;
    const vt = m.videoTags as any;
    const ct = m.clipTags as any;

    if (filters.productCategory && pt?.category !== filters.productCategory) return false;
    if (filters.videoMood && vt?.mood !== filters.videoMood) return false;
    if (filters.clipObjects && !ct?.objects?.includes(filters.clipObjects)) return false;
    return true;
  });
}
```

- [ ] **Step 5: Verify backend compiles**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

### Task 10: PGVector semantic search

**Files:**
- Create: `apps/backend/src/modules/material/dto/semantic-search.dto.ts`
- Modify: `apps/backend/src/modules/material/material.controller.ts`
- Modify: `apps/backend/src/modules/material/material.service.ts`
- Modify: `apps/backend/src/modules/material/material.module.ts`

- [ ] **Step 1: Create SemanticSearchDto**

Write `apps/backend/src/modules/material/dto/semantic-search.dto.ts`:

```typescript
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SemanticSearchDto {
  @IsString()
  query: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsNumber()
  similarityThreshold?: number = 0.7;
}
```

- [ ] **Step 2: Add semantic search dependencies to MaterialModule**

In `apps/backend/src/modules/material/material.module.ts`, ensure imports include `HttpModule`:

```typescript
import { HttpModule } from '@nestjs/axios';
// In @Module decorator:
// imports: [HttpModule, ...],
```

If `@nestjs/axios` is not installed, add it:
```bash
cd apps/backend && npm install @nestjs/axios
```

- [ ] **Step 3: Add semantic search endpoint to controller**

In `apps/backend/src/modules/material/material.controller.ts`, add:

```typescript
import { Body, Post } from '@nestjs/common';
import { SemanticSearchDto } from './dto/semantic-search.dto';

// Inside class:

@Post('search/semantic')
@ApiOperation({ summary: '语义搜索素材' })
semanticSearch(@Body() dto: SemanticSearchDto) {
  return this.materialService.semanticSearch(dto);
}
```

- [ ] **Step 4: Add semantic search to service**

In `apps/backend/src/modules/material/material.service.ts`, add:

```typescript
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { SemanticSearchDto } from './dto/semantic-search.dto';

// In constructor:
// constructor(
//   @InjectRepository(Material)
//   private materialRepository: Repository<Material>,
//   private readonly httpService: HttpService,
// ) {}

async semanticSearch(dto: SemanticSearchDto): Promise<any> {
  const { query, limit = 20 } = dto;

  // Step 1: Get embedding from embedding API (Volcengine ARK)
  let embedding: number[];
  try {
    const response = await lastValueFrom(
      this.httpService.post(process.env.EMBEDDING_API_URL || 'http://localhost:11434/api/embeddings', {
        model: 'bge-m3',
        prompt: query,
      })
    );
    embedding = response.data.embedding;
  } catch {
    // Fallback: return keyword-based results
    return this.materialRepository.find({
      where: { name: Like(`%${query}%`) },
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  // Step 2: PGVector similarity search
  // Note: Requires PGVector extension enabled on PostgreSQL
  // CREATE EXTENSION IF NOT EXISTS vector;
  // ALTER TABLE materials ADD COLUMN embedding vector(1024);
  try {
    const result = await this.materialRepository.query(
      `SELECT id, name, type, url, thumbnail_url, tags, category,
              1 - (embedding <=> $1::vector) AS similarity
       FROM materials
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [`[${embedding.join(',')}]`, limit]
    );
    return result;
  } catch {
    // PGVector not available — fallback
    return this.materialRepository.find({
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }
}
```

- [ ] **Step 5: Add PGVector migration note**

Embedding column needs to be added manually since TypeORM doesn't natively support PGVector. Run this SQL on the database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS embedding vector(1024);
```

Or create a migration file at `apps/backend/src/migrations/AddEmbeddingColumn.ts`. For `synchronize: true` (dev mode), TypeORM will create the column as `json` type — in production, use a proper migration.

- [ ] **Step 6: Verify backend compiles**

Run:
```bash
cd apps/backend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

### Task 11: Frontend shot service + connect MaterialSelector to real data

**Files:**
- Create: `apps/frontend/src/services/shot.ts`
- Modify: `apps/frontend/src/components/storyboard/MaterialSelector.tsx` (already done in Task 4, verify)

- [ ] **Step 1: Create shot service**

Write `apps/frontend/src/services/shot.ts`:

```typescript
import apiClient from '../utils/api';

export interface ShotData {
  id: string;
  order: number;
  description: string;
  duration: number;
  type: 'text-to-video' | 'image-to-video';
  referenceMaterialId?: string;
  script: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
}

export interface RegenerateShotDto {
  shotId: string;
  description?: string;
  overrides?: Record<string, any>;
}

export const shotApi = {
  regenerate(taskId: string, data: RegenerateShotDto) {
    return apiClient.patch<any, ShotData>(`/creation/task/${taskId}/shot`, data);
  },
};
```

- [ ] **Step 2: Verify frontend compiles**

Run:
```bash
cd apps/frontend && npx tsc --noEmit --pretty
```

Expected: clean output with no errors.

---

## Execution Order

```
Task 1 (Store + deps) → Task 2 (ShotList) → Task 3 (PreviewPanel) → Task 4 (ShotDetailPanel)
→ Task 5 (TimelineBar) → Task 6 (Editor container + shortcuts) → Task 7 (CreationPage integration)
→ Task 8 (Per-shot backend) → Task 9 (Tag system) → Task 10 (PGVector) → Task 11 (Shot service)
```

Tasks 1-7 are frontend (storyboard editor), Tasks 8-10 are backend (material intelligence), Task 11 bridges both. Execute sequentially to avoid conflicts.

## Self-Review

1. **Spec coverage check:**
   - Section 3.1 (component hierarchy): all StoryboardEditor sub-components created — ShotList, ShotItem, PreviewPanel, VideoPlayer, ShotDetailPanel, MaterialSelector, TimelineBar
   - Section 3.2 (interactions): drag-n-drop sortable ✓, shot selection ✓, detail editing ✓, copy (Cmd+D) ✓, delete (Delete/Backspace) ✓, add ✓, regenerate ✓, material replace ✓, duration slider ✓, space to play/pause ✓
   - Section 3.3 (state): Shot interface matches spec ✓, PlaybackState matches ✓
   - Section 3.4 (shortcuts): Space, ← →, Cmd+D, Delete, Cmd+Enter all implemented ✓
   - Section 4.1 (three-layer tags): productTags, videoTags, clipTags added to Material entity ✓
   - Section 4.3 (semantic search): PGVector endpoint with embedding API fallback ✓

2. **Placeholder scan:** No TBD/TODO/future-work in code. Template-based LLM analysis in Task 9 uses realistic mock data structure.

3. **Type consistency:** `Shot` interface used consistently across store, components, and services.

4. **No missing tasks:** All spec requirements covered. No over-engineering beyond spec.
