'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Task, Project, Status, Priority } from '@/lib/types';
import { Trash2, Edit, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import TaskForm from '@/components/task-form';

interface TaskListProps {
  projectId?: number | null;
  view?: 'list' | 'kanban';
}

export default function TaskList({ projectId, view = 'list' }: TaskListProps) {
  const [tasks, setTasks] = useState<
    (Task & { status?: Status; project?: Project })[]
  >([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<number | 'all'>('all');
  const [filterProject, setFilterProject] = useState<number | 'all'>('all');

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchStatuses(), fetchProjects()]);
    };
    loadData();

  }, []);

  useEffect(() => {
    if (statuses.length > 0 && projects.length >= 0) {
      fetchTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    projectId,
    filterStatus,
    filterProject,
    statuses.length,
    projects.length,
  ]);

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

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId.toString());
      if (filterStatus !== 'all')
        params.append('status_id', filterStatus.toString());
      if (filterProject !== 'all' && !projectId)
        params.append('project_id', filterProject.toString());

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

  if (loading) {
    return <div className="p-4">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <TaskForm
          projectId={projectId}
          onSuccess={handleTaskFormSuccess}
          editingTask={editingTask}
        />
      </div>

      <div className="flex gap-4">
        {!projectId && (
          <Select
            value={filterProject === 'all' ? 'all' : filterProject.toString()}
            onValueChange={(value) =>
              setFilterProject(value === 'all' ? 'all' : parseInt(value))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Lọc theo project" />
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
        )}
        <Select
          value={filterStatus === 'all' ? 'all' : filterStatus.toString()}
          onValueChange={(value) =>
            setFilterStatus(value === 'all' ? 'all' : parseInt(value))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Lọc theo trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status.id} value={status.id.toString()}>
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(task)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {task.status && (
                    <Badge
                      style={{
                        backgroundColor: task.status.color,
                        color: '#fff',
                      }}
                    >
                      {task.status.name}
                    </Badge>
                  )}
                  <Badge variant={getPriorityColor(task.priority)}>
                    {task.priority === 'high'
                      ? 'Cao'
                      : task.priority === 'medium'
                        ? 'Trung bình'
                        : 'Thấp'}
                  </Badge>
                  {task.project && (
                    <Badge variant="outline">{task.project.name}</Badge>
                  )}
                  {task.category && (
                    <Badge variant="outline">{task.category}</Badge>
                  )}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {task.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {task.description}
                </p>
              )}
              {task.due_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Hạn: {format(new Date(task.due_date), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {tasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Chưa có task nào. Hãy thêm task mới!
        </div>
      )}
    </div>
  );
}
