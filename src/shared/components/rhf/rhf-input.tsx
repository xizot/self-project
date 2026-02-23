'use client';

import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { useFormState } from 'react-hook-form';
import type { ComponentProps } from 'react';
import type { Control, FieldValues, Path, UseFormRegister } from 'react-hook-form';
import { get } from '../../lib/utils';

export type RHFInputProps<T extends FieldValues = FieldValues> = Omit<
  ComponentProps<typeof Input>,
  'label' | 'error' | 'required'
> & {
  control: Control<T>;
  name: Path<T>;
  register: UseFormRegister<T>;
  label?: string;
  wrapperClassName?: ComponentProps<'div'>['className'];
  required?: boolean;
};

export function RHFInput<T extends FieldValues = FieldValues>({
  control,
  register,
  name,
  label,
  placeholder,
  className,
  wrapperClassName,
  required = false,
  ...rest
}: RHFInputProps<T>) {
  const formState = useFormState({ control, name });
  const error = get<string>(formState.errors, `${name}.message`);

  return (
    <div className={cn('w-full', wrapperClassName)}>
      <Input
        {...rest}
        {...register(name)}
        label={label}
        error={error}
        required={required}
        className={className}
        placeholder={placeholder}
      />
    </div>
  );
}
