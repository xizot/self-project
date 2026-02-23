import * as React from 'react';

type NavigationDirection = 'horizontal' | 'vertical' | 'both';

interface UseKeyboardNavigationOptions {
  direction?: NavigationDirection;
  loop?: boolean;
  onNavigate?: (index: number) => void;
}

export function useKeyboardNavigation(
  itemCount: number,
  options: UseKeyboardNavigationOptions = {},
): {
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
} {
  const { direction = 'both', loop = false, onNavigate } = options;
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      let newIndex = currentIndex;

      if (direction === 'horizontal' || direction === 'both') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : loop ? itemCount - 1 : currentIndex;
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          newIndex = currentIndex < itemCount - 1 ? currentIndex + 1 : loop ? 0 : currentIndex;
        }
      }

      if (direction === 'vertical' || direction === 'both') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : loop ? itemCount - 1 : currentIndex;
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          newIndex = currentIndex < itemCount - 1 ? currentIndex + 1 : loop ? 0 : currentIndex;
        }
      }

      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
        onNavigate?.(newIndex);
      }
    },
    [currentIndex, itemCount, direction, loop, onNavigate],
  );

  return { currentIndex, setCurrentIndex, handleKeyDown };
}
