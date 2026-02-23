import * as React from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const [previous, setPrevious] = React.useState<T | undefined>(undefined);
  const currentRef = React.useRef<T>(value);

  React.useEffect(() => {
    if (currentRef.current !== value) {
      setPrevious(currentRef.current);
      currentRef.current = value;
    }
  }, [value]);

  return previous;
}
