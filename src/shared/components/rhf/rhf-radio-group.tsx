'use client';

import { Label } from '../ui/label';
import { RadioGroup } from '../ui/radio-group';
import { cn } from '../../lib/utils';
import type { ComponentProps } from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldPathValue, FieldValues, Path } from 'react-hook-form';

export type RHFRadioGroupProps<T extends FieldValues = FieldValues> = Omit<
  ComponentProps<typeof RadioGroup>,
  'onValueChange' | 'value'
> & {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  required?: boolean;
  children: React.ReactNode;

  onBeforeChange?: (
    newValue: string,
    currentValue: FieldPathValue<T, Path<T>>,
    onNextAction: () => void,
  ) => void;

  callback?: (newValue: string) => void;
};

export function RHFRadioGroup<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  required,
  children,
  className,
  callback = () => {},
  onBeforeChange,
  ...radioGroupProps
}: RHFRadioGroupProps<T>) {
  const handleChange = (newValue: string, field: FieldValues) => {
    const performChange = () => {
      field.onChange(newValue);
      callback(newValue);
    };

    if (onBeforeChange) {
      onBeforeChange(newValue, field.value, performChange);
    } else {
      performChange();
    }
  };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => {
        return (
          <div className="space-y-1.5 w-full">
            {label && (
              <Label
                htmlFor={radioGroupProps.id || name}
                className="text-foreground leading-5 cursor-pointer select-none flex-1"
              >
                {label}
                {required && <span className="font-semibold text-destructive ml-1">*</span>}
              </Label>
            )}
            <RadioGroup
              {...radioGroupProps}
              id={radioGroupProps.id || name}
              className={cn('flex flex-row gap-4', className)}
              onValueChange={(val) => {
                handleChange(val, field);
              }}
              value={field.value?.toString()}
            >
              {children}
            </RadioGroup>
            {error && <p className="text-xs text-destructive">{error.message}</p>}
          </div>
        );
      }}
    />
  );
}
