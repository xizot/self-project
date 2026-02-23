import * as React from 'react';

import { Label } from './label';
import { FORM_SIZES, formSizeVariants, type FormSize } from '../../constants/form-sizes';
import { cn } from '../../lib/utils';

interface InputProps extends Omit<React.ComponentProps<'input'>, 'type' | 'size'> {
  label?: string | React.ReactNode;
  error?: string;
  required?: boolean;
  type?: React.ComponentProps<'input'>['type'];
  size?: FormSize;
}

function Input({ className, type, label, error, required, id, size = 'md', ...props }: InputProps) {
  const hasLabelOrError = label || error;

  const inputElement = (
    <input
      type={type}
      id={id}
      data-slot="input"
      data-size={size}
      aria-invalid={!!error}
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:border-0 file:bg-transparent file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        formSizeVariants({ size }),
        size && FORM_SIZES[size]?.padding,
        size === 'xxs' && 'file:h-5 file:text-xs',
        size === 'xs' && 'file:h-6 file:text-xs',
        size === 'sm' && 'file:h-7 file:text-xs',
        size === 'md' && 'file:h-8 file:text-sm',
        size === 'lg' && 'file:h-9 file:text-sm',
        size === 'xl' && 'file:h-10 file:text-sm',
        size === 'xxl' && 'file:h-11 file:text-base',
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
    return inputElement;
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {inputElement}
      {error && (
        <div className={`text-destructive text-sm`} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export { Input };
