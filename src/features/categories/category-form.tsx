'use client';

import { Category } from '@/src/lib/types';
import { Button } from '@/src/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/shared/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/shared/components/ui/form';
import { Input } from '@/src/shared/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Tên danh mục là bắt buộc'),
  color: z
    .string()
    .regex(
      /^#[0-9A-Fa-f]{6}$/,
      'Màu sắc phải là mã hex hợp lệ (ví dụ: #6366f1)'
    ),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  onSuccess?: () => void;
  editingCategory?: Category | null;
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getDefaultValues = (): CategoryFormValues => ({
  name: '',
  color: '#6366f1',
});

export default function CategoryForm({
  onSuccess,
  editingCategory,
  trigger,
  open,
  onOpenChange,
}: CategoryFormProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: getDefaultValues(),
  });

  // Update form when editingCategory changes
  useEffect(() => {
    if (!open) return;
    if (editingCategory) {
      form.reset({
        name: editingCategory.name,
        color: editingCategory.color,
      });
    } else {
      form.reset(getDefaultValues());
    }
  }, [editingCategory, form, open]);

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset(getDefaultValues());
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (values: CategoryFormValues) => {
    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories';
      const method = editingCategory ? 'PATCH' : 'POST';

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
      console.error('Error saving category:', error);
    }
  };

  const defaultTrigger = (
    <Button onClick={() => form.reset(getDefaultValues())}>
      <Plus className="mr-2 h-4 w-4" />
      Thêm Danh mục
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingCategory ? 'Chỉnh sửa Danh mục' : 'Thêm Danh mục mới'}
          </DialogTitle>
          <DialogDescription>
            {editingCategory
              ? 'Cập nhật thông tin danh mục'
              : 'Tạo danh mục mới với tên và màu sắc'}
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
                      Tên danh mục<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nhập tên danh mục..." />
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
                        <Input type="text" {...field} placeholder="#6366f1" />
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Chọn màu hoặc nhập mã hex (ví dụ: #6366f1)
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
