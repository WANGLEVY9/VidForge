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
