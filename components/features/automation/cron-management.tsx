'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Edit, Search, Clock, Calendar, Play, Pause, Zap } from 'lucide-react';
import AutomationForm from '@/components/features/automation/automation-form';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function CronManagement() {
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<AutomationTask | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'schedule' | 'status'>('schedule');

  useEffect(() => {
    fetchTasks();
    
    // Auto-refresh every 5 seconds to update "next run" times
    const interval = setInterval(() => {
      fetchTasks();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

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
      }
    } catch (error) {
      console.error('Error running automation task:', error);
      alert('Lỗi khi chạy task');
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

  const getScheduleColor = (schedule: string) => {
    if (schedule.includes('s')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (schedule.includes('m')) return 'bg-green-100 text-green-800 border-green-300';
    if (schedule.includes('h')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (schedule.includes('d')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (schedule.includes('w')) return 'bg-pink-100 text-pink-800 border-pink-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.name.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.schedule.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [tasks, searchQuery]);

  const groupedTasks = useMemo(() => {
    if (groupBy === 'schedule') {
      const grouped: Record<string, AutomationTask[]> = {};
      filteredTasks.forEach((task) => {
        const schedule = task.schedule;
        if (!grouped[schedule]) {
          grouped[schedule] = [];
        }
        grouped[schedule].push(task);
      });
      return grouped;
    } else {
      const grouped: Record<string, AutomationTask[]> = {
        enabled: [],
        disabled: [],
      };
      filteredTasks.forEach((task) => {
        if (task.enabled === 1) {
          grouped.enabled.push(task);
        } else {
          grouped.disabled.push(task);
        }
      });
      return grouped;
    }
  }, [filteredTasks, groupBy]);

  const getNextRunStatus = (task: AutomationTask) => {
    if (!task.next_run_at) {
      return { text: 'Chưa lên lịch', color: 'text-gray-500' };
    }
    const nextRun = new Date(task.next_run_at);
    const now = new Date();
    
    if (isPast(nextRun)) {
      return { text: 'Đã quá hạn', color: 'text-red-500' };
    }
    
    const distance = formatDistanceToNow(nextRun, { 
      addSuffix: true
    });
    return { text: distance, color: 'text-blue-600' };
  };

  if (loading) {
    return <div className="p-4">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Quản lý Lịch chạy (Cron)
          </h2>
          <p className="text-muted-foreground">
            Xem và quản lý lịch chạy của tất cả các automation tasks
          </p>
        </div>
        <AutomationForm
          onSuccess={handleFormSuccess}
          editingTask={editingTask}
        />
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên, mô tả hoặc lịch chạy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={groupBy === 'schedule' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGroupBy('schedule')}
          >
            <Clock className="mr-2 h-4 w-4" />
            Nhóm theo lịch
          </Button>
          <Button
            variant={groupBy === 'status' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGroupBy('status')}
          >
            <Zap className="mr-2 h-4 w-4" />
            Nhóm theo trạng thái
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng số task</CardDescription>
            <CardTitle className="text-2xl">{tasks.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Đang hoạt động</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {tasks.filter((t) => t.enabled === 1).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Đã tắt</CardDescription>
            <CardTitle className="text-2xl text-gray-600">
              {tasks.filter((t) => t.enabled === 0).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Số lịch khác nhau</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {new Set(tasks.map((t) => t.schedule)).size}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Grouped Tasks */}
      {groupBy === 'schedule' ? (
        <div className="space-y-6">
          {Object.entries(groupedTasks)
            .sort(([a], [b]) => {
              // Sort schedules: seconds < minutes < hours < days < weeks
              const order = ['s', 'm', 'h', 'd', 'w'];
              const aUnit = a.match(/[smhdw]$/)?.[0] || '';
              const bUnit = b.match(/[smhdw]$/)?.[0] || '';
              const aIndex = order.indexOf(aUnit);
              const bIndex = order.indexOf(bUnit);
              if (aIndex !== bIndex) return aIndex - bIndex;
              // Same unit, sort by value
              const aValue = parseInt(a) || 0;
              const bValue = parseInt(b) || 0;
              return aValue - bValue;
            })
            .map(([schedule, scheduleTasks]) => (
              <Card key={schedule}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`${getScheduleColor(schedule)} font-semibold`}
                      >
                        {getScheduleLabel(schedule)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {scheduleTasks.length} task{scheduleTasks.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên task</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Lần chạy cuối</TableHead>
                        <TableHead>Lần chạy tiếp theo</TableHead>
                        <TableHead>Số lần chạy</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scheduleTasks.map((task) => {
                        const nextRunStatus = getNextRunStatus(task);
                        return (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div>{task.name}</div>
                                {task.description && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {task.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={task.enabled === 1}
                                  onCheckedChange={() => handleToggleEnabled(task)}
                                />
                                <span className="text-xs">
                                  {task.enabled === 1 ? 'Bật' : 'Tắt'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {task.last_run_at ? (
                                <div className="text-sm">
                                  {format(new Date(task.last_run_at), 'dd/MM/yyyy HH:mm')}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Chưa chạy</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {task.next_run_at ? (
                                <div>
                                  <div className="text-sm font-medium">
                                    {format(new Date(task.next_run_at), 'dd/MM/yyyy HH:mm')}
                                  </div>
                                  <div className={`text-xs ${nextRunStatus.color}`}>
                                    {nextRunStatus.text}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Chưa lên lịch</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{task.run_count}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRunNow(task)}
                                  title="Chạy ngay"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingTask(task)}
                                  title="Chỉnh sửa"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([status, statusTasks]) => (
            <Card key={status}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        status === 'enabled'
                          ? 'bg-green-100 text-green-800 border-green-300'
                          : 'bg-gray-100 text-gray-800 border-gray-300'
                      }
                    >
                      {status === 'enabled' ? 'Đang hoạt động' : 'Đã tắt'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {statusTasks.length} task{statusTasks.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {statusTasks.map((task) => {
                    const nextRunStatus = getNextRunStatus(task);
                    return (
                      <Card key={task.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold">{task.name}</CardTitle>
                          {task.description && (
                            <CardDescription className="text-xs line-clamp-2">
                              {task.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getScheduleColor(task.schedule)}`}
                            >
                              {getScheduleLabel(task.schedule)}
                            </Badge>
                          </div>
                          {task.next_run_at && (
                            <div>
                              <div className="text-muted-foreground">Tiếp theo:</div>
                              <div className="font-medium">
                                {format(new Date(task.next_run_at), 'dd/MM HH:mm')}
                              </div>
                              <div className={nextRunStatus.color}>{nextRunStatus.text}</div>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-muted-foreground">
                              Đã chạy: {task.run_count} lần
                            </span>
                            <div className="flex gap-1">
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
                                onClick={() => setEditingTask(task)}
                                title="Chỉnh sửa"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery
            ? 'Không tìm thấy task nào phù hợp.'
            : 'Chưa có automation task nào. Hãy thêm task mới!'}
        </div>
      )}
    </div>
  );
}

