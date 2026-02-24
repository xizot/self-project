'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FamilyMember } from '@/src/lib/types';
import { Button } from '@/src/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/components/ui/select';
import { Switch } from '@/src/shared/components/ui/switch';
import { Textarea } from '@/src/shared/components/ui/textarea';

const memberFormSchema = z.object({
  full_name: z.string().min(1, 'Họ tên là bắt buộc'),
  gender: z.enum(['male', 'female']),
  birth_date: z.string().optional(),
  death_date: z.string().optional(),
  is_alive: z.boolean(),
  birth_order: z.number().optional(),
  notes: z.string().optional(),
});

type MemberFormValues = z.infer<typeof memberFormSchema>;

export interface AutoRelationship {
  targetMemberId: number;
  relationshipType: 'parent_child' | 'spouse';
  /** 'parent' means the new member is the parent of target; 'child' means new member is child of target */
  role: 'parent' | 'child' | 'spouse';
}

interface MemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMember?: FamilyMember | null;
  onSuccess?: () => void;
  autoRelationship?: AutoRelationship | null;
}

export default function MemberForm({
  open,
  onOpenChange,
  editingMember,
  onSuccess,
  autoRelationship,
}: MemberFormProps) {
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      full_name: '',
      gender: 'male',
      birth_date: '',
      death_date: '',
      is_alive: true,
      birth_order: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editingMember) {
      form.reset({
        full_name: editingMember.full_name,
        gender: editingMember.gender,
        birth_date: editingMember.birth_date || '',
        death_date: editingMember.death_date || '',
        is_alive: editingMember.is_alive === 1,
        birth_order: editingMember.birth_order ?? undefined,
        notes: editingMember.notes || '',
      });
    } else {
      form.reset({
        full_name: '',
        gender: 'male',
        birth_date: '',
        death_date: '',
        is_alive: true,
        birth_order: undefined,
        notes: '',
      });
    }
  }, [editingMember, form, open]);

  const handleSubmit = async (values: MemberFormValues) => {
    try {
      const url = editingMember
        ? `/api/family-tree/members/${editingMember.id}`
        : '/api/family-tree/members';
      const method = editingMember ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          is_alive: values.is_alive ? 1 : 0,
          birth_date: values.birth_date || null,
          death_date: values.death_date || null,
          birth_order: values.birth_order || null,
          notes: values.notes || null,
        }),
      });

      if (res.ok) {
        // Auto-create relationship if specified
        if (!editingMember && autoRelationship) {
          const newMember = await res.json();
          const { targetMemberId, relationshipType, role } = autoRelationship;
          const relBody =
            role === 'parent'
              ? {
                  person_id: newMember.id,
                  related_person_id: targetMemberId,
                  relationship_type: relationshipType,
                }
              : role === 'child'
                ? {
                    person_id: targetMemberId,
                    related_person_id: newMember.id,
                    relationship_type: relationshipType,
                  }
                : {
                    person_id: targetMemberId,
                    related_person_id: newMember.id,
                    relationship_type: relationshipType,
                  };
          await fetch('/api/family-tree/relationships', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(relBody),
          });
        }
        onSuccess?.();
        onOpenChange(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Không thể lưu');
      }
    } catch (error) {
      console.error('Error saving member:', error);
    }
  };

  const isAlive = form.watch('is_alive');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingMember ? 'Chỉnh sửa thành viên' : 'Thêm thành viên mới'}
          </DialogTitle>
          <DialogDescription>
            {editingMember
              ? 'Cập nhật thông tin thành viên gia đình'
              : autoRelationship
                ? `Thêm thành viên mới và tự động tạo quan hệ ${autoRelationship.role === 'parent' ? 'cha/mẹ' : autoRelationship.role === 'child' ? 'con' : 'vợ/chồng'}`
                : 'Thêm thành viên mới vào cây gia phả'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Họ tên<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nguyễn Văn A" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giới tính</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">👨 Nam</SelectItem>
                          <SelectItem value="female">👩 Nữ</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birth_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thứ tự (con thứ mấy)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="1"
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseInt(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày sinh</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_alive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 pt-6">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="mt-0!">Còn sống</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {!isAlive && (
                <FormField
                  control={form.control}
                  name="death_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày mất</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ghi chú</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Ghi chú thêm..."
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit">
                {editingMember ? 'Cập nhật' : 'Thêm'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
