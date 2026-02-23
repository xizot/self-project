import * as React from 'react';
import { Separator } from './separator';
import { cn } from '../../lib/utils';

interface DividerProps extends React.ComponentProps<typeof Separator> {
  label?: React.ReactNode;
  labelPosition?: 'left' | 'center' | 'right';
}

function Divider({
  className,
  label,
  labelPosition = 'center',
  orientation = 'horizontal',
  ...props
}: DividerProps) {
  if (!label) {
    return <Separator orientation={orientation} className={className} {...props} />;
  }

  return (
    <div
      className={cn(
        'flex items-center',
        orientation === 'horizontal' ? 'w-full' : 'h-full flex-col',
        className,
      )}
      {...props}
    >
      {labelPosition !== 'left' && (
        <Separator
          orientation={orientation}
          className={cn(orientation === 'horizontal' ? 'flex-1' : 'flex-1 w-px')}
        />
      )}
      <div
        className={cn(
          'px-3 text-sm text-muted-foreground',
          orientation === 'vertical' && 'py-3 px-0',
        )}
      >
        {label}
      </div>
      {labelPosition !== 'right' && (
        <Separator
          orientation={orientation}
          className={cn(orientation === 'horizontal' ? 'flex-1' : 'flex-1 w-px')}
        />
      )}
    </div>
  );
}

export { Divider };
