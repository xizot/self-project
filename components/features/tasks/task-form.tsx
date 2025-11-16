'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Task, Project, Status, Priority } from '@/lib/types';
import { Plus } from 'lucide-react';

interface TaskFormProps {
  projectId?: number | null;
  onSuccess?: () => void;
  editingTask?: Task | null;
  trigger?: React.ReactNode;
}

const taskFormSchema = z.object({
  project_id: z.number().nullable().optional(),
  title: z.string().min(1, 'Tiêu đề là bắt buộc'),
  description: z.string().optional(),
  status_id: z.number().min(1, 'Trạng thái là bắt buộc'),
  priority: z.enum(['low', 'medium', 'high']),
  category: z.string().optional(),
  due_date: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

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

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      project_id: projectId || null,
      title: '',
      description: '',
      status_id: 0,
      priority: 'medium',
      category: '',
      due_date: '',
    },
  });

  useEffect(() => {
    fetchStatuses();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (statuses.length > 0 && form.getValues('status_id') === 0) {
      form.setValue('status_id', statuses[0].id);
    }
  }, [statuses, form]);

  useEffect(() => {
    if (initialEditingTask) {
      setEditingTask(initialEditingTask);
      form.reset({
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
  }, [initialEditingTask, projectId, form]);

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

  const onSubmit = async (values: TaskFormValues) => {
    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
      const method = editingTask ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          project_id: values.project_id || null,
        }),
      });

      if (res.ok) {
        setOpen(false);
        setEditingTask(null);
        form.reset({
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
      form.reset({
        project_id: projectId || null,
        title: '',
        description: '',
        status_id: statuses[0]?.id || 0,
        priority: 'medium',
        category: '',
        due_date: '',
      });
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
              form.reset({
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!projectId && (
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">Project</FormLabel>
                    <Select
                      value={field.value?.toString() || 'none'}
                      onValueChange={(value) =>
                        field.onChange(
                          value === 'none' ? null : parseInt(value)
                        )
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn project" />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-1">
                    Tiêu đề <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-1">Mô tả</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">
                      Trạng thái <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">Ưu tiên</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Thấp</SelectItem>
                        <SelectItem value="medium">Trung bình</SelectItem>
                        <SelectItem value="high">Cao</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-1">Danh mục</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ví dụ: Công việc, Cá nhân..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-1">Hạn chót</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}

