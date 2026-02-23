import * as React from 'react';
import { Badge } from './badge';
import { cn } from '../../lib/utils';

type StatusType = 'success' | 'error' | 'warning' | 'info' | 'pending' | 'default';

interface StatusBadgeProps extends React.ComponentProps<typeof Badge> {
  status: StatusType;
  label?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  success: {
    label: 'Success',
    className:
      'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400 dark:bg-green-500/20',
  },
  error: {
    label: 'Error',
    className: 'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400 dark:bg-red-500/20',
  },
  warning: {
    label: 'Warning',
    className:
      'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 dark:bg-amber-500/20',
  },
  info: {
    label: 'Info',
    className:
      'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400 dark:bg-blue-500/20',
  },
  pending: {
    label: 'Pending',
    className:
      'bg-gray-500/10 text-gray-700 border-gray-500/20 dark:text-gray-400 dark:bg-gray-500/20',
  },
  default: {
    label: 'Default',
    className: '',
  },
};

function StatusBadge({ className, status, label, ...props }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={cn(config.className, className)} {...props}>
      {label || config.label}
    </Badge>
  );
}

export { StatusBadge, type StatusType };
