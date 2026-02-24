'use client';

import { FamilyMember, FamilyRelationship } from '@/src/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/shared/components/ui/alert-dialog';
import { Button } from '@/src/shared/components/ui/button';
import { Link2, TreePine, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import FamilyTreeCanvas from './family-tree-canvas';
import MemberForm, { AutoRelationship } from './member-form';
import RelationshipFinder from './relationship-finder';
import RelationshipForm from './relationship-form';
import { KinshipResult } from './vietnamese-kinship';

export default function FamilyTreeView() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [autoRelationship, setAutoRelationship] =
    useState<AutoRelationship | null>(null);
  const [relationshipFormOpen, setRelationshipFormOpen] = useState(false);
  const [preSelectedPersonId, setPreSelectedPersonId] = useState<number | null>(
    null
  );
  const [deleteConfirm, setDeleteConfirm] = useState<FamilyMember | null>(null);

  // Highlights for relationship finder
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, relsRes] = await Promise.all([
        fetch('/api/family-tree/members'),
        fetch('/api/family-tree/relationships'),
      ]);

      if (membersRes.ok) {
        setMembers(await membersRes.json());
      }
      if (relsRes.ok) {
        setRelationships(await relsRes.json());
      }
    } catch (error) {
      console.error('Error fetching family tree data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditMember = (member: FamilyMember) => {
    setEditingMember(member);
    setMemberFormOpen(true);
  };

  const handleDeleteMember = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/family-tree/members/${deleteConfirm.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting member:', error);
    }
    setDeleteConfirm(null);
  };

  const handleRelationshipResult = (
    result: KinshipResult & {
      pathWithNames: Array<{ id: number; name: string }>;
    }
  ) => {
    setHighlightedIds(new Set(result.path));
  };

  const handleSelectPair = (personAId: number, personBId: number) => {
    setSelectedIds(new Set([personAId, personBId]));
  };

  const handleClickMember = (member: FamilyMember) => {
    // Toggle selection for relationship finder
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(member.id)) {
        next.delete(member.id);
      } else {
        if (next.size >= 2) {
          next.clear();
        }
        next.add(member.id);
      }
      return next;
    });
  };

  const handleAddParent = (member: FamilyMember) => {
    setEditingMember(null);
    setAutoRelationship({
      targetMemberId: member.id,
      relationshipType: 'parent_child',
      role: 'parent',
    });
    setMemberFormOpen(true);
  };

  const handleAddChild = (member: FamilyMember) => {
    setEditingMember(null);
    setAutoRelationship({
      targetMemberId: member.id,
      relationshipType: 'parent_child',
      role: 'child',
    });
    setMemberFormOpen(true);
  };

  const handleAddSpouse = (member: FamilyMember) => {
    setEditingMember(null);
    setAutoRelationship({
      targetMemberId: member.id,
      relationshipType: 'spouse',
      role: 'spouse',
    });
    setMemberFormOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TreePine className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Cây Gia Phả</h1>
          <span className="text-sm text-muted-foreground">
            ({members.length} thành viên)
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPreSelectedPersonId(null);
              setRelationshipFormOpen(true);
            }}
            disabled={members.length < 2}
          >
            <Link2 className="mr-2 h-4 w-4" />
            Thêm quan hệ
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingMember(null);
              setAutoRelationship(null);
              setMemberFormOpen(true);
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Thêm thành viên
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* Tree Canvas */}
        <FamilyTreeCanvas
          members={members}
          relationships={relationships}
          highlightedIds={highlightedIds}
          selectedIds={selectedIds}
          onEditMember={handleEditMember}
          onDeleteMember={(m) => setDeleteConfirm(m)}
          onClickMember={handleClickMember}
          onAddParent={handleAddParent}
          onAddChild={handleAddChild}
          onAddSpouse={handleAddSpouse}
          onLinkRelationship={(member) => {
            setPreSelectedPersonId(member.id);
            setRelationshipFormOpen(true);
          }}
          onAddMember={() => {
            setEditingMember(null);
            setAutoRelationship(null);
            setMemberFormOpen(true);
          }}
        />

        {/* Sidebar: Relationship Finder */}
        <div className="border rounded-lg p-4 h-fit">
          <RelationshipFinder
            members={members}
            onResult={handleRelationshipResult}
            onSelectPair={handleSelectPair}
          />
        </div>
      </div>

      {/* Dialogs */}
      <MemberForm
        open={memberFormOpen}
        onOpenChange={(open) => {
          setMemberFormOpen(open);
          if (!open) {
            setEditingMember(null);
            setAutoRelationship(null);
          }
        }}
        editingMember={editingMember}
        onSuccess={fetchData}
        autoRelationship={autoRelationship}
      />

      <RelationshipForm
        open={relationshipFormOpen}
        onOpenChange={(open) => {
          setRelationshipFormOpen(open);
          if (!open) setPreSelectedPersonId(null);
        }}
        members={members}
        onSuccess={fetchData}
        preSelectedPersonId={preSelectedPersonId}
      />

      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thành viên?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa <strong>{deleteConfirm?.full_name}</strong>{' '}
              khỏi cây gia phả? Tất cả quan hệ liên quan cũng sẽ bị xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
