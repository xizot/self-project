'use client';

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { CircleIcon } from 'lucide-react';
import * as React from 'react';

import { FORM_SIZES, type FormSize } from '../../constants/form-sizes';
import { cn } from '../../lib/utils';

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn('grid gap-3', className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  size = 'md',
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
  size?: FormSize;
}) {
  const sizeConfig = FORM_SIZES[size ?? 'md'];
  const indicatorSize = {
    xxs: 'size-1',
    xs: 'size-1.5',
    sm: 'size-1.5',
    md: 'size-2',
    lg: 'size-2.5',
    xl: 'size-2.5',
    xxl: 'size-3',
  }[size ?? 'md'];

  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      data-size={size}
      className={cn(
        'border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        sizeConfig.icon,
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon
          className={cn(
            'fill-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            indicatorSize,
          )}
        />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
