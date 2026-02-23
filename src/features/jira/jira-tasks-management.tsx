'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Password } from '@/lib/types';
import {
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Loader2,
  CheckSquare,
  LayoutGrid,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  BarChart3,
} from 'lucide-react';
import JiraDashboard from './jira-dashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface JiraTask {
  key: string;
  summary: string;
  status: string;
  priority: string;
  issueType: string;
  url: string;
  project?: {
    key: string;
    name: string;
  };
  assignee?: {
    displayName: string;
    emailAddress?: string;
  };
  created?: string;
  updated?: string;
}

interface JiraResponse {
  success: boolean;
  tasks?: JiraTask[];
  total?: number;
  error?: string;
}

const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('to do') || statusLower.includes('todo')) {
    return 'bg-blue-500 text-white border-blue-500';
  } else if (
    statusLower.includes('in progress') ||
    statusLower.includes('inprogress')
  ) {
    return 'bg-yellow-500 text-white border-yellow-500';
  } else if (
    statusLower.includes('done') ||
    statusLower.includes('completed')
  ) {
    return 'bg-green-500 text-white border-green-500';
  } else if (
    statusLower.includes('cancel') ||
    statusLower.includes('cancelled')
  ) {
    return 'bg-red-500 text-white border-red-500';
  } else if (statusLower.includes('block') || statusLower.includes('blocked')) {
    return 'bg-purple-500 text-white border-purple-500';
  } else if (
    statusLower.includes('review') ||
    statusLower.includes('reviewing')
  ) {
    return 'bg-orange-500 text-white border-orange-500';
  } else {
    return 'bg-gray-500 text-white border-gray-500';
  }
};

const getStatusIcon = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('to do') || statusLower.includes('todo')) {
    return '📋';
  } else if (
    statusLower.includes('in progress') ||
    statusLower.includes('inprogress')
  ) {
    return '🔄';
  } else if (
    statusLower.includes('done') ||
    statusLower.includes('completed')
  ) {
    return '✅';
  } else if (
    statusLower.includes('cancel') ||
    statusLower.includes('cancelled')
  ) {
    return '❌';
  } else if (statusLower.includes('block') || statusLower.includes('blocked')) {
    return '🚫';
  } else if (
    statusLower.includes('review') ||
    statusLower.includes('reviewing')
  ) {
    return '👀';
  } else {
    return '📌';
  }
};

const getStatusBorderColor = (status: string): string => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('to do') || statusLower.includes('todo')) {
    return '#3b82f6'; // blue
  } else if (
    statusLower.includes('in progress') ||
    statusLower.includes('inprogress')
  ) {
    return '#eab308'; // yellow
  } else if (
    statusLower.includes('done') ||
    statusLower.includes('completed')
  ) {
    return '#22c55e'; // green
  } else if (
    statusLower.includes('cancel') ||
    statusLower.includes('cancelled')
  ) {
    return '#ef4444'; // red
  } else if (statusLower.includes('block') || statusLower.includes('blocked')) {
    return '#a855f7'; // purple
  } else if (
    statusLower.includes('review') ||
    statusLower.includes('reviewing')
  ) {
    return '#f97316'; // orange
  } else {
    return '#6b7280'; // gray
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
  } catch {
    return dateString;
  }
};

const getPriorityColor = (priority: string): string => {
  const priorityLower = priority.toLowerCase();
  if (
    priorityLower.includes('highest') ||
    priorityLower.includes('critical') ||
    priorityLower === '1'
  ) {
    return 'bg-red-600 text-white border-red-600';
  } else if (priorityLower.includes('high') || priorityLower === '2') {
    return 'bg-orange-500 text-white border-orange-500';
  } else if (
    priorityLower.includes('medium') ||
    priorityLower.includes('normal') ||
    priorityLower === '3'
  ) {
    return 'bg-yellow-500 text-white border-yellow-500';
  } else if (priorityLower.includes('low') || priorityLower === '4') {
    return 'bg-blue-500 text-white border-blue-500';
  } else if (priorityLower.includes('lowest') || priorityLower === '5') {
    return 'bg-gray-500 text-white border-gray-500';
  } else {
    return 'bg-gray-400 text-white border-gray-400';
  }
};

const getTypeColor = (type: string): string => {
  const typeLower = type.toLowerCase();
  if (typeLower.includes('bug') || typeLower.includes('error')) {
    return 'bg-red-500 text-white border-red-500';
  } else if (typeLower.includes('task') || typeLower.includes('story')) {
    return 'bg-blue-500 text-white border-blue-500';
  } else if (typeLower.includes('epic')) {
    return 'bg-purple-500 text-white border-purple-500';
  } else if (typeLower.includes('subtask') || typeLower.includes('sub-task')) {
    return 'bg-gray-500 text-white border-gray-500';
  } else if (
    typeLower.includes('improvement') ||
    typeLower.includes('enhancement')
  ) {
    return 'bg-green-500 text-white border-green-500';
  } else if (typeLower.includes('feature')) {
    return 'bg-indigo-500 text-white border-indigo-500';
  } else {
    return 'bg-slate-500 text-white border-slate-500';
  }
};

interface KanbanViewProps {
  tasks: JiraTask[];
}

function KanbanView({ tasks }: KanbanViewProps) {
  // Group tasks by status
  const tasksByStatus = tasks.reduce(
    (acc, task) => {
      const status = task.status || 'Unknown';
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(task);
      return acc;
    },
    {} as Record<string, JiraTask[]>
  );

  // Sort statuses with "To Do" first, then others alphabetically
  const statuses = Object.keys(tasksByStatus).sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    // Check if either is "To Do"
    const aIsToDo = aLower.includes('to do') || aLower.includes('todo');
    const bIsToDo = bLower.includes('to do') || bLower.includes('todo');

    if (aIsToDo && !bIsToDo) return -1; // a comes first
    if (!aIsToDo && bIsToDo) return 1; // b comes first
    if (aIsToDo && bIsToDo) return 0; // both are "To Do", keep order

    // Neither is "To Do", sort alphabetically
    return a.localeCompare(b);
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statuses.map((status) => {
        const statusTasks = tasksByStatus[status];
        return (
          <div key={status} className="flex-1 min-w-[300px]">
            <div
              className="bg-muted p-2 rounded-t-lg"
              style={{ borderTop: `3px solid ${getStatusBorderColor(status)}` }}
            >
              <h3 className="font-semibold text-center">
                {getStatusIcon(status)} {status} ({statusTasks.length})
              </h3>
            </div>
            <div className="bg-muted/50 p-4 space-y-2 min-h-[500px] rounded-b-lg">
              {statusTasks.map((task) => (
                <Card
                  key={task.key}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.open(task.url, '_blank')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      <a
                        href={task.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {task.key}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs">
                      {task.summary}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.priority && task.priority !== 'None' && (
                        <Badge
                          variant="outline"
                          className={`text-xs border-0 px-2 py-0.5 ${getPriorityColor(task.priority)}`}
                        >
                          {task.priority}
                        </Badge>
                      )}
                      {task.issueType && (
                        <Badge
                          variant="outline"
                          className={`text-xs border-0 px-2 py-0.5 ${getTypeColor(task.issueType)}`}
                        >
                          {task.issueType}
                        </Badge>
                      )}
                    </div>
                    {task.project && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Project:</span>{' '}
                        {task.project.name}
                      </div>
                    )}
                    {task.updated && (
                      <div className="text-xs text-muted-foreground">
                        Updated: {formatDate(task.updated)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function JiraTasksManagement() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [credentials, setCredentials] = useState<Password[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [tasks, setTasks] = useState<JiraTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [view, setView] = useState<'list' | 'kanban' | 'dashboard'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<{
    status: string[];
    priority: string[];
    type: string[];
    project: string[];
  }>({
    status: [],
    priority: [],
    type: [],
    project: [],
  });

  useEffect(() => {
    fetchCredentials();
    // Get view from URL params
    const viewParam = searchParams.get('view') || 'list';
    if (
      viewParam === 'kanban' ||
      viewParam === 'list' ||
      viewParam === 'dashboard'
    ) {
      setView(viewParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (selectedCredentialId) {
      fetchTasks();
    } else {
      setTasks([]);
      setTotal(0);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCredentialId]);

  const handleViewChange = (newView: string) => {
    const viewValue =
      newView === 'kanban'
        ? 'kanban'
        : newView === 'dashboard'
          ? 'dashboard'
          : 'list';
    setView(viewValue);
    router.push(`/jira?view=${viewValue}`, { scroll: false });
  };

  const fetchCredentials = async () => {
    try {
      const res = await fetch('/api/passwords');
      const data = await res.json();
      // Filter only Jira credentials
      const jiraCredentials = data.filter(
        (cred: Password) =>
          cred.app_name.toLowerCase().includes('jira') &&
          (cred.type === 'api_key' || cred.type === 'token')
      );
      setCredentials(jiraCredentials);

      // Auto-select first credential if available
      if (jiraCredentials.length > 0 && !selectedCredentialId) {
        setSelectedCredentialId(jiraCredentials[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
      setError('Không thể tải danh sách credentials');
    }
  };

  const fetchTasks = async () => {
    if (!selectedCredentialId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/jira/tasks?credential_id=${selectedCredentialId}`
      );
      const data: JiraResponse = await res.json();

      if (data.success && data.tasks) {
        setTasks(data.tasks);
        setTotal(data.total || data.tasks.length);
      } else {
        setError(data.error || 'Không thể tải tasks từ Jira');
        setTasks([]);
        setTotal(0);
      }
    } catch (error: any) {
      console.error('Error fetching Jira tasks:', error);
      setError(error.message || 'Không thể kết nối đến Jira');
      setTasks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (selectedCredentialId) {
      fetchTasks();
    }
  };

  // Get unique values for filters
  const getUniqueValues = (
    key: 'status' | 'priority' | 'issueType' | 'project'
  ): string[] => {
    const values = tasks
      .map((task) => {
        if (key === 'project') {
          return task.project?.name || '';
        } else if (key === 'issueType') {
          return task.issueType || '';
        } else if (key === 'status') {
          return task.status || '';
        } else if (key === 'priority') {
          return task.priority || '';
        }
        return '';
      })
      .filter((v) => v !== '' && v !== 'None');
    return Array.from(new Set(values)).sort();
  };

  // Filter and sort tasks
  const filteredAndSortedTasks = tasks
    .filter((task) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesKey = task.key.toLowerCase().includes(query);
        const matchesSummary = task.summary.toLowerCase().includes(query);
        if (!matchesKey && !matchesSummary) return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(task.status)) {
        return false;
      }

      // Priority filter
      if (
        filters.priority.length > 0 &&
        !filters.priority.includes(task.priority)
      ) {
        return false;
      }

      // Type filter
      if (filters.type.length > 0 && !filters.type.includes(task.issueType)) {
        return false;
      }

      // Project filter
      if (filters.project.length > 0) {
        const projectName = task.project?.name || '';
        if (!filters.project.includes(projectName)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;

      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'key':
          aValue = a.key;
          bValue = b.key;
          break;
        case 'summary':
          aValue = a.summary.toLowerCase();
          bValue = b.summary.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'priority':
          aValue = a.priority;
          bValue = b.priority;
          break;
        case 'type':
          aValue = a.issueType;
          bValue = b.issueType;
          break;
        case 'project':
          aValue = a.project?.name || '';
          bValue = b.project?.name || '';
          break;
        case 'updated':
          aValue = a.updated ? new Date(a.updated).getTime() : 0;
          bValue = b.updated ? new Date(b.updated).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to asc
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 ml-1" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 ml-1" />
    );
  };

  const toggleFilter = (filterType: keyof typeof filters, value: string) => {
    setFilters((prev) => {
      const current = prev[filterType];
      const newFilters = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [filterType]: newFilters };
    });
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      priority: [],
      type: [],
      project: [],
    });
  };

  const hasActiveFilters = Object.values(filters).some((arr) => arr.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Quản lý Jira Tasks</h2>
          <p className="text-muted-foreground">
            Xem và quản lý các task được assign cho bạn trên Jira
          </p>
        </div>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex-1 max-w-sm">
          <Select
            value={selectedCredentialId}
            onValueChange={setSelectedCredentialId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn Jira credential" />
            </SelectTrigger>
            <SelectContent>
              {credentials.map((credential) => (
                <SelectItem
                  key={credential.id}
                  value={credential.id.toString()}
                >
                  {credential.app_name}
                  {credential.url && ` (${credential.url})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1" />
        {view === 'list' && selectedCredentialId && tasks.length > 0 && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo key, summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        <Tabs value={view} onValueChange={handleViewChange}>
          <TabsList>
            <TabsTrigger value="dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="list">
              <CheckSquare className="h-4 w-4 mr-2" />
              List
            </TabsTrigger>
            <TabsTrigger value="kanban">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          onClick={handleRefresh}
          disabled={loading || !selectedCredentialId}
          variant="outline"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Làm mới
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!selectedCredentialId && credentials.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Chưa có Jira credential nào. Vui lòng thêm Jira credential trong{' '}
            <a href="/passwords" className="underline">
              Quản lý Mật khẩu
            </a>
            .
          </AlertDescription>
        </Alert>
      )}

      {selectedCredentialId && (
        <>
          {view === 'dashboard' ? (
            <JiraDashboard
              selectedCredentialId={selectedCredentialId}
              credentials={credentials}
            />
          ) : loading && tasks.length === 0 ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Đang tải tasks...</p>
            </div>
          ) : tasks.length > 0 ? (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                Hiển thị:{' '}
                <span className="font-semibold">
                  {filteredAndSortedTasks.length}
                </span>{' '}
                / <span className="font-semibold">{total}</span> task(s)
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="ml-2 h-6 text-xs"
                  >
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
              {view === 'list' ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-[100px] font-semibold">
                          <button
                            onClick={() => handleSort('key')}
                            className="flex items-center gap-1 hover:text-foreground whitespace-nowrap"
                          >
                            <span>Key</span>
                            {getSortIcon('key')}
                          </button>
                        </TableHead>
                        <TableHead className="font-semibold min-w-[300px]">
                          <button
                            onClick={() => handleSort('summary')}
                            className="flex items-center gap-1 hover:text-foreground whitespace-nowrap"
                          >
                            <span>Summary</span>
                            {getSortIcon('summary')}
                          </button>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="relative flex items-center gap-1 hover:text-foreground whitespace-nowrap">
                                  <span>Status</span>
                                  <Filter className="h-3.5 w-3.5" />
                                  {filters.status.length > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-xs flex items-center justify-center"
                                    >
                                      {filters.status.length}
                                    </Badge>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56">
                                <div className="space-y-2">
                                  <div className="font-medium text-sm">
                                    Lọc theo Status
                                  </div>
                                  <div className="max-h-60 overflow-y-auto space-y-1">
                                    {getUniqueValues('status').map((status) => (
                                      <label
                                        key={status}
                                        className="flex items-center space-x-2 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={filters.status.includes(
                                            status
                                          )}
                                          onChange={() =>
                                            toggleFilter('status', status)
                                          }
                                          className="rounded"
                                        />
                                        <span className="text-sm">
                                          {status}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <button
                              onClick={() => handleSort('status')}
                              className="flex items-center hover:text-foreground"
                            >
                              {getSortIcon('status')}
                            </button>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="relative flex items-center gap-1 hover:text-foreground whitespace-nowrap">
                                  <span>Priority</span>
                                  <Filter className="h-3.5 w-3.5" />
                                  {filters.priority.length > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-xs flex items-center justify-center"
                                    >
                                      {filters.priority.length}
                                    </Badge>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56">
                                <div className="space-y-2">
                                  <div className="font-medium text-sm">
                                    Lọc theo Priority
                                  </div>
                                  <div className="max-h-60 overflow-y-auto space-y-1">
                                    {getUniqueValues('priority').map(
                                      (priority) => (
                                        <label
                                          key={priority}
                                          className="flex items-center space-x-2 cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={filters.priority.includes(
                                              priority
                                            )}
                                            onChange={() =>
                                              toggleFilter('priority', priority)
                                            }
                                            className="rounded"
                                          />
                                          <span className="text-sm">
                                            {priority}
                                          </span>
                                        </label>
                                      )
                                    )}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <button
                              onClick={() => handleSort('priority')}
                              className="flex items-center hover:text-foreground"
                            >
                              {getSortIcon('priority')}
                            </button>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="relative flex items-center gap-1 hover:text-foreground whitespace-nowrap">
                                  <span>Type</span>
                                  <Filter className="h-3.5 w-3.5" />
                                  {filters.type.length > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-xs flex items-center justify-center"
                                    >
                                      {filters.type.length}
                                    </Badge>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56">
                                <div className="space-y-2">
                                  <div className="font-medium text-sm">
                                    Lọc theo Type
                                  </div>
                                  <div className="max-h-60 overflow-y-auto space-y-1">
                                    {getUniqueValues('issueType').map(
                                      (type) => (
                                        <label
                                          key={type}
                                          className="flex items-center space-x-2 cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={filters.type.includes(
                                              type
                                            )}
                                            onChange={() =>
                                              toggleFilter('type', type)
                                            }
                                            className="rounded"
                                          />
                                          <span className="text-sm">
                                            {type}
                                          </span>
                                        </label>
                                      )
                                    )}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <button
                              onClick={() => handleSort('type')}
                              className="flex items-center hover:text-foreground"
                            >
                              {getSortIcon('type')}
                            </button>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <div className="flex items-center gap-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="relative flex items-center gap-1 hover:text-foreground whitespace-nowrap">
                                  <span>Project</span>
                                  <Filter className="h-3.5 w-3.5" />
                                  {filters.project.length > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-xs flex items-center justify-center"
                                    >
                                      {filters.project.length}
                                    </Badge>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56">
                                <div className="space-y-2">
                                  <div className="font-medium text-sm">
                                    Lọc theo Project
                                  </div>
                                  <div className="max-h-60 overflow-y-auto space-y-1">
                                    {getUniqueValues('project').map(
                                      (project) => (
                                        <label
                                          key={project}
                                          className="flex items-center space-x-2 cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={filters.project.includes(
                                              project
                                            )}
                                            onChange={() =>
                                              toggleFilter('project', project)
                                            }
                                            className="rounded"
                                          />
                                          <span className="text-sm">
                                            {project}
                                          </span>
                                        </label>
                                      )
                                    )}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <button
                              onClick={() => handleSort('project')}
                              className="flex items-center hover:text-foreground"
                            >
                              {getSortIcon('project')}
                            </button>
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold">
                          <button
                            onClick={() => handleSort('updated')}
                            className="flex items-center gap-1 hover:text-foreground whitespace-nowrap"
                          >
                            <span>Updated</span>
                            {getSortIcon('updated')}
                          </button>
                        </TableHead>
                        <TableHead className="w-[100px] font-semibold">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedTasks.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center py-8 text-muted-foreground"
                          >
                            Không tìm thấy task nào phù hợp với bộ lọc.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAndSortedTasks.map((task) => (
                          <TableRow key={task.key}>
                            <TableCell className="font-medium">
                              <a
                                href={task.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline flex items-center gap-1 text-blue-600 dark:text-blue-400"
                              >
                                {task.key}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-md whitespace-normal break-words">
                                <div className="font-medium">
                                  {task.summary}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs border-0 px-2 py-0.5 ${getStatusColor(task.status)}`}
                              >
                                {getStatusIcon(task.status)} {task.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {task.priority && task.priority !== 'None' ? (
                                <Badge
                                  variant="outline"
                                  className={`text-xs border-0 px-2 py-0.5 ${getPriorityColor(task.priority)}`}
                                >
                                  {task.priority}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  -
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {task.issueType ? (
                                <Badge
                                  variant="outline"
                                  className={`text-xs border-0 px-2 py-0.5 ${getTypeColor(task.issueType)}`}
                                >
                                  {task.issueType}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  -
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {task.project ? (
                                <div className="text-sm">
                                  <div className="font-medium">
                                    {task.project.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {task.project.key}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  -
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(task.updated)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(task.url, '_blank')}
                                className="h-7 w-7 p-0"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <KanbanView tasks={tasks} />
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Không có task nào được assign cho bạn.
            </div>
          )}
        </>
      )}
    </div>
  );
}
