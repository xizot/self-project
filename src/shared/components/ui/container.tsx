import * as React from 'react';
import { cn } from '../../lib/utils';

interface ContainerProps extends React.ComponentProps<'div'> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

function Container({ className, maxWidth = 'xl', ...props }: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        {
          'max-w-screen-sm': maxWidth === 'sm',
          'max-w-screen-md': maxWidth === 'md',
          'max-w-screen-lg': maxWidth === 'lg',
          'max-w-screen-xl': maxWidth === 'xl',
          'max-w-screen-2xl': maxWidth === '2xl',
          'max-w-full': maxWidth === 'full',
        },
        className,
      )}
      {...props}
    />
  );
}

export { Container };
