import { useMediaQuery } from './use-media-query';
import { BREAKPOINTS } from '../constants/breakpoints';

export function useIsTablet(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`);
}
