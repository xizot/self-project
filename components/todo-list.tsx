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
import { Todo, Priority, TodoStatus } from '@/lib/types';
import { Plus, Trash2, Edit, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as TodoStatus,
    priority: 'medium' as Priority,
    category: '',
    due_date: '',
  });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    fetchTodos();
  }, [filterStatus, filterCategory]);

  const fetchTodos = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterCategory !== 'all') params.append('category', filterCategory);

      const res = await fetch(`/api/todos?${params.toString()}`);
      const data = await res.json();
      setTodos(data);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTodo ? `/api/todos/${editingTodo.id}` : '/api/todos';
      const method = editingTodo ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setOpen(false);
        setEditingTodo(null);
        setFormData({
          title: '',
          description: '',
          status: 'todo',
          priority: 'medium',
          category: '',
          due_date: '',
        });
        fetchTodos();
      }
    } catch (error) {
      console.error('Error saving todo:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa todo này?')) return;

    try {
      const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTodos();
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description || '',
      status: todo.status,
      priority: todo.priority,
      category: todo.category || '',
      due_date: todo.due_date ? todo.due_date.split('T')[0] : '',
    });
    setOpen(true);
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

  const getStatusColor = (status: TodoStatus) => {
    switch (status) {
      case 'done':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'todo':
        return 'bg-gray-500';
    }
  };

  const categories = Array.from(
    new Set(todos.map((t) => t.category).filter(Boolean))
  );

  if (loading) {
    return <div className="p-4">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Todo List</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingTodo(null);
                setFormData({
                  title: '',
                  description: '',
                  status: 'todo',
                  priority: 'medium',
                  category: '',
                  due_date: '',
                });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Thêm Todo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTodo ? 'Chỉnh sửa Todo' : 'Thêm Todo mới'}
              </DialogTitle>
              <DialogDescription>
                {editingTodo
                  ? 'Cập nhật thông tin todo'
                  : 'Tạo todo mới để quản lý công việc'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="title" className="mb-1">
                    Tiêu đề *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
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
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status" className="mb-1">
                      Trạng thái
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          status: value as TodoStatus,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">Todo</SelectItem>
                        <SelectItem value="in-progress">Đang làm</SelectItem>
                        <SelectItem value="done">Hoàn thành</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority" className="mb-1">
                      Ưu tiên
                    </Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
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
                <div>
                  <Label htmlFor="category" className="mb-1">
                    Danh mục
                  </Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="Ví dụ: Công việc, Cá nhân..."
                  />
                </div>
                <div>
                  <Label htmlFor="due_date" className="mb-1">
                    Hạn chót
                  </Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
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
                <Button type="submit">Lưu</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Lọc theo trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in-progress">Đang làm</SelectItem>
            <SelectItem value="done">Hoàn thành</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Lọc theo danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat || ''}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {todos.map((todo) => (
          <Card key={todo.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{todo.title}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(todo)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(todo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                <div className="flex gap-2 mt-2">
                  <Badge variant={getPriorityColor(todo.priority)}>
                    {todo.priority === 'high'
                      ? 'Cao'
                      : todo.priority === 'medium'
                        ? 'Trung bình'
                        : 'Thấp'}
                  </Badge>
                  <Badge className={getStatusColor(todo.status)}>
                    {todo.status === 'done'
                      ? 'Hoàn thành'
                      : todo.status === 'in-progress'
                        ? 'Đang làm'
                        : 'Todo'}
                  </Badge>
                  {todo.category && (
                    <Badge variant="outline">{todo.category}</Badge>
                  )}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todo.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {todo.description}
                </p>
              )}
              {todo.due_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Hạn: {format(new Date(todo.due_date), 'dd/MM/yyyy')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {todos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Chưa có todo nào. Hãy thêm todo mới!
        </div>
      )}
    </div>
  );
}
