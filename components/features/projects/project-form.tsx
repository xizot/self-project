'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Project } from '@/lib/types';
import { Plus } from 'lucide-react';

const projectFormSchema = z.object({
  name: z.string().min(1, 'Tên project là bắt buộc'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Màu sắc phải là mã hex hợp lệ (ví dụ: #6366f1)'),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  onSuccess?: () => void;
  editingProject?: Project | null;
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getDefaultValues = (): ProjectFormValues => ({
  name: '',
  description: '',
  color: '#6366f1',
});

export default function ProjectForm({
  onSuccess,
  editingProject,
  trigger,
  open,
  onOpenChange,
}: ProjectFormProps) {

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: getDefaultValues(),
  });

  // Update form when editingProject changes
  useEffect(() => {
    if (!open) return;
    if (editingProject) {
      form.reset({
        name: editingProject.name,
        description: editingProject.description || '',
        color: editingProject.color || '#6366f1',
      });
    } else {
      form.reset(getDefaultValues());
    }
  }, [editingProject, form, open]);

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset(getDefaultValues());
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (values: ProjectFormValues) => {
    try {
      const url = editingProject
        ? `/api/projects/${editingProject.id}`
        : '/api/projects';
      const method = editingProject ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        form.reset(getDefaultValues());
        onSuccess?.();
        handleDialogChange(false);
      }
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const defaultTrigger = (
    <Button onClick={() => form.reset(getDefaultValues())}>
      <Plus className="mr-2 h-4 w-4" />
      Thêm Project
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingProject ? 'Chỉnh sửa Project' : 'Thêm Project mới'}
          </DialogTitle>
          <DialogDescription>
            {editingProject
              ? 'Cập nhật thông tin project'
              : 'Tạo project mới để quản lý tasks'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">
                      Tên Project<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nhập tên project..." />
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
                      <Textarea
                        {...field}
                        placeholder="Nhập mô tả..."
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">
                      Màu sắc<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          {...field}
                          placeholder="#6366f1"
                        />
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Chọn màu hoặc nhập mã hex
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogChange(false)}
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

