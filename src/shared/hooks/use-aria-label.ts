import * as React from 'react';

interface UseAriaLabelOptions {
  label?: string;
  labelledBy?: string;
  describedBy?: string;
}

export function useAriaLabel(options: UseAriaLabelOptions = {}) {
  const { label, labelledBy, describedBy } = options;

  return React.useMemo(
    () => ({
      'aria-label': label,
      'aria-labelledby': labelledBy,
      'aria-describedby': describedBy,
    }),
    [label, labelledBy, describedBy],
  );
}
