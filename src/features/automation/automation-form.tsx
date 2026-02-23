'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AutomationScript, AutomationTask, Password } from '@/src/lib/types';
import { Button } from '@/src/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from 'lucide-react';

const automationFormSchema = z.object({
  name: z.string().min(1, 'Tên task là bắt buộc'),
  description: z.string().optional(),
  type: z.enum(['http_request', 'script']),
  config: z.string().min(1, 'Config là bắt buộc'),
  schedule: z.string().min(1, 'Lịch chạy là bắt buộc'),
  enabled: z.boolean().optional(),
  webhook_id: z.number().nullable().optional(),
  credential_id: z.number().nullable().optional(),
});

type AutomationFormValues = z.infer<typeof automationFormSchema>;

interface AutomationFormProps {
  onSuccess?: () => void;
  editingTask?: AutomationTask | null;
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getDefaultValues = (): AutomationFormValues => ({
  name: '',
  description: '',
  type: 'http_request',
  config: '',
  schedule: '1h',
  enabled: true,
  webhook_id: null,
  credential_id: null,
});

export default function AutomationForm({
  onSuccess,
  editingTask,
  trigger,
  open,
  onOpenChange,
}: AutomationFormProps) {
  const [scripts, setScripts] = useState<AutomationScript[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [webhooks, setWebhooks] = useState<Password[]>([]);
  const [credentials, setCredentials] = useState<Password[]>([]);

  const form = useForm<AutomationFormValues>({
    resolver: zodResolver(automationFormSchema),
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    fetchScripts();
    fetchWebhooks();
    fetchCredentials();
  }, []);

  const fetchScripts = async () => {
    try {
      const res = await fetch('/api/automation/scripts');
      const data = await res.json();
      setScripts(data);
    } catch (error) {
      console.error('Error fetching scripts:', error);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/passwords');
      const data = await res.json();
      // Filter only webhooks
      const webhookList = data.filter((p: Password) => p.type === 'webhook');
      setWebhooks(webhookList);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    }
  };

  const fetchCredentials = async () => {
    try {
      const res = await fetch('/api/passwords');
      const data = await res.json();
      // Filter credentials (api_key, token, password) - exclude webhooks
      const credentialList = data.filter((p: Password) => p.type !== 'webhook');
      setCredentials(credentialList);
    } catch (error) {
      console.error('Error fetching credentials:', error);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!editingTask) {
      setSelectedScriptId('');
      form.reset(getDefaultValues());
      return;
    }

    try {
      let scriptId = '';
      if (editingTask.type === 'script') {
        try {
          const config = JSON.parse(editingTask.config);
          const matchingScript = scripts.find((s) => s.path === config.path);
          if (matchingScript) {
            scriptId = matchingScript.id.toString();
          }
        } catch {
          const matchingScript = scripts.find(
            (s) => s.path === editingTask.config
          );
          if (matchingScript) {
            scriptId = matchingScript.id.toString();
          }
        }
      }
      setSelectedScriptId(scriptId);

      let credentialId = null;
      try {
        const config = JSON.parse(editingTask.config);
        if (config.credential_id) {
          credentialId = config.credential_id;
        }
      } catch {
        // ignore
      }

      form.reset({
        name: editingTask.name,
        description: editingTask.description || '',
        type: editingTask.type as 'http_request' | 'script',
        config: editingTask.config,
        schedule: editingTask.schedule,
        enabled: editingTask.enabled === 1,
        webhook_id: editingTask.webhook_id || null,
        credential_id: credentialId,
      });
    } catch (error) {
      console.error('Error parsing task config:', error);
    }
  }, [editingTask, form, scripts, open]);

  useEffect(() => {
    if (!open) return;
    fetchScripts();
    fetchWebhooks();
    fetchCredentials();
  }, [open]);

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedScriptId('');
      form.reset(getDefaultValues());
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (values: AutomationFormValues) => {
    try {
      const url = editingTask
        ? `/api/automation/${editingTask.id}`
        : '/api/automation';
      const method = editingTask ? 'PATCH' : 'POST';

      // Example config for http_request type
      let configValue = values.config;
      if (values.type === 'http_request' && !configValue.includes('{')) {
        // If it's just a URL, wrap it in JSON
        configValue = JSON.stringify({
          url: configValue,
          method: 'GET',
          headers: {},
        });
      } else if (values.type === 'script') {
        // For script type, ensure credential_id is included in config if selected
        try {
          const configObj = JSON.parse(configValue);
          if (values.credential_id) {
            configObj.credential_id = values.credential_id;
          } else {
            delete configObj.credential_id;
          }
          configValue = JSON.stringify(configObj);
        } catch {
          // Config is not JSON, skip
        }
      }

      // Remove credential_id from values as it's stored in config
      const { credential_id, ...submitValues } = values;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...submitValues,
          config: configValue,
        }),
      });

      if (res.ok) {
        onSuccess?.();
        handleDialogChange(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Không thể lưu automation task');
      }
    } catch (error) {
      console.error('Error saving automation task:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button onClick={() => form.reset()}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm Automation Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTask
              ? 'Chỉnh sửa Automation Task'
              : 'Thêm Automation Task mới'}
          </DialogTitle>
          <DialogDescription>
            {editingTask
              ? 'Cập nhật thông tin automation task'
              : 'Tạo task tự động để chạy theo lịch định kỳ'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">
                      Tên task<span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ví dụ: Lấy giá vàng hôm nay"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">Mô tả</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Mô tả về task này..."
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mb-1">
                        Loại<span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset script selection when type changes
                          if (value !== 'script') {
                            setSelectedScriptId('');
                            form.setValue('config', '');
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Chọn loại" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="http_request">
                            HTTP Request
                          </SelectItem>
                          <SelectItem value="script">Script</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="schedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mb-1">
                        Lịch chạy<span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Chọn lịch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="15s">Mỗi 15 giây</SelectItem>
                            <SelectItem value="30s">Mỗi 30 giây</SelectItem>
                            <SelectItem value="1m">Mỗi 1 phút</SelectItem>
                            <SelectItem value="5m">Mỗi 5 phút</SelectItem>
                            <SelectItem value="10m">Mỗi 10 phút</SelectItem>
                            <SelectItem value="15m">Mỗi 15 phút</SelectItem>
                            <SelectItem value="30m">Mỗi 30 phút</SelectItem>
                            <SelectItem value="1h">Mỗi 1 giờ</SelectItem>
                            <SelectItem value="2h">Mỗi 2 giờ</SelectItem>
                            <SelectItem value="6h">Mỗi 6 giờ</SelectItem>
                            <SelectItem value="12h">Mỗi 12 giờ</SelectItem>
                            <SelectItem value="1d">Mỗi ngày</SelectItem>
                            <SelectItem value="1w">Mỗi tuần</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {form.watch('type') === 'script' ? (
                <FormField
                  control={form.control}
                  name="config"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mb-1">
                        Script<span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={selectedScriptId}
                          onValueChange={(value) => {
                            setSelectedScriptId(value);
                            const script = scripts.find(
                              (s) => s.id.toString() === value
                            );
                            if (script) {
                              // Get current credential_id if exists
                              const currentCredentialId =
                                form.getValues('credential_id');
                              const configObj: any = {
                                path: script.path,
                                script_id: script.id,
                              };
                              if (currentCredentialId) {
                                configObj.credential_id = currentCredentialId;
                              }
                              field.onChange(JSON.stringify(configObj));
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Chọn script" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {scripts.map((script) => (
                              <SelectItem
                                key={script.id}
                                value={script.id.toString()}
                              >
                                {script.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                      {selectedScriptId && (
                        <p className="text-xs text-muted-foreground">
                          Path:{' '}
                          {
                            scripts.find(
                              (s) => s.id.toString() === selectedScriptId
                            )?.path
                          }
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="config"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mb-1">
                        Config<span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={
                            form.watch('type') === 'http_request'
                              ? 'URL hoặc JSON config: {"url": "https://api.example.com", "method": "GET"}'
                              : 'Config JSON cho task này...'
                          }
                          rows={4}
                          className="font-mono text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {form.watch('type') === 'script' && (
                <FormField
                  control={form.control}
                  name="credential_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mb-1">
                        Credentials (tùy chọn)
                      </FormLabel>
                      <Select
                        value={field.value?.toString() || 'none'}
                        onValueChange={(value) => {
                          const credentialId =
                            value === 'none' ? null : parseInt(value);
                          field.onChange(credentialId);

                          // Update config to include credential_id
                          const currentConfig = form.getValues('config');
                          try {
                            const configObj = JSON.parse(currentConfig);
                            if (credentialId) {
                              configObj.credential_id = credentialId;
                            } else {
                              delete configObj.credential_id;
                            }
                            form.setValue('config', JSON.stringify(configObj));
                          } catch {
                            // Config is not JSON, skip
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Chọn credentials cho script" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">
                            Không sử dụng credentials
                          </SelectItem>
                          {credentials.map((credential) => (
                            <SelectItem
                              key={credential.id}
                              value={credential.id.toString()}
                            >
                              {credential.app_name}
                              {credential.username &&
                                ` - ${credential.username}`}
                              {credential.email && ` (${credential.email})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Chọn credentials từ quản lý mật khẩu để script sử dụng
                        (ví dụ: Jira API token)
                      </p>
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="webhook_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1">
                      Webhook thông báo (tùy chọn)
                    </FormLabel>
                    <Select
                      value={field.value?.toString() || 'none'}
                      onValueChange={(value) => {
                        field.onChange(
                          value === 'none' ? null : parseInt(value)
                        );
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn webhook để nhận thông báo kết quả" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">
                          Không sử dụng webhook
                        </SelectItem>
                        {webhooks.map((webhook) => (
                          <SelectItem
                            key={webhook.id}
                            value={webhook.id.toString()}
                          >
                            <div className="flex flex-col">
                              <span>
                                {webhook.app_name}
                                {webhook.username && ` - ${webhook.username}`}
                              </span>
                              {webhook.url && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {webhook.url}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Khi script chạy xong, kết quả sẽ được gửi đến webhook này
                    </p>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Kích hoạt</FormLabel>
                      <div className="text-xs text-muted-foreground">
                        Task sẽ chạy tự động khi được kích hoạt
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
