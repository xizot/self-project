'use client';

import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';
import { useFormState, Controller } from 'react-hook-form';
import type { ComponentProps } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { get } from '../../lib/utils';
import { Upload } from 'lucide-react';

export type RHFUploadProps<T extends FieldValues = FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  error?: string;
  required?: boolean;
  accept?: string;
  multiple?: boolean;
  wrapperClassName?: ComponentProps<'div'>['className'];
  className?: ComponentProps<'input'>['className'];
};

export function RHFUpload<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  error,
  required = false,
  accept,
  multiple = false,
  wrapperClassName,
  className,
}: RHFUploadProps<T>) {
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
        render={({ field: { onChange, value, ...field } }) => (
          <div className="space-y-2">
            <Label
              htmlFor={name}
              className={cn(
                'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors',
                fieldError && 'border-destructive',
                className,
              )}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  {accept || 'Any file'}
                  {multiple && ' (multiple files allowed)'}
                </p>
              </div>
              <Input
                {...field}
                id={name}
                type="file"
                accept={accept}
                multiple={multiple}
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    onChange(multiple ? Array.from(files) : files[0]);
                  }
                }}
              />
            </Label>
            {value && (
              <p className="text-sm text-muted-foreground">
                {multiple
                  ? `${Array.isArray(value) ? value.length : 0} file(s) selected`
                  : typeof value === 'string'
                    ? value
                    : value?.name || 'File selected'}
              </p>
            )}
          </div>
        )}
      />
      {fieldError && <p className="text-sm text-destructive mt-1">{fieldError}</p>}
    </div>
  );
}
