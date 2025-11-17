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
import { Note } from '@/lib/types';
import { Plus } from 'lucide-react';

const noteFormSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc'),
  content: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
});

type NoteFormValues = z.infer<typeof noteFormSchema>;

interface NoteFormProps {
  onSuccess?: () => void;
  editingNote?: Note | null;
  trigger?: React.ReactNode;
  categories?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getDefaultValues = (): NoteFormValues => ({
  title: '',
  content: '',
  category: '',
  tags: '',
});

export default function NoteForm({
  onSuccess,
  editingNote,
  trigger,
  categories = [],
  open,
  onOpenChange,
}: NoteFormProps) {

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: getDefaultValues(),
  });

  // Update form when editingNote changes
  useEffect(() => {
    if (!open) return;
    if (editingNote) {
      form.reset({
        title: editingNote.title,
        content: editingNote.content || '',
        category: editingNote.category || '',
        tags: editingNote.tags || '',
      });
    } else {
      form.reset(getDefaultValues());
    }
  }, [editingNote, form, open]);

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset(getDefaultValues());
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (values: NoteFormValues) => {
    try {
      const url = editingNote ? `/api/notes/${editingNote.id}` : '/api/notes';
      const method = editingNote ? 'PATCH' : 'POST';

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
      console.error('Error saving note:', error);
    }
  };

  const defaultTrigger = (
    <Button onClick={() => form.reset(getDefaultValues())}>
      <Plus className="mr-2 h-4 w-4" />
      Thêm Note
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingNote ? 'Chỉnh sửa Note' : 'Thêm Note mới'}
          </DialogTitle>
          <DialogDescription>
            {editingNote
              ? 'Cập nhật thông tin note'
              : 'Tạo note mới để ghi chú'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">
                      Tiêu đề<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nhập tiêu đề..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">Nội dung</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={10}
                        placeholder="Nhập nội dung..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mb-1">Danh mục</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === 'none' ? '' : value)
                        }
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Chọn hoặc nhập danh mục" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Không có danh mục</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
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
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mb-1">Tags</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ví dụ: quan trọng, cần nhớ..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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

