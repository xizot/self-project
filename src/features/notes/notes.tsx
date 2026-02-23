'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Note } from '@/lib/types';
import NoteForm from '@/src/features/notes/note-form';
import { format } from 'date-fns';
import { Edit, Tag, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function NotesComponent() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleFormSuccess = () => {
    fetchNotes();
    setEditingNote(null);
    setNoteFormOpen(false);
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
    setNoteFormOpen(true);
  };

  const categories = Array.from(
    new Set(
      notes.map((n) => n.category).filter((cat): cat is string => Boolean(cat))
    )
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
        <NoteForm
          onSuccess={handleFormSuccess}
          editingNote={editingNote}
          categories={categories}
          open={noteFormOpen}
          onOpenChange={(isOpen) => {
            setNoteFormOpen(isOpen);
            if (!isOpen) {
              setEditingNote(null);
            }
          }}
        />
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Tìm kiếm notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tất cả danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
