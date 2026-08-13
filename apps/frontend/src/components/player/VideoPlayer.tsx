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
  videoUrl,
  thumbnailUrl,
  playbackState,
  onTogglePlay,
}) => {
  const handleKeyboardToggle = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onTogglePlay();
    }
  };

  if (!videoUrl) {
    return (
      <div
        className="video-player video-player--empty"
        role="button"
        tabIndex={0}
        aria-label="切换视频预览"
        onClick={onTogglePlay}
        onKeyDown={handleKeyboardToggle}
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="preview" className="video-player__thumb" />
        ) : (
          <div className="video-player__placeholder">
            <PlayCircleOutlined
              style={{ fontSize: 48, color: 'var(--text-tertiary)', opacity: 0.5 }}
            />
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
      <div
        className="video-player__overlay"
        role="button"
        tabIndex={0}
        aria-label={playbackState === 'playing' ? '暂停视频' : '播放视频'}
        onClick={onTogglePlay}
        onKeyDown={handleKeyboardToggle}
      >
        {playbackState === 'paused' || playbackState === 'idle' ? (
          <PlayCircleOutlined style={{ fontSize: 56, color: '#fff', opacity: 0.85 }} />
        ) : (
          <PauseCircleOutlined style={{ fontSize: 56, color: '#fff', opacity: 0.85 }} />
        )}
      </div>
    </div>
  );
};
