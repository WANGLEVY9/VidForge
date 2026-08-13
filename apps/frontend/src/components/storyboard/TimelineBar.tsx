import React from 'react';
import { Typography } from 'antd';
import { useStoryboardStore } from '../../store/useStoryboardStore';

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
          <div key={i} className="timeline-bar__tick" style={{ left: i * 5 * pixelsPerSecond }}>
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
              role="button"
              tabIndex={0}
              aria-label={`选择第 ${shot.order} 个分镜`}
              aria-pressed={shot.id === activeShotId}
              onClick={() => setActiveShot(shot.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setActiveShot(shot.id);
                }
              }}
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
