'use client';

import { cn } from '../../lib/utils';
import * as React from 'react';
import { Button } from './button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from './empty';

interface EmptyStateProps extends React.ComponentProps<typeof Empty> {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function EmptyState({
  className,
  icon,
  title = 'No data',
  description,
  action,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <Empty className={cn(className)} {...props}>
      <EmptyHeader>
        {icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </Empty>
  );
}

export { EmptyState };
