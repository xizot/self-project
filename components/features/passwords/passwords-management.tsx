'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Password } from '@/lib/types';
import { Trash2, Edit, Plus, Copy, Eye, EyeOff, Search } from 'lucide-react';
import PasswordForm from '@/components/features/passwords/password-form';

const getTypeColor = (type: string) => {
  switch (type) {
    case 'password':
      return 'bg-blue-500 text-white border-blue-500';
    case 'webhook':
      return 'bg-purple-500 text-white border-purple-500';
    case 'api_key':
      return 'bg-green-500 text-white border-green-500';
    case 'token':
      return 'bg-orange-500 text-white border-orange-500';
    case 'other':
      return 'bg-gray-500 text-white border-gray-500';
    default:
      return 'bg-blue-500 text-white border-blue-500';
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'password':
      return 'Password';
    case 'webhook':
      return 'Webhook';
    case 'api_key':
      return 'API Key';
    case 'token':
      return 'Token';
    case 'other':
      return 'Other';
    default:
      return 'Password';
  }
};

export default function PasswordsManagement() {
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPassword, setEditingPassword] = useState<Password | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    fetchPasswords();
  }, []);

  const fetchPasswords = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/passwords?${params.toString()}`);
      const data = await res.json();
      setPasswords(data);
    } catch (error) {
      console.error('Error fetching passwords:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasswords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleFormSuccess = () => {
    fetchPasswords();
    setEditingPassword(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa mật khẩu này?')) return;

    try {
      const res = await fetch(`/api/passwords/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPasswords();
      }
    } catch (error) {
      console.error('Error deleting password:', error);
    }
  };

  const handleEdit = (password: Password) => {
    setEditingPassword(password);
  };

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${type} đã được sao chép!`);
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  const togglePasswordVisibility = (id: number) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisiblePasswords(newVisible);
  };

  const filteredPasswords = passwords.filter((pwd) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pwd.app_name.toLowerCase().includes(query) ||
      pwd.username?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return <div className="p-4">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Quản lý Mật khẩu</h2>
          <p className="text-muted-foreground">
            Lưu trữ và quản lý mật khẩu của các ứng dụng và website
          </p>
        </div>
        <PasswordForm
          onSuccess={handleFormSuccess}
          editingPassword={editingPassword}
        />
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên app, username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredPasswords.map((password) => (
          <Card key={password.id} className="hover:shadow-md transition-shadow gap-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <CardTitle className="text-sm font-semibold truncate">
                      {password.app_name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-xs border-0 px-1.5 py-0 ${getTypeColor(password.type || 'password')}`}
                    >
                      {getTypeLabel(password.type || 'password')}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleEdit(password)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDelete(password.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {password.username && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground min-w-[60px] shrink-0">
                    {password.type === 'webhook'
                      ? 'Tên:'
                      : password.type === 'api_key'
                      ? 'Tên:'
                      : 'Username:'}
                  </span>
                  <div className="flex items-center gap-0.5 flex-1 min-w-0">
                    <span className="text-xs truncate">
                      {password.username}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 shrink-0"
                      onClick={() =>
                        handleCopy(password.username!, password.type === 'webhook' || password.type === 'api_key' ? 'Tên' : 'Username')
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground min-w-[60px] shrink-0">
                  {password.type === 'webhook'
                    ? 'Webhook:'
                    : password.type === 'api_key'
                      ? 'API Key:'
                      : password.type === 'token'
                        ? 'Token:'
                        : 'Password:'}
                </span>
                <div className="flex items-center gap-0.5 flex-1 min-w-0">
                  <span className="text-xs font-mono truncate">
                    {visiblePasswords.has(password.id)
                      ? password.password
                      : '••••••••'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 shrink-0"
                    onClick={() => togglePasswordVisibility(password.id)}
                  >
                    {visiblePasswords.has(password.id) ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 shrink-0"
                    onClick={() => {
                      const label =
                        password.type === 'webhook'
                          ? 'Webhook URL'
                          : password.type === 'api_key'
                            ? 'API Key'
                            : password.type === 'token'
                              ? 'Token'
                              : 'Password';
                      handleCopy(password.password, label);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPasswords.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery
            ? 'Không tìm thấy mật khẩu nào.'
            : 'Chưa có mật khẩu nào. Hãy thêm mật khẩu mới!'}
        </div>
      )}
    </div>
  );
}
