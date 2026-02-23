'use client';

import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { cn } from '../../lib/utils';
import type { ComponentProps } from 'react';
import { useController, useFormState } from 'react-hook-form';
import type { Control, FieldValues, Path, UseFormRegister } from 'react-hook-form';
import { get } from '../../lib/utils';

export type RHFTextAreaProps<T extends FieldValues = FieldValues> = Omit<
  ComponentProps<typeof Textarea>,
  'label' | 'error' | 'required'
> & {
  control: Control<T>;
  name: Path<T>;
  register: UseFormRegister<T>;
  label?: string;
  wrapperClassName?: ComponentProps<'div'>['className'];
  required?: boolean;
  showMaxLength?: boolean;
};

export function RHFTextArea<T extends FieldValues = FieldValues>({
  control,
  register,
  name,
  label,
  placeholder,
  className,
  wrapperClassName,
  required = false,
  showMaxLength = true,
  maxLength = 512,
  rows = 5,
  ...rest
}: RHFTextAreaProps<T>) {
  const formState = useFormState({ control, name });
  const error = get<string>(formState.errors, `${name}.message`);

  return (
    <div className={cn('relative w-full', wrapperClassName)}>
      <Textarea
        {...rest}
        {...register(name)}
        label={label}
        error={error}
        required={required}
        className={className}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
      />
      {showMaxLength && <TextAreaBadge control={control} name={name} maxLength={maxLength} />}
    </div>
  );
}

const TextAreaBadge = <T extends FieldValues = FieldValues>({
  control,
  name,
  maxLength,
}: {
  control: Control<T>;
  name: Path<T>;
  maxLength: number;
}) => {
  const { field } = useController({ control, name });

  return (
    <Badge variant="secondary" className="absolute rounded-sm right-3 bottom-2 text-[8px]">
      {field.value?.length || 0}/{maxLength}
    </Badge>
  );
};
