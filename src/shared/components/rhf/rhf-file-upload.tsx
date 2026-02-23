'use client';

import { FileUpload, type FileUploadProps } from '../ui/file-upload';
import { Label } from '../ui/label';
import { cn, get } from '../../lib/utils';
import type { ComponentProps } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller, useFormState } from 'react-hook-form';

export type RHFFileUploadProps<T extends FieldValues = FieldValues> = Omit<
  FileUploadProps,
  'value' | 'onChange' | 'onError'
> & {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  error?: string;
  required?: boolean;
  wrapperClassName?: ComponentProps<'div'>['className'];
};

export function RHFFileUpload<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  error,
  required = false,
  wrapperClassName,
  ...fileUploadProps
}: RHFFileUploadProps<T>) {
  const formState = useFormState({ control, name });
  const fieldError = error || get<string>(formState.errors, `${name}.message`);

  return (
    <div className={cn('w-full', wrapperClassName)} data-slot="rhf-file-upload">
      {label && (
        <Label htmlFor={name} className="mb-2 block">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value, ...field } }) => {
          const files = value ? (Array.isArray(value) ? value : [value]).filter(Boolean) : [];

          return (
            <FileUpload
              {...fileUploadProps}
              {...field}
              value={files}
              onChange={(newFiles) => {
                if (fileUploadProps.multiple) {
                  onChange(newFiles);
                } else {
                  onChange(newFiles.length > 0 ? newFiles[0] : undefined);
                }
              }}
              onError={(errorMessage) => {
                // You can handle error here if needed
                console.error('File upload error:', errorMessage);
              }}
              disabled={fileUploadProps.disabled}
            />
          );
        }}
      />
      {fieldError && (
        <p className="text-sm text-destructive mt-1" data-slot="rhf-file-upload-error">
          {fieldError}
        </p>
      )}
    </div>
  );
}


