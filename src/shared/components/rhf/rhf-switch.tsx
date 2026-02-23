'use client';

import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { cn } from '../../lib/utils';
import type { ComponentProps } from 'react';
import { Controller } from 'react-hook-form';
import type { Control, FieldPathValue, FieldValues, Path } from 'react-hook-form';

export type RHFSwitchProps<T extends FieldValues = FieldValues> = Omit<
  ComponentProps<typeof Switch>,
  'checked' | 'onCheckedChange'
> & {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  required?: boolean;

  onBeforeChange?: (
    newValue: boolean,
    currentValue: FieldPathValue<T, Path<T>>,
    onNextAction: () => void,
  ) => void;

  callback?: (newValue: boolean) => void;
};

export function RHFSwitch<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  required,
  callback = () => {},
  onBeforeChange,
  className,
  ...switchProps
}: RHFSwitchProps<T>) {
  const handleChange = (newValue: boolean, field: FieldValues) => {
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
            <div className={cn('flex items-center gap-3', className)}>
              {label && (
                <Label
                  htmlFor={switchProps.id || name}
                  className="text-foreground leading-5 cursor-pointer select-none flex-1"
                >
                  {label}
                  {required && <span className="font-semibold text-destructive ml-1">*</span>}
                </Label>
              )}
              <Switch
                {...switchProps}
                id={switchProps.id || name}
                checked={!!field.value}
                onCheckedChange={(val) => {
                  handleChange(val, field);
                }}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error.message}</p>}
          </div>
        );
      }}
    />
  );
}
