import React, { useEffect, useRef, useState } from 'react';
import { Button, Typography, Space, Slider, Tag } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { useShell } from '../../../components/layout/shell-context';

const { Text } = Typography;

interface VersionConfig {
  label: string;
  model: string;
  resolution: string;
  duration: number;
  shots: number;
  tts: string;
  bgm: string;
  genTime: number;
  videoUrl?: string;
}

interface ComparePlayerProps {
  versionA: VersionConfig;
  versionB: VersionConfig;
}

export const ComparePlayer: React.FC<ComparePlayerProps> = ({ versionA, versionB }) => {
  const { isMobile } = useShell();
  const [syncMode, setSyncMode] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const refA = useRef<HTMLVideoElement | null>(null);
  const refB = useRef<HTMLVideoElement | null>(null);

  // 同步播放控制
  useEffect(() => {
    const a = refA.current;
    const b = refB.current;
    if (playing) {
      a?.play().catch(() => {});
      if (syncMode) b?.play().catch(() => {});
    } else {
      a?.pause();
      b?.pause();
    }
  }, [playing, syncMode]);

  const handleTogglePlay = () => setPlaying((p) => !p);
  const handleProgressChange = (v: number) => {
    setProgress(v);
    const a = refA.current;
    const b = refB.current;
    if (a && a.duration) a.currentTime = (v / 100) * a.duration;
    if (syncMode && b && b.duration) b.currentTime = (v / 100) * b.duration;
  };

  // 监听 A 视频的 timeupdate,同步进度条
  useEffect(() => {
    const a = refA.current;
    if (!a) return;
    const onTime = () => {
      if (a.duration) setProgress(Math.round((a.currentTime / a.duration) * 100));
    };
    a.addEventListener('timeupdate', onTime);
    return () => a.removeEventListener('timeupdate', onTime);
  }, [versionA.videoUrl]);

  const renderPlayer = (
    version: VersionConfig,
    side: 'A' | 'B',
    refVideo: React.RefObject<HTMLVideoElement>
  ) => (
    <div
      style={{
        flex: 1,
        borderRight: side === 'A' ? (isMobile ? 'none' : '1px solid var(--border-color)') : 'none',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Space>
          <Tag color={side === 'A' ? 'blue' : 'green'}>{side}</Tag>
          <Text strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>
            {version.label}
          </Text>
        </Space>
      </div>

      <div
        style={{
          aspectRatio: '9/16',
          maxHeight: 300,
          margin: 12,
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {version.videoUrl ? (
          <video
            ref={refVideo}
            src={version.videoUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted={side === 'B' && syncMode}
            playsInline
          />
        ) : playing ? (
          <PauseCircleOutlined style={{ fontSize: 48, color: '#fff', opacity: 0.8 }} />
        ) : (
          <PlayCircleOutlined style={{ fontSize: 48, color: '#fff', opacity: 0.8 }} />
        )}
      </div>

      <div style={{ padding: '0 12px 8px' }}>
        <Slider
          value={progress}
          onChange={handleProgressChange}
          min={0}
          max={100}
          trackStyle={{ background: 'var(--brand-primary)' }}
        />
      </div>

      <div style={{ padding: '0 12px 12px', display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{version.model}</Text>
        <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{version.resolution}</Text>
        <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{version.duration}s</Text>
        <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{version.shots} 分镜</Text>
        <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>TTS: {version.tts}</Text>
        <Text style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          生成: {version.genTime}s
        </Text>
      </div>
    </div>
  );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {renderPlayer(versionA, 'A', refA)}
        {renderPlayer(versionB, 'B', refB)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', gap: 12 }}>
        <Button
          size="small"
          type={playing ? 'primary' : 'default'}
          icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={handleTogglePlay}
        >
          {playing ? '暂停' : '播放'}
        </Button>
        <Button
          size="small"
          type={syncMode ? 'primary' : 'default'}
          onClick={() => setSyncMode(!syncMode)}
        >
          {syncMode ? '同步模式' : '独立模式'}
        </Button>
      </div>
    </div>
  );
};
