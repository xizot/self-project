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
import { Category } from '@/lib/types';
import { Plus } from 'lucide-react';

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Tên danh mục là bắt buộc'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Màu sắc phải là mã hex hợp lệ (ví dụ: #6366f1)'),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  onSuccess?: () => void;
  editingCategory?: Category | null;
  trigger?: React.ReactNode;
}

export default function CategoryForm({
  onSuccess,
  editingCategory: initialEditingCategory,
  trigger,
}: CategoryFormProps) {
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(
    initialEditingCategory || null
  );

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      color: '#6366f1',
    },
  });

  // Update form when editingCategory changes
  useEffect(() => {
    if (initialEditingCategory) {
      setEditingCategory(initialEditingCategory);
      form.reset({
        name: initialEditingCategory.name,
        color: initialEditingCategory.color,
      });
      // Only open dialog if it's currently closed
      if (!open) {
        setOpen(true);
      }
    } else if (!initialEditingCategory && open) {
      // If initialEditingCategory is cleared but dialog is still open, close it
      setOpen(false);
    }
  }, [initialEditingCategory, form, open]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingCategory(null);
      form.reset();
    }
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
        setOpen(false);
        setEditingCategory(null);
        form.reset();
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const defaultTrigger = (
    <Button onClick={() => form.reset()}>
      <Plus className="mr-2 h-4 w-4" />
      Thêm Danh mục
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
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
                        <Input
                          type="text"
                          {...field}
                          placeholder="#6366f1"
                        />
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

