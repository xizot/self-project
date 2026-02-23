'use client';

import { DatePicker, type DatePickerProps } from '../ui/date-picker';
import { cn } from '../../lib/utils';
import type { ComponentProps } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';

export type RHFDatePickerProps<T extends FieldValues = FieldValues> = Omit<
  DatePickerProps,
  'value' | 'onChange' | 'label' | 'error' | 'required'
> & {
  control: Control<T>;
  name: Path<T>;
  label?: string | React.ReactNode;
  required?: boolean;
  error?: string;
  className?: ComponentProps<'div'>['className'];
  callback?: (value: Date | undefined) => void;
};

export function RHFDatePicker<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  required,
  error,
  className,
  callback = () => {},
  ...datePickerProps
}: RHFDatePickerProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error: fieldError } }) => {
        const displayError = error || fieldError?.message;

        return (
          <DatePicker
            {...datePickerProps}
            value={field.value}
            onChange={(date) => {
              field.onChange(date);
              callback(date);
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
