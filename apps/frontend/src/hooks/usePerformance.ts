import { useEffect, useRef } from 'react';

export function usePageTiming(pageName: string) {
  const startRef = useRef(performance.now());

  useEffect(() => {
    startRef.current = performance.now();
    return () => {
      const duration = performance.now() - startRef.current;
      if (duration > 100) {
        // Only log if > 100ms
        console.log(`[Perf] ${pageName}: ${Math.round(duration)}ms`);
      }
    };
  }, [pageName]);
}

export function useRenderCount(componentName: string) {
  const count = useRef(0);
  count.current++;
  useEffect(() => {
    if (count.current > 2) {
      console.debug(`[Render] ${componentName} rendered ${count.current} times`);
    }
  });
}
