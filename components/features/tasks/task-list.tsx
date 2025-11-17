'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Task, Project, Status, Priority, Category } from '@/lib/types';
import { Trash2, Edit, Filter, CheckSquare, LayoutGrid } from 'lucide-react';
import TaskForm from '@/components/features/tasks/task-form';
import TimeRemaining from '@/components/features/tasks/time-remaining';
import TaskFiltersComponent, {
  TaskFilters,
} from '@/components/features/tasks/task-filters';

interface TaskListProps {
  projectId?: number | null;
  view?: 'list' | 'kanban';
}

export default function TaskList({ projectId }: TaskListProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<
    (Task & { status?: Status; project?: Project })[]
  >([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({
    search: '',
    dateFrom: '',
    dateTo: '',
    category: 'all',
    project: 'all',
    status: 'all',
    sortBy: 'position',
    sortOrder: 'asc',
  });

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchStatuses(), fetchProjects(), fetchCategories()]);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (statuses.length > 0 && projects.length >= 0 && categories.length >= 0) {
      fetchTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, filters, statuses.length, projects.length, categories.length]);

  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/statuses');
      const data = await res.json();
      setStatuses(data);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId.toString());
      if (filters.status !== 'all')
        params.append('status_id', filters.status.toString());
      if (filters.project !== 'all' && !projectId)
        params.append('project_id', filters.project.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();

      // Map status and project info for each task
      const tasksWithDetails = data.map((task: Task) => {
        const status = statuses.find((s) => s.id === task.status_id);
        const project = task.project_id
          ? projects.find((p) => p.id === task.project_id)
          : null;
        return { ...task, status, project };
      });

      setTasks(tasksWithDetails);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa task này?')) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setTaskFormOpen(true);
  };

  const handleTaskFormSuccess = () => {
    fetchTasks();
    setEditingTask(null);
    setTaskFormOpen(false);
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
    }
  };

  const hasActiveFilters =
    filters.search ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.category !== 'all' ||
    filters.project !== 'all' ||
    filters.status !== 'all' ||
    filters.sortBy !== 'position' ||
    filters.sortOrder !== 'asc';

  const handleViewChange = (value: string) => {
    router.push(`/?tab=${value}`, { scroll: false });
  };

  if (loading) {
    return <div className="p-4">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Công việc</h2>
        <div className="flex items-center gap-2">
          <Tabs value="todos" onValueChange={handleViewChange}>
            <TabsList>
              <TabsTrigger value="todos">
                <CheckSquare className="h-4 w-4 mr-2" />
                Todo List
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            onClick={() => setFiltersOpen(true)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Bộ lọc
            {hasActiveFilters && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                !
              </Badge>
            )}
          </Button>
          <TaskForm
            projectId={projectId}
            onSuccess={handleTaskFormSuccess}
            editingTask={editingTask}
            open={taskFormOpen}
            onOpenChange={(isOpen) => {
              setTaskFormOpen(isOpen);
              if (!isOpen) {
                setEditingTask(null);
              }
            }}
          />
        </div>
      </div>

      <TaskFiltersComponent
        projects={projects}
        statuses={statuses}
        categories={categories}
        filters={filters}
        onFiltersChange={setFilters}
        projectId={projectId}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[300px] font-semibold">Tiêu đề</TableHead>
              <TableHead className="font-semibold">Trạng thái</TableHead>
              <TableHead className="font-semibold">Ưu tiên</TableHead>
              <TableHead className="font-semibold">Dự án</TableHead>
              <TableHead className="font-semibold">Danh mục</TableHead>
              <TableHead className="font-semibold">Hạn chót</TableHead>
              <TableHead className="w-[100px] font-semibold">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Chưa có task nào. Hãy thêm task mới!
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {task.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.status && (
                      <Badge
                        style={{
                          backgroundColor: task.status.color,
                          color: '#fff',
                        }}
                        className="text-xs"
                      >
                        {task.status.name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                      {task.priority === 'high'
                        ? 'Cao'
                        : task.priority === 'medium'
                          ? 'Trung bình'
                          : 'Thấp'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.project ? (
                      <Badge variant="outline" className="text-xs">
                        {task.project.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.category ? (
                      <Badge variant="outline" className="text-xs">
                        {task.category}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.due_date ? (
                      <TimeRemaining dueDate={task.due_date} />
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(task)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(task.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
