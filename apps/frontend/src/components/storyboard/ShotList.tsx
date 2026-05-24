import React from 'react';
import {
  DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button, Typography, Space } from 'antd';
import { PlusOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { useStoryboardStore } from '../../store/useStoryboardStore';
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
