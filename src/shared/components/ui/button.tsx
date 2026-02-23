'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { FORM_SIZES } from '../../constants/form-sizes';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        xxs: `${FORM_SIZES.xxs.height} min-w-6 rounded-md gap-1 ${FORM_SIZES.xxs.padding} ${FORM_SIZES.xxs.text}`,
        xs: `${FORM_SIZES.xs.height} min-w-8 rounded-md gap-1 ${FORM_SIZES.xs.padding} ${FORM_SIZES.xs.text}`,
        sm: `${FORM_SIZES.sm.height} min-w-9 rounded-md gap-1.5 ${FORM_SIZES.sm.padding}  ${FORM_SIZES.sm.text}`,
        md: `${FORM_SIZES.md.height} min-w-10 ${FORM_SIZES.md.padding} ${FORM_SIZES.md.text}`,
        lg: `${FORM_SIZES.lg.height} min-w-11 rounded-md ${FORM_SIZES.lg.padding} ${FORM_SIZES.lg.text}`,
        xl: `${FORM_SIZES.xl.height} min-w-12 rounded-md ${FORM_SIZES.xl.padding} ${FORM_SIZES.xl.text}`,
        xxl: `${FORM_SIZES.xxl.height} min-w-14 rounded-md ${FORM_SIZES.xxl.padding} ${FORM_SIZES.xxl.text}`,
        '2xl': `${FORM_SIZES.xxl.height} min-w-14 rounded-md ${FORM_SIZES.xxl.padding} ${FORM_SIZES.xxl.text}`,
        icon: FORM_SIZES.md.iconButton,
        'icon-xxs': FORM_SIZES.xxs.iconButton,
        'icon-xs': FORM_SIZES.xs.iconButton,
        'icon-sm': FORM_SIZES.sm.iconButton,
        'icon-md': FORM_SIZES.md.iconButton,
        'icon-lg': FORM_SIZES.lg.iconButton,
        'icon-xl': FORM_SIZES.xl.iconButton,
        'icon-xxl': FORM_SIZES.xxl.iconButton,
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'md',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

