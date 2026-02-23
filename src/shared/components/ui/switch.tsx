'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

import { FORM_SIZES, type FormSize } from '../../constants/form-sizes';
import { cn } from '../../lib/utils';

function Switch({
  className,
  size = 'md',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: FormSize;
}) {
  const sizeConfig = FORM_SIZES[size ?? 'md'];
  
  // Map icon size to switch dimensions
  // Switch height should be slightly larger than icon, width should be ~2x height
  const switchSizes = {
    xxs: { height: 'h-3.5', width: 'w-6', thumb: sizeConfig.icon },
    xs: { height: 'h-4', width: 'w-7', thumb: sizeConfig.icon },
    sm: { height: 'h-4.5', width: 'w-8', thumb: sizeConfig.icon },
    md: { height: 'h-5', width: 'w-9', thumb: sizeConfig.icon },
    lg: { height: 'h-6', width: 'w-11', thumb: sizeConfig.icon },
    xl: { height: 'h-6', width: 'w-12', thumb: sizeConfig.icon },
    xxl: { height: 'h-7', width: 'w-14', thumb: sizeConfig.icon },
  }[size ?? 'md'];

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        switchSizes.height,
        switchSizes.width,
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0',
          switchSizes.thumb,
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
