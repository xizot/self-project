'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  KanbanBoard as Board,
  KanbanCard,
  TodoStatus,
  Priority,
} from '@/lib/types';
import { Plus, Trash2, Edit, GripVertical } from 'lucide-react';

interface KanbanColumnProps {
  id: string;
  title: string;
  cards: KanbanCard[];
  onEdit: (card: KanbanCard) => void;
  onDelete: (id: number) => void;
}

function KanbanColumn({
  id,
  title,
  cards,
  onEdit,
  onDelete,
}: KanbanColumnProps) {
  const { setNodeRef } = useSortable({ id, disabled: true });

  return (
    <div ref={setNodeRef} className="flex-1 min-w-[300px]">
      <div className="bg-muted p-2 rounded-t-lg">
        <h3 className="font-semibold text-center">
          {title} ({cards.length})
        </h3>
      </div>
      <div className="bg-muted/50 p-4 space-y-2 min-h-[500px] rounded-b-lg">
        <SortableContext
          items={cards.map((c) => c.id.toString())}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <KanbanCardItem
              key={card.id}
              card={card}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

interface KanbanCardItemProps {
  card: KanbanCard;
  onEdit: (card: KanbanCard) => void;
  onDelete: (id: number) => void;
}

function KanbanCardItem({ card, onEdit, onDelete }: KanbanCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-move"
      {...attributes}
    >
      <CardHeader className="pb-2" {...listeners}>
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm">{card.title}</CardTitle>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <div className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(card);
              }}
              className="h-6 w-6 p-0"
              type="button"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(card.id);
              }}
              className="h-6 w-6 p-0"
              type="button"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <CardDescription>
          <Badge variant={getPriorityColor(card.priority)} className="text-xs">
            {card.priority === 'high'
              ? 'Cao'
              : card.priority === 'medium'
                ? 'Trung bình'
                : 'Thấp'}
          </Badge>
        </CardDescription>
      </CardHeader>
      {card.description && (
        <CardContent>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {card.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export default function KanbanBoardComponent() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [cardFormData, setCardFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Priority,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    if (selectedBoard) {
      fetchCards();
    }
  }, [selectedBoard]);

  const fetchBoards = async () => {
    try {
      const res = await fetch('/api/kanban/boards');
      const data = await res.json();
      setBoards(data);
      if (data.length > 0 && !selectedBoard) {
        setSelectedBoard(data[0]);
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCards = async () => {
    if (!selectedBoard) return;
    try {
      const res = await fetch(`/api/kanban/cards?board_id=${selectedBoard.id}`);
      const data = await res.json();
      setCards(data);
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/kanban/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const newBoard = await res.json();
        setBoards([...boards, newBoard]);
        setSelectedBoard(newBoard);
        setOpen(false);
        setFormData({ name: '', description: '' });
      }
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoard) return;

    try {
      const res = await fetch('/api/kanban/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cardFormData,
          board_id: selectedBoard.id,
          status: 'todo',
        }),
      });

      if (res.ok) {
        setCardDialogOpen(false);
        setCardFormData({ title: '', description: '', priority: 'medium' });
        fetchCards();
      }
    } catch (error) {
      console.error('Error creating card:', error);
    }
  };

  const handleEditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    try {
      const res = await fetch(`/api/kanban/cards/${editingCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardFormData),
      });

      if (res.ok) {
        setCardDialogOpen(false);
        setEditingCard(null);
        setCardFormData({ title: '', description: '', priority: 'medium' });
        fetchCards();
      }
    } catch (error) {
      console.error('Error updating card:', error);
    }
  };

  const handleDeleteCard = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa card này?')) return;

    try {
      const res = await fetch(`/api/kanban/cards/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCards();
      }
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = parseInt(event.active.id as string);
    const card = cards.find((c) => c.id === cardId);
    setActiveCard(card || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !selectedBoard) return;

    const cardId = parseInt(active.id as string);
    const newStatus = over.id as TodoStatus;
    const card = cards.find((c) => c.id === cardId);

    if (!card || card.status === newStatus) return;

    // Calculate new position
    const statusCards = cards.filter((c) => c.status === newStatus);
    const newPosition = statusCards.length;

    try {
      await fetch('/api/kanban/cards/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          newStatus,
          newPosition,
        }),
      });

      fetchCards();
    } catch (error) {
      console.error('Error moving card:', error);
    }
  };

  const columns: { id: TodoStatus; title: string }[] = [
    { id: 'todo', title: 'Todo' },
    { id: 'in-progress', title: 'Đang làm' },
    { id: 'done', title: 'Hoàn thành' },
  ];

  if (loading) {
    return <div className="p-4">Đang tải...</div>;
  }

  if (boards.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Kanban Board</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tạo Board mới
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo Kanban Board mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateBoard}>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name" className="mb-1">
                      Tên Board *
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
                    <Label htmlFor="description" className="mb-1">
                      Mô tả
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
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
                  <Button type="submit">Tạo</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          Chưa có board nào. Hãy tạo board mới để bắt đầu!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <Select
            value={selectedBoard?.id.toString()}
            onValueChange={(value) => {
              const board = boards.find((b) => b.id.toString() === value);
              setSelectedBoard(board || null);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id.toString()}>
                  {board.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <h2 className="text-2xl font-bold">{selectedBoard?.name}</h2>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Board mới
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo Kanban Board mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateBoard}>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name" className="mb-1">
                      Tên Board *
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
                    <Label htmlFor="description" className="mb-1">
                      Mô tả
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
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
                  <Button type="submit">Tạo</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingCard(null);
                  setCardFormData({
                    title: '',
                    description: '',
                    priority: 'medium',
                  });
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm Card
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCard ? 'Chỉnh sửa Card' : 'Thêm Card mới'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={editingCard ? handleEditCard : handleCreateCard}>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="card-title" className="mb-1">
                      Tiêu đề *
                    </Label>
                    <Input
                      id="card-title"
                      value={cardFormData.title}
                      onChange={(e) =>
                        setCardFormData({
                          ...cardFormData,
                          title: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="card-description" className="mb-1">
                      Mô tả
                    </Label>
                    <Textarea
                      id="card-description"
                      value={cardFormData.description}
                      onChange={(e) =>
                        setCardFormData({
                          ...cardFormData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="card-priority" className="mb-1">
                      Ưu tiên
                    </Label>
                    <Select
                      value={cardFormData.priority}
                      onValueChange={(value) =>
                        setCardFormData({
                          ...cardFormData,
                          priority: value as Priority,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Thấp</SelectItem>
                        <SelectItem value="medium">Trung bình</SelectItem>
                        <SelectItem value="high">Cao</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCardDialogOpen(false)}
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
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => {
            const columnCards = cards.filter((c) => c.status === column.id);
            return (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                cards={columnCards}
                onEdit={(card) => {
                  setEditingCard(card);
                  setCardFormData({
                    title: card.title,
                    description: card.description || '',
                    priority: card.priority,
                  });
                  setCardDialogOpen(true);
                }}
                onDelete={handleDeleteCard}
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeCard ? (
            <Card className="w-[300px]">
              <CardHeader>
                <CardTitle className="text-sm">{activeCard.title}</CardTitle>
              </CardHeader>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
