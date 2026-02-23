'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Password } from '@/lib/types';
import {
  AlertCircle,
  CalendarRange,
  Check,
  CheckSquare,
  ClipboardList,
  ExternalLink,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface JiraTask {
  key: string;
  summary: string;
  status: string;
  priority: string;
  issueType: string;
  url: string;
  project?: { key: string; name: string };
  assignee?: { displayName: string; emailAddress?: string };
  created?: string;
  updated?: string;
}

interface Sprint {
  id: number;
  name: string;
  state: 'active' | 'closed' | 'future';
  startDate?: string;
  endDate?: string;
  boardId: number;
  boardName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getStatusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('to do') || s.includes('todo'))
    return 'bg-blue-500 text-white';
  if (s.includes('in progress') || s.includes('inprogress'))
    return 'bg-yellow-500 text-white';
  if (s.includes('done') || s.includes('completed'))
    return 'bg-green-500 text-white';
  if (s.includes('cancel')) return 'bg-red-500 text-white';
  if (s.includes('block')) return 'bg-purple-500 text-white';
  if (s.includes('review')) return 'bg-orange-500 text-white';
  return 'bg-gray-500 text-white';
};

const getStatusBorderColor = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('to do') || s.includes('todo')) return '#3b82f6';
  if (s.includes('in progress') || s.includes('inprogress')) return '#eab308';
  if (s.includes('done') || s.includes('completed')) return '#22c55e';
  if (s.includes('cancel')) return '#ef4444';
  if (s.includes('block')) return '#a855f7';
  if (s.includes('review')) return '#f97316';
  return '#6b7280';
};

const getPriorityColor = (priority: string) => {
  const p = priority.toLowerCase();
  if (p === 'highest' || p === 'critical')
    return 'bg-red-100 text-red-700 border-red-200';
  if (p === 'high') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (p === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (p === 'low') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const formatDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// ─── Kanban sub-component ────────────────────────────────────────────────────

function KanbanBoard({ tasks }: { tasks: JiraTask[] }) {
  const columns = useMemo(() => {
    const map = new Map<string, JiraTask[]>();
    tasks.forEach((t) => {
      const col = map.get(t.status) || [];
      col.push(t);
      map.set(t.status, col);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a.toLowerCase().includes('to do')) return -1;
      if (b.toLowerCase().includes('to do')) return 1;
      return a.localeCompare(b);
    });
  }, [tasks]);

  if (columns.length === 0) return null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(([status, columnTasks]) => (
        <div
          key={status}
          className="flex-shrink-0 w-72 rounded-lg border bg-muted/30"
          style={{ borderTop: `4px solid ${getStatusBorderColor(status)}` }}
        >
          <div className="p-3 border-b flex items-center justify-between">
            <span className="font-medium text-sm">{status}</span>
            <Badge variant="secondary" className="text-xs">
              {columnTasks.length}
            </Badge>
          </div>
          <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
            {columnTasks.map((task) => (
              <Card key={task.key} className="shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      {task.key}
                    </span>
                    <a
                      href={task.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-sm leading-snug line-clamp-3">
                    {task.summary}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      className={`text-xs px-1.5 py-0 border ${getPriorityColor(task.priority)}`}
                      variant="outline"
                    >
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {task.issueType}
                    </Badge>
                  </div>
                  {task.assignee && (
                    <p className="text-xs text-muted-foreground truncate">
                      👤 {task.assignee.displayName}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SprintTasks() {
  const [credentials, setCredentials] = useState<Password[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [tasks, setTasks] = useState<JiraTask[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Fetch credentials on mount ──
  useEffect(() => {
    const fetchCreds = async () => {
      try {
        const res = await fetch('/api/passwords');
        const data = await res.json();
        const all: Password[] = Array.isArray(data) ? data : [];
        const jiraCreds = all.filter(
          (p) =>
            p.app_name.toLowerCase().includes('jira') &&
            (p.type === 'api_key' || p.type === 'token')
        );
        setCredentials(jiraCreds);
        if (jiraCreds.length === 1)
          setSelectedCredentialId(String(jiraCreds[0].id));
      } catch {
        setError('Không thể tải danh sách credentials');
      } finally {
        setLoadingCreds(false);
      }
    };
    fetchCreds();
  }, []);

  // ── Fetch sprints when credential changes or refresh triggered ──
  useEffect(() => {
    if (!selectedCredentialId) {
      setSprints([]);
      setSelectedSprintId('');
      setTasks([]);
      return;
    }
    const fetchSprints = async () => {
      setLoadingSprints(true);
      setError(null);
      setSprints([]);
      setSelectedSprintId('');
      setTasks([]);
      setSelectedAssignee('');
      try {
        const res = await fetch(
          `/api/jira/sprints?credential_id=${selectedCredentialId}`
        );
        const data = await res.json();
        if (!data.success)
          throw new Error(data.error || 'Failed to fetch sprints');
        const list: Sprint[] = data.sprints || [];
        setSprints(list);
        // Auto-select the first active sprint, or the most recent one
        if (list.length > 0) {
          const active = list.find((s) => s.state === 'active');
          setSelectedSprintId(String((active || list[0]).id));
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoadingSprints(false);
      }
    };
    fetchSprints();
  }, [selectedCredentialId, refreshKey]);

  // ── Fetch tasks when sprint changes ──
  useEffect(() => {
    if (!selectedSprintId || !selectedCredentialId) {
      setTasks([]);
      return;
    }
    const fetchTasks = async () => {
      setLoadingTasks(true);
      setError(null);
      try {
        const jql = encodeURIComponent(
          `sprint = ${selectedSprintId} ORDER BY status ASC, priority ASC`
        );
        const res = await fetch(
          `/api/jira/tasks?credential_id=${selectedCredentialId}&jql=${jql}`
        );
        const data = await res.json();
        if (!data.success)
          throw new Error(data.error || 'Failed to fetch tasks');
        setTasks(data.tasks || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoadingTasks(false);
      }
    };
    fetchTasks();
  }, [selectedSprintId, selectedCredentialId]);

  // ── Derived ──
  const selectedSprint = sprints.find((s) => String(s.id) === selectedSprintId);

  const sprintOptions = useMemo(
    () =>
      sprints.map((s) => ({
        id: String(s.id),
        name: s.state === 'active' ? `${s.name} ●` : s.name,
      })),
    [sprints]
  );

  const assigneeOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { id: string; name: string }[] = [];
    tasks.forEach((t) => {
      const name = t.assignee?.displayName;
      if (name && !seen.has(name)) {
        seen.add(name);
        opts.push({ id: name, name });
      }
    });
    return opts.sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (selectedAssignee) {
      result = result.filter(
        (t) => t.assignee?.displayName === selectedAssignee
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.key.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q) ||
          t.assignee?.displayName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tasks, search, selectedAssignee]);

  const stats = useMemo(() => {
    const done = tasks.filter(
      (t) =>
        t.status.toLowerCase().includes('done') ||
        t.status.toLowerCase().includes('completed')
    ).length;
    const inProgress = tasks.filter((t) =>
      t.status.toLowerCase().includes('in progress')
    ).length;
    const todo = tasks.filter(
      (t) =>
        t.status.toLowerCase().includes('to do') ||
        t.status.toLowerCase().includes('todo')
    ).length;
    const donePercent = tasks.length
      ? Math.round((done / tasks.length) * 100)
      : 0;
    return { done, inProgress, todo, donePercent };
  }, [tasks]);

  const [copied, setCopied] = useState(false);

  const handleCopyTasks = () => {
    if (filteredTasks.length === 0) return;
    const text = filteredTasks.map((t) => `${t.key}: ${t.summary}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loadingCreds) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Chưa có Jira credential. Vui lòng thêm API token trong trang{' '}
          <a href="/passwords" className="underline font-medium">
            Mật khẩu
          </a>
          .
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Task theo Sprint</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Xem và theo dõi tiến độ từng Sprint
          </p>
        </div>

        {/* Credential selector */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedCredentialId}
            onValueChange={setSelectedCredentialId}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Chọn Jira account" />
            </SelectTrigger>
            <SelectContent>
              {credentials.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.app_name}
                  {c.url && ` (${c.url})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCredentialId && (
            <Button
              variant="outline"
              size="icon"
              disabled={loadingSprints || loadingTasks}
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              <RefreshCw
                className={`h-4 w-4 ${loadingSprints || loadingTasks ? 'animate-spin' : ''}`}
              />
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sprint selector */}
      {selectedCredentialId && (
        <>
          {loadingSprints ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải danh sách Sprint...
            </div>
          ) : sprints.length === 0 && !error ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Không tìm thấy Sprint nào.</AlertDescription>
            </Alert>
          ) : sprints.length > 0 ? (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium shrink-0">Sprint</label>
              <Combobox
                options={sprintOptions}
                value={selectedSprintId}
                onChange={(val) => {
                  setSelectedSprintId(val);
                }}
                placeholder="Chọn sprint..."
                searchPlaceholder="Tìm sprint..."
                emptyMessage="Không tìm thấy sprint."
                showClearIcon={false}
                className="max-w-xs"
              />
            </div>
          ) : null}
        </>
      )}

      {/* Sprint info + stats */}
      {selectedSprint && tasks.length >= 0 && !loadingTasks && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <CalendarRange className="h-3.5 w-3.5" />
                Thời gian
              </div>
              <p className="text-sm font-medium">
                {formatDate(selectedSprint.startDate)} –{' '}
                {formatDate(selectedSprint.endDate)}
              </p>
              <Badge
                className={`mt-1 text-xs ${
                  selectedSprint.state === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
                variant="secondary"
              >
                {selectedSprint.state === 'active' ? 'Đang chạy' : 'Đã đóng'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">
                Tổng task
              </div>
              <p className="text-2xl font-bold">{tasks.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">
                Hoàn thành
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.done}</p>
              <p className="text-xs text-muted-foreground">
                {stats.donePercent}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Tiến độ
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-1">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${stats.donePercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.inProgress} đang làm · {stats.todo} chưa làm
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tasks area */}
      {selectedSprintId && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm task..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Assignee filter */}
            {assigneeOptions.length > 0 && (
              <div className="flex items-center gap-1.5">
                <UserRound className="h-4 w-4 text-muted-foreground shrink-0" />
                <Combobox
                  options={assigneeOptions}
                  value={selectedAssignee}
                  onChange={(val) => setSelectedAssignee(val)}
                  placeholder="Lọc assignee..."
                  searchPlaceholder="Tìm người..."
                  emptyMessage="Không tìm thấy."
                  className="w-44"
                />
                {selectedAssignee && (
                  <button
                    onClick={() => setSelectedAssignee('')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Active filters badge */}
            {(search || selectedAssignee) && (
              <Badge variant="secondary" className="text-xs">
                {filteredTasks.length} / {tasks.length}
              </Badge>
            )}

            {/* View toggle + Copy */}
            <div className="flex items-center gap-1.5 ml-auto">
              {filteredTasks.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 gap-1.5"
                  onClick={handleCopyTasks}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-xs text-green-600">Đã copy</span>
                    </>
                  ) : (
                    <>
                      <ClipboardList className="h-3.5 w-3.5" />
                      <span className="text-xs">Copy {filteredTasks.length} task</span>
                    </>
                  )}
                </Button>
              )}
              <div className="flex items-center gap-1 border rounded-md p-0.5">
                <Button
                  variant={view === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setView('list')}
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Danh sách
                </Button>
                <Button
                  variant={view === 'kanban' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setView('kanban')}
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Kanban
                </Button>
              </div>
            </div>
          </div>

          {loadingTasks ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Đang tải tasks...
              </span>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {search
                ? 'Không tìm thấy task khớp.'
                : 'Sprint này chưa có task nào.'}
            </div>
          ) : view === 'kanban' ? (
            <KanbanBoard tasks={filteredTasks} />
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-auto max-h-[calc(100vh-420px)]">
                <table className="w-full caption-bottom text-sm">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-28">Key</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-28">Priority</TableHead>
                      <TableHead className="w-28">Type</TableHead>
                      <TableHead className="w-40">Assignee</TableHead>
                      <TableHead className="w-28">Updated</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.key}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {task.key}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="truncate text-sm">{task.summary}</p>
                          {task.project && (
                            <span className="text-xs text-muted-foreground">
                              {task.project.name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${getStatusColor(task.status)}`}
                          >
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getPriorityColor(task.priority)}`}
                          >
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {task.issueType}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[160px]">
                          {task.assignee?.displayName || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(task.updated)}
                        </TableCell>
                        <TableCell>
                          <a
                            href={task.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </table>
              </div>
              <div className="px-4 py-2 border-t text-xs text-muted-foreground">
                Hiển thị {filteredTasks.length} / {tasks.length} task
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
