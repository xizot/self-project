'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Status } from '@/lib/types';
import {
  Plus,
  Trash2,
  Edit,
  GripVertical,
  List,
  LayoutGrid,
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function StatusItemList({
  status,
  onEdit,
  onDelete,
}: {
  status: Status;
  onEdit: (status: Status) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors min-w-full"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="flex-1 flex items-center gap-4">
        <div
          className="w-4 h-4 rounded-full border-2 border-background shadow-sm"
          style={{ backgroundColor: status.color }}
        />
        <div className="flex-1">
          <div className="font-medium">{status.name}</div>
          <div className="text-sm text-muted-foreground">#{status.color}</div>
        </div>
        <Badge
          style={{ backgroundColor: status.color, color: '#fff' }}
          className="min-w-[100px] text-center"
        >
          {status.name}
        </Badge>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(status)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(status.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StatusItemCard({
  status,
  onEdit,
  onDelete,
}: {
  status: Status;
  onEdit: (status: Status) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="cursor-move min-w-[280px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <Badge style={{ backgroundColor: status.color, color: '#fff' }}>
              {status.name}
            </Badge>
            <span className="text-sm text-muted-foreground">
              #{status.color}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(status)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(status.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export default function StatusesManagement() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/statuses');
      const data = await res.json();
      setStatuses(data);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingStatus
        ? `/api/statuses/${editingStatus.id}`
        : '/api/statuses';
      const method = editingStatus ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setOpen(false);
        setEditingStatus(null);
        setFormData({ name: '', color: '#3b82f6' });
        fetchStatuses();
      }
    } catch (error) {
      console.error('Error saving status:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa trạng thái này?')) return;

    try {
      const res = await fetch(`/api/statuses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStatuses();
      } else {
        const data = await res.json();
        alert(data.error || 'Không thể xóa trạng thái đang được sử dụng');
      }
    } catch (error) {
      console.error('Error deleting status:', error);
    }
  };

  const handleEdit = (status: Status) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      color: status.color,
    });
    setOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = statuses.findIndex((s) => s.id.toString() === active.id);
    const newIndex = statuses.findIndex((s) => s.id.toString() === over.id);

    const newStatuses = arrayMove(statuses, oldIndex, newIndex);
    setStatuses(newStatuses);

    // Update positions
    for (let i = 0; i < newStatuses.length; i++) {
      if (newStatuses[i].position !== i) {
        try {
          await fetch(`/api/statuses/${newStatuses[i].id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: i }),
          });
        } catch (error) {
          console.error('Error updating position:', error);
        }
      }
    }
  };

  if (loading) {
    return <div className="p-4">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Quản lý Trạng thái</h2>
          <p className="text-muted-foreground">
            Quản lý các trạng thái cho tasks với tên và màu sắc tùy chỉnh
          </p>
        </div>
        <div className="flex gap-2">
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as 'list' | 'kanban')}
          >
            <TabsList>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-2" />
                List
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingStatus(null);
                  setFormData({ name: '', color: '#3b82f6' });
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm Trạng thái
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingStatus
                    ? 'Chỉnh sửa Trạng thái'
                    : 'Thêm Trạng thái mới'}
                </DialogTitle>
                <DialogDescription>
                  {editingStatus
                    ? 'Cập nhật thông tin trạng thái'
                    : 'Tạo trạng thái mới với tên và màu sắc'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name" className="mb-1">
                      Tên trạng thái *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="color" className="mb-1">
                      Màu sắc *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="color"
                        type="color"
                        value={formData.color}
                        onChange={(e) =>
                          setFormData({ ...formData, color: e.target.value })
                        }
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={formData.color}
                        onChange={(e) =>
                          setFormData({ ...formData, color: e.target.value })
                        }
                        placeholder="#3b82f6"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Chọn màu hoặc nhập mã hex (ví dụ: #3b82f6)
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button type="submit">Lưu</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {viewMode === 'list' ? (
          <SortableContext
            items={statuses.map((s) => s.id.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {statuses.map((status) => (
                <StatusItemList
                  key={status.id}
                  status={status}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        ) : (
          <SortableContext
            items={statuses.map((s) => s.id.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {statuses.map((status) => (
                <StatusItemCard
                  key={status.id}
                  status={status}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        )}
        <DragOverlay>
          {activeId ? (
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-card shadow-lg">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor: statuses.find(
                    (s) => s.id.toString() === activeId
                  )?.color,
                }}
              />
              <span className="font-medium">
                {statuses.find((s) => s.id.toString() === activeId)?.name}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {statuses.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Chưa có trạng thái nào. Hãy thêm trạng thái mới!
        </div>
      )}
    </div>
  );
}
