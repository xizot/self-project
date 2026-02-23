'use client';

import {
    DateRangePicker,
    type DateRangePickerProps,
} from '../ui/date-range-picker';
import { cn } from '../../lib/utils';
import type { ComponentProps } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';

export type RHFDateRangePickerProps<T extends FieldValues = FieldValues> = Omit<
  DateRangePickerProps,
  'value' | 'onChange' | 'label' | 'error' | 'required'
> & {
  control: Control<T>;
  name: Path<T>;
  label?: string | React.ReactNode;
  required?: boolean;
  error?: string;
  className?: ComponentProps<'div'>['className'];
  callback?: (value: { from?: Date; to?: Date } | undefined) => void;
};

export function RHFDateRangePicker<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  required,
  error,
  className,
  callback = () => {},
  ...dateRangePickerProps
}: RHFDateRangePickerProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error: fieldError } }) => {
        const displayError = error || fieldError?.message;

        return (
          <DateRangePicker
            {...dateRangePickerProps}
            value={field.value}
            onChange={(range) => {
              field.onChange(range);
              callback(range);
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
