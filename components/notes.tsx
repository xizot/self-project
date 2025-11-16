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
import { Textarea } from '@/components/ui/textarea';
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
import { Note } from '@/lib/types';
import { Plus, Trash2, Edit, Tag } from 'lucide-react';
import { format } from 'date-fns';

export default function NotesComponent() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
  });
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchNotes();
  }, [filterCategory]);

  const fetchNotes = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.append('category', filterCategory);

      const res = await fetch(`/api/notes?${params.toString()}`);
      const data = await res.json();
      setNotes(data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingNote ? `/api/notes/${editingNote.id}` : '/api/notes';
      const method = editingNote ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setOpen(false);
        setEditingNote(null);
        setFormData({
          title: '',
          content: '',
          category: '',
          tags: '',
        });
        fetchNotes();
      }
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa note này?')) return;

    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchNotes();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content || '',
      category: note.category || '',
      tags: note.tags || '',
    });
    setOpen(true);
  };

  const categories = Array.from(
    new Set(notes.map((n) => n.category).filter(Boolean))
  );
  const filteredNotes = notes.filter((note) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        note.title.toLowerCase().includes(query) ||
        note.content?.toLowerCase().includes(query) ||
        note.tags?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return <div className="p-4">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ghi chú</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingNote(null);
                setFormData({
                  title: '',
                  content: '',
                  category: '',
                  tags: '',
                });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Thêm Note
            </Button>
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
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="note-title" className="mb-1">
                    Tiêu đề *
                  </Label>
                  <Input
                    id="note-title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="note-content" className="mb-1">
                    Nội dung
                  </Label>
                  <Textarea
                    id="note-content"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    rows={10}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="note-category" className="mb-1">
                      Danh mục
                    </Label>
                    <Input
                      id="note-category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      placeholder="Ví dụ: Công việc, Học tập..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="note-tags" className="mb-1">
                      Tags
                    </Label>
                    <Input
                      id="note-tags"
                      value={formData.tags}
                      onChange={(e) =>
                        setFormData({ ...formData, tags: e.target.value })
                      }
                      placeholder="Ví dụ: quan trọng, cần nhớ..."
                    />
                  </div>
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

      <div className="flex gap-4">
        <Input
          placeholder="Tìm kiếm notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">Tất cả danh mục</option>
          {categories.map((cat) => (
            <option key={cat} value={cat || ''}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredNotes.map((note) => (
          <Card key={note.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{note.title}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(note)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {note.category && (
                    <Badge variant="outline">{note.category}</Badge>
                  )}
                  {note.tags && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      <span className="text-xs text-muted-foreground">
                        {note.tags}
                      </span>
                    </div>
                  )}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-4">
                {note.content || 'Không có nội dung'}
              </p>
              <p className="text-xs text-muted-foreground">
                Cập nhật:{' '}
                {format(new Date(note.updated_at), 'dd/MM/yyyy HH:mm')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      {filteredNotes.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery
            ? 'Không tìm thấy note nào.'
            : 'Chưa có note nào. Hãy thêm note mới!'}
        </div>
      )}
    </div>
  );
}
