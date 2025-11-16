'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskList from '@/components/task-list';
import TaskKanban from '@/components/task-kanban';
import { CheckSquare, LayoutGrid } from 'lucide-react';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('todos');

  useEffect(() => {
    const tab = searchParams.get('tab') || 'todos';
    setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/?tab=${value}`, { scroll: false });
  };

  return (
    <div className="h-full bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <p className="text-muted-foreground">
            Quản lý công việc, dự án và ghi chú của bạn một cách hiệu quả
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="todos" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              <span>Todo List</span>
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span>Kanban</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todos" className="mt-6">
            <TaskList view="list" />
          </TabsContent>

          <TabsContent value="kanban" className="mt-6">
            <TaskKanban />
          </TabsContent>
        </Tabs>
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
