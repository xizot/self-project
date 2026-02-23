import * as React from 'react';
import { Skeleton } from './skeleton';
import { cn } from '../../lib/utils';

interface LoadingStateProps extends React.ComponentProps<'div'> {
  count?: number;
  variant?: 'default' | 'card' | 'list' | 'table';
}

function LoadingState({ className, count = 3, variant = 'default', ...props }: LoadingStateProps) {
  if (variant === 'card') {
    return (
      <div className={cn('space-y-4', className)} {...props}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-2 p-4 border rounded-lg">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('space-y-2', className)} {...props}>
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

export { LoadingState };
