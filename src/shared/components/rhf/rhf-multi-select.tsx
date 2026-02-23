'use client';

import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn, get } from '../../lib/utils';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller, useFormState } from 'react-hook-form';

export type RHFMultiSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type RHFMultiSelectProps<T extends FieldValues = FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  options: RHFMultiSelectOption[];
  label?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  wrapperClassName?: ComponentProps<'div'>['className'];
};

export function RHFMultiSelect<T extends FieldValues = FieldValues>({
  control,
  name,
  options,
  label,
  error,
  required = false,
  placeholder = 'Select options...',
  wrapperClassName,
}: RHFMultiSelectProps<T>) {
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
        render={({ field }) => {
          const selectedValues: string[] = Array.isArray(field.value) ? field.value : [];

          return (
            <div className="space-y-2">
              <Select
                value=""
                onValueChange={(value) => {
                  if (!selectedValues.includes(value)) {
                    field.onChange([...selectedValues, value]);
                  }
                }}
              >
                <SelectTrigger className={cn(fieldError && 'border-destructive')}>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled || selectedValues.includes(option.value)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedValues.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedValues.map((value: string) => {
                    const option = options.find((opt) => opt.value === value);
                    return (
                      <Badge key={value} variant="secondary" className="gap-1">
                        {option?.label || value}
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange(selectedValues.filter((v: string) => v !== value));
                          }}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }}
      />
      {fieldError && <p className="text-sm text-destructive mt-1">{fieldError}</p>}
    </div>
  );
}
