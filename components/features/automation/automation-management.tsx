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
import { Switch } from '@/components/ui/switch';
import { AutomationTask } from '@/lib/types';
import { Trash2, Edit, Plus, Search, Play, Pause, Clock, FileCode } from 'lucide-react';
import AutomationForm from '@/components/features/automation/automation-form';
import ScriptForm from '@/components/features/automation/script-form';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AutomationScript } from '@/lib/types';

export default function AutomationManagement() {
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<AutomationTask | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scripts, setScripts] = useState<AutomationScript[]>([]);
  const [showScriptsDialog, setShowScriptsDialog] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchScripts();
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

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/automation');
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching automation tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    fetchTasks();
    setEditingTask(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa automation task này?')) return;

    try {
      const res = await fetch(`/api/automation/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error deleting automation task:', error);
    }
  };

  const handleEdit = (task: AutomationTask) => {
    setEditingTask(task);
  };

  const handleToggleEnabled = async (task: AutomationTask) => {
    try {
      const newEnabled = task.enabled === 1 ? false : true;
      const res = await fetch(`/api/automation/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      if (res.ok) {
        fetchTasks();
      } else {
        const data = await res.json();
        console.error('Error toggling task:', data.error);
      }
    } catch (error) {
      console.error('Error toggling automation task:', error);
    }
  };

  const handleRunNow = async (task: AutomationTask) => {
    try {
      const res = await fetch('/api/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          alert('Task đã chạy thành công!');
        } else {
          alert(`Lỗi: ${result.error || 'Không thể chạy task'}`);
        }
        fetchTasks();
      } else {
        const data = await res.json();
        alert(data.error || 'Không thể chạy task');
      }
    } catch (error) {
      console.error('Error running automation task:', error);
      alert('Lỗi khi chạy task');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'http_request':
        return 'bg-blue-500 text-white border-blue-500';
      case 'script':
        return 'bg-green-500 text-white border-green-500';
      default:
        return 'bg-gray-500 text-white border-gray-500';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'http_request':
        return 'HTTP Request';
      case 'script':
        return 'Script';
      default:
        return type;
    }
  };

  const getScheduleLabel = (schedule: string) => {
    const scheduleMap: Record<string, string> = {
      '15s': 'Mỗi 15 giây',
      '30s': 'Mỗi 30 giây',
      '1m': 'Mỗi 1 phút',
      '5m': 'Mỗi 5 phút',
      '10m': 'Mỗi 10 phút',
      '15m': 'Mỗi 15 phút',
      '30m': 'Mỗi 30 phút',
      '1h': 'Mỗi 1 giờ',
      '2h': 'Mỗi 2 giờ',
      '6h': 'Mỗi 6 giờ',
      '12h': 'Mỗi 12 giờ',
      '1d': 'Mỗi ngày',
      '1w': 'Mỗi tuần',
    };
    return scheduleMap[schedule] || schedule;
  };

  const filteredTasks = tasks.filter((task) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.name.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return <div className="p-4">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Quản lý Automation</h2>
          <p className="text-muted-foreground">
            Tạo và quản lý các task tự động chạy theo lịch
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowScriptsDialog(true)}
          >
            <FileCode className="mr-2 h-4 w-4" />
            Quản lý Scripts
          </Button>
          <AutomationForm
            onSuccess={handleFormSuccess}
            editingTask={editingTask}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm automation task..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-1.5 pt-2 px-3">
              <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <CardTitle className="text-sm font-semibold truncate">
                      {task.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-xs border-0 px-1.5 py-0 ${getTypeColor(task.type)}`}
                    >
                      {getTypeLabel(task.type)}
                    </Badge>
                  </div>
                  {task.description && (
                    <CardDescription className="text-xs mt-1 line-clamp-1">
                      {task.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleRunNow(task)}
                    title="Chạy ngay"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleEdit(task)}
                    title="Chỉnh sửa"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDelete(task.id)}
                    title="Xóa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-0 px-3 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span className="truncate">{getScheduleLabel(task.schedule)}</span>
                </div>
                <Switch
                  checked={task.enabled === 1}
                  onCheckedChange={() => handleToggleEnabled(task)}
                />
              </div>
              {task.last_run_at && (
                <div className="text-xs text-muted-foreground truncate">
                  Lần cuối: {format(new Date(task.last_run_at), 'dd/MM HH:mm')}
                </div>
              )}
              {task.next_run_at && (
                <div className="text-xs text-muted-foreground truncate">
                  Tiếp theo: {format(new Date(task.next_run_at), 'dd/MM HH:mm')}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Đã chạy: {task.run_count} lần
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery
            ? 'Không tìm thấy automation task nào.'
            : 'Chưa có automation task nào. Hãy thêm task mới!'}
        </div>
      )}

      {/* Scripts Management Dialog */}
      <Dialog open={showScriptsDialog} onOpenChange={setShowScriptsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quản lý Scripts</DialogTitle>
            <DialogDescription>
              Quản lý các script automation có sẵn
            </DialogDescription>
          </DialogHeader>
          <ScriptsList
            scripts={scripts}
            onRefresh={fetchScripts}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Scripts List Component
function ScriptsList({
  scripts,
  onRefresh,
}: {
  scripts: AutomationScript[];
  onRefresh: () => void;
}) {
  const [editingScript, setEditingScript] = useState<AutomationScript | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa script này?')) return;

    try {
      const res = await fetch(`/api/automation/scripts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting script:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ScriptForm
          onSuccess={() => {
            onRefresh();
            setEditingScript(null);
          }}
          editingScript={editingScript}
        />
      </div>
      <div className="space-y-2">
        {scripts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Chưa có script nào. Hãy thêm script mới!
          </div>
        ) : (
          scripts.map((script) => (
            <div
              key={script.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium">{script.name}</div>
                {script.description && (
                  <div className="text-sm text-muted-foreground">
                    {script.description}
                  </div>
                )}
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  {script.path}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingScript(script)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(script.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

