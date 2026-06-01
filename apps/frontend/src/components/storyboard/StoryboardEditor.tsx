import React, { useMemo } from 'react';
import { message } from 'antd';
import { useStoryboardStore } from '../../store/useStoryboardStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { ShotList } from './ShotList';
import { PreviewPanel } from './PreviewPanel';
import { ShotDetailPanel } from './ShotDetailPanel';
import { TimelineBar } from './TimelineBar';

export interface StoryboardEditorProps {
  onRegenerateShot?: (id: string) => void;
  /**
   * 只读模式:用于「视频生成完成后浏览各分镜结果」的场景。
   * - ShotList 不可拖拽/删除/添加
   * - ShotDetailPanel 隐藏所有编辑 input,改为下载/打开按钮
   * - 时间轴/快捷键(Cmd+D 复制等)在 readonly 下禁用
   */
  readonly?: boolean;
}

export const StoryboardEditor: React.FC<StoryboardEditorProps> = ({ onRegenerateShot, readonly = false }) => {
  const shots = useStoryboardStore((s) => s.shots);
  const activeShotId = useStoryboardStore((s) => s.activeShotId);
  const playbackState = useStoryboardStore((s) => s.playbackState);
  const setPlaybackState = useStoryboardStore((s) => s.setPlaybackState);
  const setActiveShot = useStoryboardStore((s) => s.setActiveShot);
  const duplicateShot = useStoryboardStore((s) => s.duplicateShot);
  const removeShot = useStoryboardStore((s) => s.removeShot);

  const activeIndex = shots.findIndex((s) => s.id === activeShotId);

  const shortcuts = useMemo(() => {
    const playPause = {
      Space: () => setPlaybackState(playbackState === 'playing' ? 'paused' : 'playing'),
      ArrowLeft: () => {
        if (activeIndex > 0) setActiveShot(shots[activeIndex - 1].id);
      },
      ArrowRight: () => {
        if (activeIndex < shots.length - 1) setActiveShot(shots[activeIndex + 1].id);
      },
    };
    if (readonly) return playPause;
    return {
      ...playPause,
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
    };
  }, [activeShotId, activeIndex, shots.length, playbackState, setPlaybackState, setActiveShot, duplicateShot, removeShot, onRegenerateShot, readonly]);

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="storyboard-editor">
      <div className="storyboard-editor__main">
        <div className="storyboard-editor__left">
          <ShotList onRegenerateShot={onRegenerateShot} readonly={readonly} />
        </div>
        <div className="storyboard-editor__center">
          <PreviewPanel />
        </div>
        <div className="storyboard-editor__right">
          <ShotDetailPanel onRegenerate={onRegenerateShot} readonly={readonly} />
        </div>
      </div>
      <div className="storyboard-editor__bottom">
        <TimelineBar />
      </div>
    </div>
  );
};
