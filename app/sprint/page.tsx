import SprintTasks from '@/src/features/jira/sprint-tasks';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

export default function SprintPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <SprintTasks />
      </Suspense>
    </div>
  );
}
