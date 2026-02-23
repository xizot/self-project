'use client';

import { Editor, type EditorProps } from '../ui/editor';
import { cn } from '../../lib/utils';
import type { ComponentProps } from 'react';
import { Controller, useFormState } from 'react-hook-form';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { get } from '../../lib/utils';

export type RHFEditorProps<T extends FieldValues = FieldValues> = Omit<
  EditorProps,
  'value' | 'onChange' | 'label' | 'error' | 'required'
> & {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  wrapperClassName?: ComponentProps<'div'>['className'];
  required?: boolean;
  callback?: (value: string) => void;
};

export function RHFEditor<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  className,
  wrapperClassName,
  required = false,
  callback = () => {},
  ...editorProps
}: RHFEditorProps<T>) {
  const formState = useFormState({ control, name });
  const error = get<string>(formState.errors, `${name}.message`);

  return (
    <div className={cn('w-full', wrapperClassName)}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Editor
            {...editorProps}
            value={field.value || ''}
            onChange={(value) => {
              field.onChange(value);
              callback(value);
            }}
            label={label}
            error={error}
            required={required}
            className={className}
          />
        )}
      />
    </div>
  );
}

