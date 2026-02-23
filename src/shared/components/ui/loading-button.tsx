'use client';

import { Button } from './button';
import { Spinner } from './spinner';
import { cn } from '../../lib/utils';
import type { ComponentProps } from 'react';

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  loading?: boolean;
  loadingText?: string;
}

function LoadingButton({
  className,
  loading = false,
  loadingText,
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button className={cn(className)} disabled={disabled || loading} {...props}>
      {loading && <Spinner className="mr-2 h-4 w-4" />}
      {loading ? loadingText || children : children}
    </Button>
  );
}

export { LoadingButton };
