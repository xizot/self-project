'use client';

import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { cn, get } from '../../lib/utils';
import type { ComponentProps } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller, useFormState } from 'react-hook-form';

export type RHFCheckboxGroupOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type RHFCheckboxGroupProps<T extends FieldValues = FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  options: RHFCheckboxGroupOption[];
  label?: string;
  error?: string;
  required?: boolean;
  wrapperClassName?: ComponentProps<'div'>['className'];
  orientation?: 'horizontal' | 'vertical';
};

export function RHFCheckboxGroup<T extends FieldValues = FieldValues>({
  control,
  name,
  options,
  label,
  error,
  required = false,
  wrapperClassName,
  orientation = 'vertical',
}: RHFCheckboxGroupProps<T>) {
  const formState = useFormState({ control, name });
  const fieldError = error || get<string>(formState.errors, `${name}.message`);

  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && (
        <Label htmlFor={name} className="mb-2 block">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className={cn('flex gap-4', orientation === 'horizontal' ? 'flex-row' : 'flex-col')}>
            {options.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={`${name}-${option.value}`}
                  checked={Array.isArray(field.value) && field.value.includes(option.value)}
                  onCheckedChange={(checked) => {
                    const currentValue = Array.isArray(field.value) ? field.value : [];
                    if (checked) {
                      field.onChange([...currentValue, option.value]);
                    } else {
                      field.onChange(currentValue.filter((v: string) => v !== option.value));
                    }
                  }}
                  disabled={option.disabled}
                />
                <Label htmlFor={`${name}-${option.value}`} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        )}
      />
      {fieldError && <p className="text-sm text-destructive mt-1">{fieldError}</p>}
    </div>
  );
}
