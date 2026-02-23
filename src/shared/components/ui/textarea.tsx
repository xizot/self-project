import * as React from 'react';

import { Label } from './label';
import { FORM_SIZES, formSizeVariants, type FormSize } from '../../constants/form-sizes';
import { cn } from '../../lib/utils';

interface TextareaProps extends React.ComponentProps<'textarea'> {
  label?: string | React.ReactNode;
  error?: string;
  required?: boolean;
  size?: FormSize;
}

function Textarea({ className, label, error, required, id, size = 'md', ...props }: TextareaProps) {
  const hasLabelOrError = label || error;

  const textareaElement = (
    <textarea
      id={id}
      data-slot="textarea"
      data-size={size}
      aria-invalid={!!error}
      className={cn(
        'border-input placeholder:text-muted-foreground dark:bg-input/30 flex field-sizing-content w-full rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50',
        formSizeVariants({ size }),
        size && FORM_SIZES[size]?.padding,
        size === 'xxs' && 'min-h-16',
        size === 'xs' && 'min-h-20',
        size === 'sm' && 'min-h-24',
        size === 'md' && 'min-h-28',
        size === 'lg' && 'min-h-32',
        size === 'xl' && 'min-h-36',
        size === 'xxl' && 'min-h-40',
        error
          ? 'focus-visible:border-destructive focus-visible:ring-destructive focus-visible:ring-[3px] border-destructive'
          : 'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );

  if (!hasLabelOrError) {
    return textareaElement;
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {textareaElement}
      {error && (
        <div className={`text-destructive text-sm`} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export { Textarea };
