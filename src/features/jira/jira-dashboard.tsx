'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, Clock, Users, BarChart3 } from 'lucide-react';
import { Password } from '@/lib/types';

interface Statistics {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byAssignee: Record<string, number>;
  byType: Record<string, number>;
  total: number;
}

interface JiraDashboardProps {
  selectedCredentialId: string;
  credentials: Password[];
}

export default function JiraDashboard({ selectedCredentialId, credentials }: JiraDashboardProps) {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCredentialId) {
      fetchStatistics();
    } else {
      setStatistics(null);
      setError(null);
    }
  }, [selectedCredentialId]);

  const fetchStatistics = async () => {
    if (!selectedCredentialId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/jira/statistics?credential_id=${selectedCredentialId}`
      );
      const data = await res.json();

      if (data.success && data.statistics) {
        setStatistics(data.statistics);
      } else {
        setError(data.error || 'Không thể tải thống kê từ Jira');
        setStatistics(null);
      }
    } catch (error: any) {
      console.error('Error fetching Jira statistics:', error);
      setError(error.message || 'Không thể kết nối đến Jira');
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusCount = (statusName: string): number => {
    if (!statistics) return 0;
    const statusLower = statusName.toLowerCase();
    return Object.entries(statistics.byStatus).reduce((sum, [status, count]) => {
      const s = status.toLowerCase();
      if (statusLower.includes('to do') || statusLower.includes('todo')) {
        if (s.includes('to do') || s.includes('todo')) return sum + count;
      } else if (statusLower.includes('in progress') || statusLower.includes('inprogress')) {
        if (s.includes('in progress') || s.includes('inprogress')) return sum + count;
      } else if (statusLower.includes('done') || statusLower.includes('completed')) {
        if (s.includes('done') || s.includes('completed')) return sum + count;
      }
      return sum;
    }, 0);
  };

  const toDoCount = getStatusCount('To Do');
  const inProgressCount = getStatusCount('In Progress');
  const doneCount = getStatusCount('Done');

  if (loading && !statistics) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Đang tải thống kê...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!statistics) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Chưa có dữ liệu thống kê. Vui lòng chọn Jira credential.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Do</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{toDoCount}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.total > 0
                ? `${((toDoCount / statistics.total) * 100).toFixed(1)}% tổng số issues`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.total > 0
                ? `${((inProgressCount / statistics.total) * 100).toFixed(1)}% tổng số issues`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Done</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{doneCount}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.total > 0
                ? `${((doneCount / statistics.total) * 100).toFixed(1)}% tổng số issues`
                : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Statistics by Priority */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Thống kê theo Priority
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(statistics.byPriority).length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu priority</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statistics.byPriority)
                .sort(([, a], [, b]) => b - a)
                .map(([priority, count]) => {
                  const percentage = statistics.total > 0 
                    ? ((count / statistics.total) * 100).toFixed(1) 
                    : '0';
                  return (
                    <div key={priority} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{priority}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {count} ({percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics by Assignee */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Thống kê theo Assignee
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(statistics.byAssignee).length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu assignee</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statistics.byAssignee)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10) // Top 10 assignees
                .map(([assignee, count]) => {
                  const percentage = statistics.total > 0 
                    ? ((count / statistics.total) * 100).toFixed(1) 
                    : '0';
                  return (
                    <div key={assignee} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{assignee}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {count} ({percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Thống kê theo Issue Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(statistics.byType).length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu type</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(statistics.byType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const percentage = statistics.total > 0 
                    ? ((count / statistics.total) * 100).toFixed(1) 
                    : '0';
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{type}</span>
                        <span className="text-xs text-muted-foreground">
                          {count} issues ({percentage}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Tổng quan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{statistics.total}</div>
              <div className="text-xs text-muted-foreground">Tổng số Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Object.keys(statistics.byStatus).length}
              </div>
              <div className="text-xs text-muted-foreground">Status khác nhau</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Object.keys(statistics.byPriority).length}
              </div>
              <div className="text-xs text-muted-foreground">Priority levels</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Object.keys(statistics.byAssignee).length}
              </div>
              <div className="text-xs text-muted-foreground">Assignees</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

