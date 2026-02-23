import type { DependencyList } from 'react';
import * as React from 'react';

export function useMemoizedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: DependencyList,
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(callback, deps) as T;
}
