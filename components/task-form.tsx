'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus } from 'lucide-react';

interface TaskFormProps {
  projectId?: number | null;
  onSuccess?: () => void;
  editingTask?: Task | null;
  trigger?: React.ReactNode;
}

export default function TaskForm({
  projectId,
  onSuccess,
  editingTask: initialEditingTask,
  trigger,
}: TaskFormProps) {
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(
    initialEditingTask || null
  );
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    project_id: projectId || null,
    title: '',
    description: '',
    status_id: 0,
    priority: 'medium' as Priority,
    category: '',
    due_date: '',
  });

  useEffect(() => {
    fetchStatuses();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (initialEditingTask) {
      setEditingTask(initialEditingTask);
      setFormData({
        project_id: initialEditingTask.project_id || projectId || null,
        title: initialEditingTask.title,
        description: initialEditingTask.description || '',
        status_id: initialEditingTask.status_id,
        priority: initialEditingTask.priority,
        category: initialEditingTask.category || '',
        due_date: initialEditingTask.due_date
          ? initialEditingTask.due_date.split('T')[0]
          : '',
      });
      setOpen(true);
    } else {
      setEditingTask(null);
    }
  }, [initialEditingTask, projectId]);

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
          project_id: projectId || null,
          title: '',
          description: '',
          status_id: statuses[0]?.id || 0,
          priority: 'medium',
          category: '',
          due_date: '',
        });
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingTask(null);
      setFormData({
        project_id: projectId || null,
        title: '',
        description: '',
        status_id: statuses[0]?.id || 0,
        priority: 'medium',
        category: '',
        due_date: '',
      });
      // Call onSuccess to reset editingTask in parent
      if (onSuccess) {
        setTimeout(() => onSuccess(), 0);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            onClick={() => {
              setEditingTask(null);
              setFormData({
                project_id: projectId || null,
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
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingTask ? 'Chỉnh sửa Task' : 'Thêm Task mới'}
          </DialogTitle>
          <DialogDescription>
            {editingTask
              ? 'Cập nhật thông tin task'
              : 'Tạo task mới để quản lý công việc'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {!projectId && (
              <div>
                <Label htmlFor="project" className="mb-1">
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
                  <SelectTrigger className="w-full">
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
            <div>
              <Label htmlFor="title" className="mb-1">
                Tiêu đề *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="description" className="mb-1">
                Mô tả
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status" className="mb-1">
                  Trạng thái *
                </Label>
                <Select
                  value={formData.status_id.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status_id: parseInt(value) })
                  }
                >
                  <SelectTrigger className="w-full">
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
                <Label htmlFor="priority" className="mb-1">
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
                  <SelectTrigger className="w-full">
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
            <div>
              <Label htmlFor="category" className="mb-1">
                Danh mục
              </Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="Ví dụ: Công việc, Cá nhân..."
              />
            </div>
            <div>
              <Label htmlFor="due_date" className="mb-1">
                Hạn chót
              </Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit">Lưu</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

