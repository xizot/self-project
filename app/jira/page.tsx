import JiraTasksManagement from '@/src/features/jira/jira-tasks-management';
import { Suspense } from 'react';

export default function JiraPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <JiraTasksManagement />
      </Suspense>
    </div>
  );
}
