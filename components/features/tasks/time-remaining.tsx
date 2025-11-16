'use client';

import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { calculateTimeRemaining, formatTimeRemaining } from '@/lib/utils/time';
import { useEffect, useState } from 'react';

interface TimeRemainingProps {
  dueDate: string | null;
  className?: string;
}

export default function TimeRemaining({ dueDate, className }: TimeRemainingProps) {
  const [timeRemaining, setTimeRemaining] = useState(
    calculateTimeRemaining(dueDate)
  );

  useEffect(() => {
    if (!dueDate) return;

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining(dueDate));

    // Update every minute
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(dueDate));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [dueDate]);

  if (!timeRemaining || !dueDate) return null;

  const { isOverdue, isUrgent } = timeRemaining;
  const formatted = formatTimeRemaining(timeRemaining);

  // Determine styling based on status
  let bgColor = '';
  let textColor = '';
  let showIcon = false;

  if (isOverdue) {
    bgColor = 'bg-red-500';
    textColor = 'text-white';
    showIcon = true;
  } else if (isUrgent) {
    bgColor = 'bg-orange-500';
    textColor = 'text-white';
    showIcon = true;
  } else {
    bgColor = 'bg-muted';
    textColor = 'text-muted-foreground';
    showIcon = false;
  }

  return (
    <Badge
      variant="outline"
      className={`${bgColor} ${textColor} text-xs flex items-center gap-1 border-0 ${className || ''}`}
    >
      {showIcon && <AlertCircle className="h-3 w-3" />}
      <span>{formatted}</span>
    </Badge>
  );
}

