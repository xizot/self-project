'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Task, Project, Status, Priority, Category } from '@/lib/types';
import { Trash2, Edit, GripVertical, Filter, CheckSquare, LayoutGrid } from 'lucide-react';
import TaskForm from '@/components/features/tasks/task-form';
import TimeRemaining from '@/components/features/tasks/time-remaining';
import TaskFiltersComponent, {
  TaskFilters,
} from '@/components/features/tasks/task-filters';

interface KanbanColumnProps {
  status: Status;
  tasks: (Task & { project?: Project })[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

function KanbanColumn({ status, tasks, onEdit, onDelete }: KanbanColumnProps) {
  const { setNodeRef: setSortableRef } = useSortable({
    id: status.id.toString(),
    disabled: true,
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `column-${status.id}`,
  });

  return (
    <div
      ref={(node) => {
        setSortableRef(node);
        setDroppableRef(node);
      }}
      className="flex-1 min-w-[300px]"
    >
      <div
        className="bg-muted p-2 rounded-t-lg"
        style={{ borderTop: `3px solid ${status.color}` }}
      >
        <h3 className="font-semibold text-center">
          {status.name} ({tasks.length})
        </h3>
      </div>
      <div
        className={`bg-muted/50 p-4 space-y-2 min-h-[500px] rounded-b-lg transition-colors ${
          isOver ? 'bg-primary/5 border-2 border-dashed border-primary' : ''
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id.toString())}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCardItem
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

interface TaskCardItemProps {
  task: Task & { project?: Project; status?: Status };
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

function TaskCardItem({ task, onEdit, onDelete }: TaskCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-move"
      {...attributes}
    >
      <CardHeader className="pb-2" {...listeners}>
        <div className="flex justify-between items-start mb-1.5">
          <CardTitle className="text-sm leading-tight">{task.title}</CardTitle>
          <div className="flex gap-0.5 items-center" onClick={(e) => e.stopPropagation()}>
            <div className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              className="h-5 w-5 p-0"
              type="button"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="h-5 w-5 p-0"
              type="button"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground min-w-[50px]">Ưu tiên:</span>
            <Badge
              variant={getPriorityColor(task.priority)}
              className="text-xs"
            >
              {task.priority === 'high'
                ? 'Cao'
                : task.priority === 'medium'
                  ? 'Trung bình'
                  : 'Thấp'}
            </Badge>
          </div>
          {task.project && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground min-w-[50px]">Dự án:</span>
              <Badge variant="outline" className="text-xs">
                {task.project.name}
              </Badge>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground min-w-[50px]">Hạn:</span>
              <TimeRemaining dueDate={task.due_date} />
            </div>
          )}
        </div>
      </CardHeader>
      {task.description && (
        <CardContent className="pt-0 pb-2">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export default function TaskKanban() {
  const router = useRouter();
  const [tasks, setTasks] = useState<
    (Task & { project?: Project; status?: Status })[]
  >([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
  }, [filters, statuses.length, projects.length, categories.length]);

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
      if (filters.project !== 'all')
        params.append('project_id', filters.project.toString());
      if (filters.status !== 'all')
        params.append('status_id', filters.status.toString());
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
  };

  const handleTaskFormSuccess = () => {
    fetchTasks();
    setEditingTask(null);
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

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = parseInt(event.active.id as string);
    const task = tasks.find((t) => t.id === taskId);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = parseInt(active.id as string);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const overId = over.id as string;

    // Check if dropped on a column (column IDs are "column-{statusId}")
    if (overId.startsWith('column-')) {
      const statusIdStr = overId.replace('column-', '');
      const newStatusId = parseInt(statusIdStr);

      if (isNaN(newStatusId)) return;
      if (task.status_id === newStatusId) return;

      // Calculate new position
      const statusTasks = tasks.filter((t) => t.status_id === newStatusId);
      const newPosition = statusTasks.length;

      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status_id: newStatusId,
            position: newPosition,
          }),
        });

        fetchTasks();
      } catch (error) {
        console.error('Error moving task:', error);
      }
      return;
    }

    // Check if over is a status column (status columns have IDs matching status IDs)
    const statusColumn = statuses.find((s) => s.id.toString() === overId);

    if (statusColumn) {
      // Dropped on status column
      const newStatusId = statusColumn.id;
      if (task.status_id === newStatusId) return;

      // Calculate new position
      const statusTasks = tasks.filter((t) => t.status_id === newStatusId);
      const newPosition = statusTasks.length;

      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status_id: newStatusId,
            position: newPosition,
          }),
        });

        fetchTasks();
      } catch (error) {
        console.error('Error moving task:', error);
      }
      return;
    }

    // If dropped on another task, find the status of that task
    const overTask = tasks.find((t) => t.id.toString() === overId);
    if (overTask) {
      const newStatusId = overTask.status_id;
      if (task.status_id === newStatusId) return;

      // Calculate new position
      const statusTasks = tasks.filter((t) => t.status_id === newStatusId);
      const newPosition = statusTasks.length;

      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status_id: newStatusId,
            position: newPosition,
          }),
        });

        fetchTasks();
      } catch (error) {
        console.error('Error moving task:', error);
      }
    }
  };

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
          <Tabs value="kanban" onValueChange={handleViewChange}>
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
            projectId={filters.project !== 'all' ? filters.project : null}
            onSuccess={handleTaskFormSuccess}
            editingTask={editingTask}
          />
        </div>
      </div>

      <TaskFiltersComponent
        projects={projects}
        statuses={statuses}
        categories={categories}
        filters={filters}
        onFiltersChange={setFilters}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
      />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statuses.map((status) => {
            const statusTasks = tasks.filter((t) => t.status_id === status.id);
            return (
              <KanbanColumn
                key={status.id}
                status={status}
                tasks={statusTasks}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeTask ? (
            <Card className="w-[300px]">
              <CardHeader>
                <CardTitle className="text-sm">{activeTask.title}</CardTitle>
              </CardHeader>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
