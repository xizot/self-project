'use client';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/components/ui/select';
import React, { useState } from 'react';

interface RelationshipFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: FamilyMember[];
  onSuccess?: () => void;
  preSelectedPersonId?: number | null;
}

export default function RelationshipForm({
  open,
  onOpenChange,
  members,
  onSuccess,
  preSelectedPersonId,
}: RelationshipFormProps) {
  const [personId, setPersonId] = useState('');
  const [relatedPersonId, setRelatedPersonId] = useState('');
  const [relationshipType, setRelationshipType] =
    useState<string>('parent_child');

  React.useEffect(() => {
    if (open && preSelectedPersonId) {
      setPersonId(String(preSelectedPersonId));
    }
    if (!open) {
      setPersonId('');
      setRelatedPersonId('');
    }
  }, [open, preSelectedPersonId]);

  const handleSubmit = async () => {
    if (!personId || !relatedPersonId) return;

    try {
      const res = await fetch('/api/family-tree/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: parseInt(personId),
          related_person_id: parseInt(relatedPersonId),
          relationship_type: relationshipType,
        }),
      });

      if (res.ok) {
        onSuccess?.();
        onOpenChange(false);
        setPersonId('');
        setRelatedPersonId('');
      } else {
        const data = await res.json();
        alert(data.error || 'Không thể tạo quan hệ');
      }
    } catch (error) {
      console.error('Error creating relationship:', error);
    }
  };

  const getLabel = () => {
    if (relationshipType === 'parent_child') {
      return { first: 'Cha/Mẹ', second: 'Con' };
    }
    return { first: 'Người 1', second: 'Người liên kết' };
  };

  const labels = getLabel();

  const preSelectedMember = preSelectedPersonId
    ? members.find((m) => m.id === preSelectedPersonId)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm quan hệ</DialogTitle>
          <DialogDescription>
            {preSelectedMember
              ? `Thiết lập mối quan hệ cho ${preSelectedMember.full_name}`
              : 'Thiết lập mối quan hệ giữa hai thành viên'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Loại quan hệ
            </label>
            <Select
              value={relationshipType}
              onValueChange={setRelationshipType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent_child">👨‍👧 Cha/Mẹ - Con</SelectItem>
                <SelectItem value="spouse">💑 Vợ - Chồng</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!preSelectedMember && (
            <div>
              <label className="text-sm font-medium mb-1 block">
                {labels.first}
              </label>
              <Select value={personId} onValueChange={setPersonId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={`Chọn ${labels.first.toLowerCase()}`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.gender === 'male' ? '👨' : '👩'} {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1 block">
              {labels.second}
            </label>
            <Select value={relatedPersonId} onValueChange={setRelatedPersonId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={`Chọn ${labels.second.toLowerCase()}`}
                />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter((m) => String(m.id) !== personId)
                  .map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.gender === 'male' ? '👨' : '👩'} {m.full_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!personId || !relatedPersonId}
          >
            Thêm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
