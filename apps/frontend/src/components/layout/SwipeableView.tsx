import { useRef, useCallback, ReactNode } from 'react';

interface SwipeableViewProps {
  pages: { key: string; content: ReactNode }[];
  activeKey: string;
  onChange: (key: string) => void;
  threshold?: number;
}

export function SwipeableView({ pages, activeKey, onChange, threshold = 60 }: SwipeableViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, isDragging: false, currentX: 0 });
  const activeIndex = pages.findIndex((p) => p.key === activeKey);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragRef.current.startX = e.touches[0].clientX;
    dragRef.current.startY = e.touches[0].clientY;
    dragRef.current.isDragging = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const deltaX = e.touches[0].clientX - dragRef.current.startX;
      const deltaY = e.touches[0].clientY - dragRef.current.startY;

      if (!dragRef.current.isDragging) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          dragRef.current.isDragging = true;
        } else {
          return;
        }
      }

      if (dragRef.current.isDragging) {
        dragRef.current.currentX = deltaX;
        if (containerRef.current) {
          const el = containerRef.current;
          const boundedX =
            activeIndex === 0 && deltaX > 0
              ? deltaX * 0.3
              : activeIndex === pages.length - 1 && deltaX < 0
                ? deltaX * 0.3
                : deltaX;
          el.style.transform = `translate3d(${boundedX}px, 0, 0)`;
        }
      }
    },
    [activeIndex, pages.length]
  );

  const handleTouchEnd = useCallback(() => {
    if (!dragRef.current.isDragging) return;

    const deltaX = dragRef.current.currentX;
    if (containerRef.current) {
      containerRef.current.style.transform = '';
    }

    if (Math.abs(deltaX) > threshold) {
      if (deltaX < 0 && activeIndex < pages.length - 1) {
        onChange(pages[activeIndex + 1].key);
      } else if (deltaX > 0 && activeIndex > 0) {
        onChange(pages[activeIndex - 1].key);
      }
    }
    dragRef.current.isDragging = false;
    dragRef.current.currentX = 0;
  }, [threshold, activeIndex, pages, onChange]);

  return (
    <div
      ref={containerRef}
      className="page-slide"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ flex: 1, overflow: 'hidden' }}
    >
      {pages[activeIndex]?.content}
    </div>
  );
}
