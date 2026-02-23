'use client';

import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import type { ComponentProps } from 'react';
import { Controller, useFormState } from 'react-hook-form';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { get } from '../../lib/utils';

export type FormatType = 'text' | 'integer' | 'decimal' | 'currency';

export type RHFFormattedInputProps<T extends FieldValues = FieldValues> = Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type' | 'label' | 'error' | 'required'
> & {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  format?: FormatType;
  required?: boolean;
  wrapperClassName?: ComponentProps<'div'>['className'];
  callback?: (value: string) => void;
};

const formatValue = (value: string, format: FormatType): string => {
  if (format === 'text' || !value) return value;

  if (format === 'integer' || format === 'currency') {
    return value.replace(/\D/g, '');
  }

  if (format === 'decimal') {
    return value.replace(/[^\d.,]/g, '').replace(/\./g, ',');
  }

  return value;
};

export function RHFFormattedInput<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  format = 'text',
  required,
  wrapperClassName,
  callback = () => {},
  ...inputProps
}: RHFFormattedInputProps<T>) {
  const formState = useFormState({ control, name });
  const error = get<string>(formState.errors, `${name}.message`);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        return (
          <div className={cn('w-full', wrapperClassName)}>
            <Input
              {...inputProps}
              {...field}
              type="text"
              label={label}
              error={error}
              required={required}
              value={field.value || ''}
              onChange={(e) => {
                const formatted = formatValue(e.target.value, format);
                field.onChange(formatted);
                callback(formatted);
              }}
            />
          </div>
        );
      }}
    />
  );
}
