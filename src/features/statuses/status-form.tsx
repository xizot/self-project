'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Status } from '@/lib/types';
import { Plus } from 'lucide-react';

const statusFormSchema = z.object({
  name: z.string().min(1, 'Tên trạng thái là bắt buộc'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Màu sắc phải là mã hex hợp lệ (ví dụ: #3b82f6)'),
});

type StatusFormValues = z.infer<typeof statusFormSchema>;

interface StatusFormProps {
  onSuccess?: () => void;
  editingStatus?: Status | null;
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getDefaultValues = (): StatusFormValues => ({
  name: '',
  color: '#3b82f6',
});

export default function StatusForm({
  onSuccess,
  editingStatus,
  trigger,
  open,
  onOpenChange,
}: StatusFormProps) {

  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusFormSchema),
    defaultValues: getDefaultValues(),
  });

  // Update form when editingStatus changes
  useEffect(() => {
    if (!open) return;
    if (editingStatus) {
      form.reset({
        name: editingStatus.name,
        color: editingStatus.color,
      });
    } else {
      form.reset(getDefaultValues());
    }
  }, [editingStatus, form, open]);

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset(getDefaultValues());
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (values: StatusFormValues) => {
    try {
      const url = editingStatus
        ? `/api/statuses/${editingStatus.id}`
        : '/api/statuses';
      const method = editingStatus ? 'PATCH' : 'POST';

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
      console.error('Error saving status:', error);
    }
  };

  const defaultTrigger = (
    <Button onClick={() => form.reset(getDefaultValues())}>
      <Plus className="mr-2 h-4 w-4" />
      Thêm Trạng thái
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
            {editingStatus ? 'Chỉnh sửa Trạng thái' : 'Thêm Trạng thái mới'}
          </DialogTitle>
          <DialogDescription>
            {editingStatus
              ? 'Cập nhật thông tin trạng thái'
              : 'Tạo trạng thái mới với tên và màu sắc'}
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
                      Tên trạng thái<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nhập tên trạng thái..." />
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
                          placeholder="#3b82f6"
                        />
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Chọn màu hoặc nhập mã hex (ví dụ: #3b82f6)
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

