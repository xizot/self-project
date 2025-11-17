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
import { AutomationScript } from '@/lib/types';
import { Plus } from 'lucide-react';

const scriptFormSchema = z.object({
  name: z.string().min(1, 'Tên script là bắt buộc'),
  description: z.string().optional(),
  path: z.string().min(1, 'Đường dẫn script là bắt buộc'),
});

type ScriptFormValues = z.infer<typeof scriptFormSchema>;

interface ScriptFormProps {
  onSuccess?: () => void;
  editingScript?: AutomationScript | null;
  trigger?: React.ReactNode;
}

export default function ScriptForm({
  onSuccess,
  editingScript: initialEditingScript,
  trigger,
}: ScriptFormProps) {
  const [open, setOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<AutomationScript | null>(
    initialEditingScript || null
  );

  const form = useForm<ScriptFormValues>({
    resolver: zodResolver(scriptFormSchema),
    defaultValues: {
      name: '',
      description: '',
      path: '',
    },
  });

  useEffect(() => {
    if (initialEditingScript) {
      setEditingScript(initialEditingScript);
      form.reset({
        name: initialEditingScript.name,
        description: initialEditingScript.description || '',
        path: initialEditingScript.path,
      });
      // Only open dialog if it's currently closed
      if (!open) {
        setOpen(true);
      }
    } else if (!initialEditingScript && open) {
      // If initialEditingScript is cleared but dialog is still open, close it
      setOpen(false);
    }
  }, [initialEditingScript, form, open]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingScript(null);
      form.reset({
        name: '',
        description: '',
        path: '',
      });
    }
  };

  const handleSubmit = async (values: ScriptFormValues) => {
    try {
      const url = editingScript
        ? `/api/automation/scripts/${editingScript.id}`
        : '/api/automation/scripts';
      const method = editingScript ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        onSuccess?.();
        handleOpenChange(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Không thể lưu script');
      }
    } catch (error) {
      console.error('Error saving script:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" onClick={() => form.reset()}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm Script
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingScript ? 'Chỉnh sửa Script' : 'Thêm Script mới'}
          </DialogTitle>
          <DialogDescription>
            {editingScript
              ? 'Cập nhật thông tin script'
              : 'Đăng ký script để sử dụng trong automation tasks'}
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
                      Tên script<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ví dụ: Lấy giá vàng" />
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
                        placeholder="Mô tả về script này..."
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">
                      Đường dẫn<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="scripts/get-gold-price.js"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Đường dẫn tương đối từ thư mục scripts/
                    </p>
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

