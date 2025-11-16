'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
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
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Task, Project, Status, Priority } from '@/lib/types';
import { Plus, Trash2, Edit, GripVertical } from 'lucide-react';

interface KanbanColumnProps {
  status: Status;
  tasks: (Task & { project?: Project })[];
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

function KanbanColumn({ status, tasks, onEdit, onDelete }: KanbanColumnProps) {
  const { setNodeRef } = useSortable({
    id: status.id.toString(),
    disabled: true,
  });

  return (
    <div ref={setNodeRef} className="flex-1 min-w-[300px]">
      <div
        className="bg-muted p-2 rounded-t-lg"
        style={{ borderTop: `3px solid ${status.color}` }}
      >
        <h3 className="font-semibold text-center">
          {status.name} ({tasks.length})
        </h3>
      </div>
      <div className="bg-muted/50 p-4 space-y-2 min-h-[500px] rounded-b-lg">
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
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm">{task.title}</CardTitle>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <div className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              className="h-6 w-6 p-0"
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
              className="h-6 w-6 p-0"
              type="button"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <CardDescription>
          <div className="flex gap-2 flex-wrap">
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
            {task.project && (
              <Badge variant="outline" className="text-xs">
                {task.project.name}
              </Badge>
            )}
          </div>
        </CardDescription>
      </CardHeader>
      {task.description && (
        <CardContent>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export default function TaskKanban() {
  const [tasks, setTasks] = useState<
    (Task & { project?: Project; status?: Status })[]
  >([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    project_id: null as number | null,
    title: '',
    description: '',
    status_id: 0,
    priority: 'medium' as Priority,
    category: '',
    due_date: '',
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
      await Promise.all([fetchStatuses(), fetchProjects()]);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (statuses.length > 0 && projects.length >= 0) {
      fetchTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, statuses.length, projects.length]);

  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/statuses');
      const data = await res.json();
      setStatuses(data);
      if (data.length > 0 && formData.status_id === 0) {
        setFormData((prev) => ({ ...prev, status_id: data[0].id }));
      }
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

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProject !== 'all')
        params.append('project_id', selectedProject.toString());

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
      const method = editingTask ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          project_id: formData.project_id || null,
        }),
      });

      if (res.ok) {
        setOpen(false);
        setEditingTask(null);
        setFormData({
          project_id: null,
          title: '',
          description: '',
          status_id: statuses[0]?.id || 0,
          priority: 'medium',
          category: '',
          due_date: '',
        });
        fetchTasks();
      }
    } catch (error) {
      console.error('Error saving task:', error);
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
    setFormData({
      project_id: task.project_id || null,
      title: task.title,
      description: task.description || '',
      status_id: task.status_id,
      priority: task.priority,
      category: task.category || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
    });
    setOpen(true);
  };

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
    const newStatusId = parseInt(over.id as string);
    const task = tasks.find((t) => t.id === taskId);

    if (!task || task.status_id === newStatusId) return;

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
  };

  if (loading) {
    return <div className="p-4">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <Select
            value={
              selectedProject === 'all' ? 'all' : selectedProject.toString()
            }
            onValueChange={(value) =>
              setSelectedProject(value === 'all' ? 'all' : parseInt(value))
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Chọn project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingTask(null);
                setFormData({
                  project_id:
                    selectedProject !== 'all' ? selectedProject : null,
                  title: '',
                  description: '',
                  status_id: statuses[0]?.id || 0,
                  priority: 'medium',
                  category: '',
                  due_date: '',
                });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Thêm Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTask ? 'Chỉnh sửa Task' : 'Thêm Task mới'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="task-title" className="mb-1">
                    Tiêu đề *
                  </Label>
                  <Input
                    id="task-title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="task-description" className="mb-1">
                    Mô tả
                  </Label>
                  <Textarea
                    id="task-description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="task-status" className="mb-1">
                      Trạng thái *
                    </Label>
                    <Select
                      value={formData.status_id.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status_id: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem
                            key={status.id}
                            value={status.id.toString()}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: status.color }}
                              />
                              {status.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="task-priority" className="mb-1">
                      Ưu tiên
                    </Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          priority: value as Priority,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Thấp</SelectItem>
                        <SelectItem value="medium">Trung bình</SelectItem>
                        <SelectItem value="high">Cao</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {selectedProject === 'all' && (
                  <div>
                    <Label htmlFor="task-project" className="mb-1">
                      Project
                    </Label>
                    <Select
                      value={formData.project_id?.toString() || 'none'}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          project_id: value === 'none' ? null : parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Không có project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem
                            key={project.id}
                            value={project.id.toString()}
                          >
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit">Lưu</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
