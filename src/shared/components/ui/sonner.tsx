'use client';

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position="top-right"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-5 text-green-700 dark:text-green-400" />,
        info: <InfoIcon className="size-5 text-blue-700 dark:text-blue-400" />,
        warning: <TriangleAlertIcon className="size-5 text-amber-700 dark:text-amber-400" />,
        error: <OctagonXIcon className="size-5 text-red-700 dark:text-red-400" />,
        loading: <Loader2Icon className="size-5 animate-spin text-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast: '!bg-background !text-foreground !border-border !shadow-lg',
          success:
            '!bg-green-50 !text-green-950 !border-green-700 !border-2 dark:!bg-green-950 dark:!text-green-50 dark:!border-green-600',
          error:
            '!bg-red-50 !text-red-950 !border-red-700 !border-2 dark:!bg-red-950 dark:!text-red-50 dark:!border-red-600',
          warning:
            '!bg-amber-50 !text-amber-950 !border-amber-700 !border-2 dark:!bg-amber-950 dark:!text-amber-50 dark:!border-amber-600',
          info: '!bg-blue-50 !text-blue-950 !border-blue-700 !border-2 dark:!bg-blue-950 dark:!text-blue-50 dark:!border-blue-600',
          description: '!text-inherit !opacity-90',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
