'use client';

import { cn, get, hasValue } from '../../lib/utils';
import { useFormState } from 'react-hook-form';
import type { Control, FieldValues, Path } from 'react-hook-form';

export type RHFErrorMessageProps<T extends FieldValues> = {
  name: Path<T>;
  control: Control<T>;
  showErrorWithTooltip?: boolean;
};

export function RHFErrorMessage<T extends FieldValues = FieldValues>({
  name,
  control,
}: RHFErrorMessageProps<T>) {
  const formState = useFormState({
    control,
    name,
  });
  const error = get<string>(formState.errors, `${name}.message`);

  return (
    <p
      className={cn(
        'text-xs text-destructive hidden',
        hasValue(error) && 'input-error block mt-1.5',
      )}
    >
      {error}
    </p>
  );
};

