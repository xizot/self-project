'use client';

import TaskKanban from '@/src/features/tasks/task-kanban';
import TaskList from '@/src/features/tasks/task-list';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function HomeContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('todos');

  useEffect(() => {
    const tab = searchParams.get('tab') || 'todos';
    setActiveTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="h-full bg-background">
      <div className="container mx-auto py-8 px-4">
        {activeTab === 'todos' ? <TaskList view="list" /> : <TaskKanban />}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="h-full bg-background flex items-center justify-center">
          <div className="text-muted-foreground">Đang tải...</div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
