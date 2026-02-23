'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Password, App } from '@/lib/types';
import { Plus, Eye, EyeOff } from 'lucide-react';

const passwordFormSchema = z.object({
  app_name: z.string().min(1, 'Tên ứng dụng là bắt buộc'),
  type: z.enum(['password', 'webhook', 'api_key', 'token', 'other']).optional(),
  username: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
  url: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

interface PasswordFormProps {
  onSuccess?: () => void;
  editingPassword?: Password | null;
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getDefaultValues = (): PasswordFormValues => ({
  app_name: '',
  type: 'password',
  username: '',
  email: '',
  password: '',
  url: '',
  notes: '',
});

export default function PasswordForm({
  onSuccess,
  editingPassword,
  trigger,
  open,
  onOpenChange,
}: PasswordFormProps) {
  const [apps, setApps] = useState<App[]>([]);
  const [newAppName, setNewAppName] = useState('');
  const [showNewAppInput, setShowNewAppInput] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: getDefaultValues(),
  });

  const fetchApps = async () => {
    try {
      const res = await fetch('/api/apps');
      const data = await res.json();
      setApps(data);
    } catch (error) {
      console.error('Error fetching apps:', error);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    if (!open) return;

    if (editingPassword) {
      form.reset({
        app_name: editingPassword.app_name,
        type: editingPassword.type || 'password',
        username: editingPassword.username || '',
        email: editingPassword.email || '',
        password: editingPassword.password,
        url: editingPassword.url || '',
        notes: editingPassword.notes || '',
      });
    } else {
      form.reset(getDefaultValues());
    }
  }, [editingPassword, form, open]);

  const handleCreateNewApp = async () => {
    if (!newAppName.trim()) return;

    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAppName.trim() }),
      });

      if (res.ok) {
        const newApp = await res.json();
        setApps([...apps, newApp].sort((a, b) => a.name.localeCompare(b.name)));
        form.setValue('app_name', newApp.name);
        setNewAppName('');
        setShowNewAppInput(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Không thể tạo ứng dụng mới');
      }
    } catch (error) {
      console.error('Error creating app:', error);
    }
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setShowNewAppInput(false);
      setNewAppName('');
      setShowPassword(false);
      form.reset(getDefaultValues());
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (values: PasswordFormValues) => {
    try {
      const url = editingPassword
        ? `/api/passwords/${editingPassword.id}`
        : '/api/passwords';
      const method = editingPassword ? 'PATCH' : 'POST';

      // Prepare submit data with all fields
      const submitData = {
        ...values,
        username: values.username || null,
        email: values.email || null,
        url: values.url || null,
        notes: values.notes || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        onSuccess?.();
        handleDialogChange(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Không thể lưu mật khẩu');
      }
    } catch (error) {
      console.error('Error saving password:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button onClick={() => form.reset()}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm Mật khẩu
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPassword ? 'Chỉnh sửa Mật khẩu' : 'Thêm Mật khẩu mới'}
          </DialogTitle>
          <DialogDescription>
            {editingPassword
              ? 'Cập nhật thông tin mật khẩu'
              : 'Lưu trữ mật khẩu của ứng dụng hoặc website'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="app_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">
                      Tên ứng dụng<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      {showNewAppInput ? (
                        <div className="flex gap-2">
                          <Input
                            value={newAppName}
                            onChange={(e) => setNewAppName(e.target.value)}
                            placeholder="Nhập tên ứng dụng mới..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateNewApp();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={handleCreateNewApp}
                          >
                            Thêm
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowNewAppInput(false);
                              setNewAppName('');
                              form.setValue('app_name', '');
                            }}
                          >
                            Hủy
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Select
                            value={apps.some((app) => app.name === field.value) ? field.value : ''}
                            onValueChange={(value) => {
                              if (value === '__new__') {
                                setShowNewAppInput(true);
                              } else {
                                field.onChange(value);
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Chọn ứng dụng" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {apps.map((app) => (
                                <SelectItem key={app.id} value={app.name}>
                                  {app.name}
                                </SelectItem>
                              ))}
                              <SelectItem value="__new__">
                                <div className="flex items-center gap-2">
                                  <Plus className="h-4 w-4" />
                                  Thêm ứng dụng mới
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {!apps.some((app) => app.name === field.value) && field.value && (
                            <Input
                              {...field}
                              className="flex-1"
                              placeholder="Hoặc nhập tên ứng dụng"
                            />
                          )}
                        </div>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">
                      Loại<span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      value={field.value || 'password'}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn loại" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="password">Password</SelectItem>
                        <SelectItem value="webhook">Webhook</SelectItem>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="token">Token</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => {
                  const currentType = form.watch('type') || 'password';
                  const isWebhook = currentType === 'webhook';
                  const isApiKey = currentType === 'api_key';

                  return (
                    <FormItem>
                      <FormLabel className="mb-1">
                        {isWebhook ? 'Tên webhook' : isApiKey ? 'Tên API Key' : 'Username'}
                        {!isWebhook && !isApiKey && <span className="text-red-500">*</span>}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          placeholder={
                            isWebhook
                              ? 'Ví dụ: Webhook thông báo giá vàng'
                              : isApiKey
                              ? 'Ví dụ: API Key production'
                              : 'Tên đăng nhập'
                          }
                        />
                      </FormControl>
                      <FormMessage />
                      {isWebhook && (
                        <p className="text-xs text-muted-foreground">
                          Tên để phân biệt các webhook trong cùng ứng dụng
                        </p>
                      )}
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">
                      {(() => {
                        const currentType = form.watch('type') || 'password';
                        if (currentType === 'webhook') return 'Webhook URL';
                        if (currentType === 'api_key') return 'API Key';
                        if (currentType === 'token') return 'Token';
                        return 'Mật khẩu';
                      })()}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          {...field}
                          placeholder={
                            (() => {
                              const currentType = form.watch('type') || 'password';
                              if (currentType === 'webhook') return 'Nhập webhook URL';
                              if (currentType === 'api_key') return 'Nhập API key';
                              if (currentType === 'token') return 'Nhập token';
                              return 'Nhập mật khẩu';
                            })()
                          }
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => {
                  const currentType = form.watch('type') || 'password';
                  const showEmail = currentType === 'api_key' || currentType === 'token' || currentType === 'password';

                  if (!showEmail) return <></>;

                  return (
                    <FormItem>
                      <FormLabel className="mb-1">Email (tùy chọn)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          type="email"
                          placeholder="Email đăng nhập (ví dụ: user@example.com)"
                        />
                      </FormControl>
                      <FormMessage />
                      {currentType === 'api_key' && (
                        <p className="text-xs text-muted-foreground">
                          Email Atlassian (cho Jira API token) hoặc email đăng nhập
                        </p>
                      )}
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">URL (tùy chọn)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        type="url"
                        placeholder="https://example.com hoặc https://your-domain.atlassian.net"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      URL của ứng dụng hoặc service (ví dụ: Jira instance URL cho Jira API token)
                    </p>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">Ghi chú (tùy chọn)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="Ghi chú thêm về mật khẩu này..."
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
                onClick={() => handleDialogChange(false)}
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

