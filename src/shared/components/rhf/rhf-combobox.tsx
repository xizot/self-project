'use client';

import { Combobox, type ComboboxOption } from '../ui/combobox';
import { cn, get } from '../../lib/utils';
import type { ComponentProps } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller, useFormState } from 'react-hook-form';

// Re-export for backward compatibility
export type { ComboboxBaseOption } from '../ui/combobox';

export type RHFComboboxProps<T extends FieldValues = FieldValues> = Omit<
  ComponentProps<typeof Combobox>,
  'value' | 'onChange' | 'label' | 'error' | 'required'
> & {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  required?: boolean;
  callback?: (newValue: string, newOption: ComboboxOption | undefined) => void;
};

export function RHFCombobox<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  required,
  callback = () => {},
  className,
  ...comboboxProps
}: RHFComboboxProps<T>) {
  const formState = useFormState({ control, name });
  const displayError = get<string>(formState.errors, `${name}.message`);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        return (
          <Combobox
            {...comboboxProps}
            value={field.value}
            onChange={(value, option) => {
              field.onChange(value);
              callback(value, option);
            }}
            label={label}
            error={displayError}
            required={required}
            className={cn('w-full', className)}
          />
        );
      }}
    />
  );
}
