import * as React from 'react';

export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRan = React.useRef<number | undefined>(undefined);
  
  React.useEffect(() => {
    if (lastRan.current === undefined) {
      lastRan.current = Date.now();
    }
  }, []);

  React.useEffect(() => {
    if (lastRan.current === undefined) {
      return;
    }
    
    const handler = setTimeout(
      () => {
        const now = Date.now();
        if (lastRan.current !== undefined && now - lastRan.current >= delay) {
          setThrottledValue(value);
          lastRan.current = now;
        }
      },
      lastRan.current !== undefined ? delay - (Date.now() - lastRan.current) : delay,
    );

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}
