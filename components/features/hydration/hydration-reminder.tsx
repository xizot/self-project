'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HydrationSlot {
  time: string;
  amount: number;
  title: string;
  note: string;
}

interface ReportRow {
  date: string;
  total: number;
  slots_completed: number;
}

const defaultSchedule: HydrationSlot[] = [
  {
    time: '06:30',
    amount: 300,
    title: 'Ngay sau khi thức dậy',
    note: 'Kích hoạt hệ tiêu hoá và thải độc sau 7-8 giờ ngủ.',
  },
  {
    time: '08:30',
    amount: 250,
    title: 'Trước bữa sáng',
    note: 'Giúp cơ thể hấp thu khoáng chất tốt hơn.',
  },
  {
    time: '11:00',
    amount: 300,
    title: 'Giữa buổi sáng',
    note: 'Duy trì sự tỉnh táo và hỗ trợ tuần hoàn.',
  },
  {
    time: '12:30',
    amount: 250,
    title: '30 phút sau bữa trưa',
    note: 'Hỗ trợ tiêu hoá, tránh loãng dịch vị.',
  },
  {
    time: '15:00',
    amount: 300,
    title: 'Buổi chiều',
    note: 'Bổ sung nước khi năng lượng bắt đầu giảm.',
  },
  {
    time: '17:00',
    amount: 250,
    title: 'Trước khi tập thể dục / tan làm',
    note: 'Chuẩn bị cho các hoạt động cuối ngày.',
  },
  {
    time: '19:30',
    amount: 250,
    title: 'Sau bữa tối',
    note: 'Giúp quá trình trao đổi chất diễn ra trơn tru.',
  },
  {
    time: '21:30',
    amount: 200,
    title: '1 giờ trước khi ngủ',
    note: 'Giữ cơ thể đủ nước trong khi ngủ, tránh uống quá sát giờ ngủ.',
  },
];

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatDateLabel(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

export default function HydrationReminder() {
  const today = useMemo(() => getLocalDateString(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [schedule, setSchedule] = useState<HydrationSlot[]>(defaultSchedule);
  const [consumedSlots, setConsumedSlots] = useState<number[]>([]);
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [pendingSlotIndex, setPendingSlotIndex] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isReminderActive, setIsReminderActive] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const overdueNotifiedRef = useRef<Set<string>>(new Set());

  const dayRelation = useMemo(() => {
    const sel = new Date(selectedDate);
    sel.setHours(0, 0, 0, 0);
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    const selTime = sel.getTime();
    const todayTime = todayDate.getTime();
    return {
      isToday: selTime === todayTime,
      isFutureDay: selTime > todayTime,
    };
  }, [selectedDate, today]);

  const { isToday, isFutureDay } = dayRelation;

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setPendingSlotIndex(null);
    setShowConfirmDialog(false);
  }, [selectedDate]);

  const dateOptions = useMemo(() => {
    return Array.from({ length: 7 })
      .map((_, index) => {
        const d = new Date();
        d.setDate(d.getDate() - index);
        const value = getLocalDateString(d);
        return { value, label: formatDateLabel(value), order: index };
      })
      .sort((a, b) => a.order - b.order);
  }, []);

  const fetchLogs = useCallback(
    async (date: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/hydration/logs?date=${date}`);
        if (!res.ok) throw new Error('Failed to fetch hydration logs');
        const data = await res.json();
        setSchedule(data.schedule ?? defaultSchedule);
        setConsumedSlots(
          Array.isArray(data.logs)
            ? data.logs.map((log: { slot_index: number }) => log.slot_index)
            : []
        );
        setIsReminderActive(Boolean(data.settings?.is_active));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchLogs(selectedDate);
  }, [fetchLogs, selectedDate]);

  useEffect(() => {
    overdueNotifiedRef.current.clear();
  }, [selectedDate]);

  const fetchReport = useCallback(async () => {
    setIsReportLoading(true);
    try {
      const res = await fetch('/api/hydration/report?days=7');
      if (!res.ok) throw new Error('Failed to fetch hydration report');
      const data = await res.json();
      setReportData(data.data ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsReportLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'report') {
      fetchReport();
    }
  }, [activeTab, fetchReport]);

  const notifyOverdue = useCallback(
    async (slotIndex: number) => {
      const slot = schedule[slotIndex];
      if (!slot) return;
      const key = `${selectedDate}-${slotIndex}`;
      if (overdueNotifiedRef.current.has(key)) return;
      overdueNotifiedRef.current.add(key);
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'hydration_overdue',
            message: `Bạn đã bỏ lỡ khung giờ uống nước ${slot.time}.`,
            metadata: { date: selectedDate, slot_index: slotIndex },
          }),
        });
      } catch (error) {
        console.error('Failed to create notification:', error);
      }
    },
    [schedule, selectedDate]
  );

  const currentSlotIndex = useMemo(() => {
    let index = schedule.findIndex((slot, idx) => {
      const start = parseTimeToMinutes(slot.time);
      const end =
        idx === schedule.length - 1
          ? 24 * 60
          : parseTimeToMinutes(schedule[idx + 1].time);
      return currentMinutes >= start && currentMinutes < end;
    });
    if (index === -1) {
      index = currentMinutes < parseTimeToMinutes(schedule[0].time) ? 0 : schedule.length - 1;
    }
    return index;
  }, [currentMinutes, schedule]);

  const upcomingIndex = useMemo(() => {
    const idx = schedule.findIndex((slot) => parseTimeToMinutes(slot.time) > currentMinutes);
    return idx === -1 ? schedule.length - 1 : idx;
  }, [currentMinutes, schedule]);

  const totalDailyIntake = useMemo(
    () => schedule.reduce((sum, slot) => sum + slot.amount, 0),
    [schedule]
  );

  const consumedAmount = useMemo(() => {
    return consumedSlots.reduce(
      (sum, idx) => sum + (schedule[idx] ? schedule[idx].amount : 0),
      0
    );
  }, [consumedSlots, schedule]);

  const handleConfirm = useCallback(
    async (index: number) => {
      if (!dayRelation.isToday) return;
      if (consumedSlots.includes(index)) return;
      try {
        const res = await fetch('/api/hydration/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: selectedDate, slot_index: index }),
        });
        if (!res.ok) throw new Error('Failed to confirm hydration');
        setConsumedSlots((prev) => [...prev, index].sort((a, b) => a - b));
        if (pendingSlotIndex === index) {
          setPendingSlotIndex(null);
          setShowConfirmDialog(false);
        }
      } catch (error) {
        console.error(error);
      }
    },
    [consumedSlots, dayRelation.isToday, pendingSlotIndex, selectedDate]
  );

  const handleToggleReminder = useCallback(
    async (value: boolean) => {
      setIsReminderActive(value);
      try {
        await fetch('/api/hydration/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: value }),
        });
      } catch (error) {
        console.error('Failed to update hydration settings:', error);
      }
    },
    []
  );

  const playReminderSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = 660;
      gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 1);
    } catch (error) {
      console.error('Error playing reminder sound:', error);
    }
  }, []);

  useEffect(() => {
    if (!isReminderActive || !isToday) {
      setPendingSlotIndex(null);
      setShowConfirmDialog(false);
      return;
    }

    if (currentSlotIndex == null) return;
    const slot = schedule[currentSlotIndex];
    if (!slot) return;

    const slotMinutes = parseTimeToMinutes(slot.time);
    const isConsumed = consumedSlots.includes(currentSlotIndex);

    if (!isConsumed && slotMinutes <= currentMinutes) {
      setPendingSlotIndex(currentSlotIndex);
      setShowConfirmDialog(true);
    } else if (isConsumed && pendingSlotIndex === currentSlotIndex) {
      setPendingSlotIndex(null);
      setShowConfirmDialog(false);
    }

    if (!isConsumed && slotMinutes + 30 <= currentMinutes) {
      notifyOverdue(currentSlotIndex);
    }
  }, [
    consumedSlots,
    currentMinutes,
    currentSlotIndex,
    isReminderActive,
    isToday,
    notifyOverdue,
    pendingSlotIndex,
    schedule,
  ]);

  useEffect(() => {
    if (showConfirmDialog && isReminderActive) {
      playReminderSound();
    }
  }, [showConfirmDialog, isReminderActive, playReminderSound]);

  const activeSlot = pendingSlotIndex != null ? schedule[pendingSlotIndex] : null;

  const scheduleContent = (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card className="col-span-1">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Lịch nhắc uống nước</CardTitle>
              <CardDescription>
                Dựa trên khuyến nghị ~2 lít nước / ngày, chia thành các thời điểm lý tưởng.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Ngày</span>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Chọn ngày" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Kích hoạt nhắc</span>
                <Switch
                  checked={isReminderActive}
                  onCheckedChange={handleToggleReminder}
                  disabled={selectedDate !== today}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
          )}
          {schedule.map((slot, index) => {
            const slotMinutes = parseTimeToMinutes(slot.time);
            const isConsumed = consumedSlots.includes(index);
            const isFutureSlot =
              isFutureDay || (isToday && slotMinutes > currentMinutes);
            const isCurrent =
              isToday && index === currentSlotIndex && !isFutureSlot;
            const status = isConsumed
              ? 'completed'
              : isCurrent
              ? 'current'
              : isFutureSlot
              ? 'upcoming'
              : 'pending';
            const canConfirm = isToday && !isConsumed && !isFutureSlot;

            return (
              <div
                key={`${slot.time}-${index}`}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border px-4 py-3 gap-2 transition',
                  status === 'completed' && 'bg-muted/60',
                  status === 'current' && 'border-primary bg-primary/10 shadow-sm',
                  status === 'upcoming' && index === upcomingIndex && selectedDate === today && 'border-primary/60'
                )}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-semibold tabular-nums">{slot.time}</p>
                    <Badge variant={status === 'completed' ? 'outline' : 'default'}>
                      {slot.amount} ml
                    </Badge>
                  </div>
                  <p className="font-medium mt-2">{slot.title}</p>
                  <p className="text-sm text-muted-foreground">{slot.note}</p>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {isConsumed
                      ? 'Đã uống'
                      : isFutureSlot
                      ? 'Chưa đến giờ'
                      : isToday
                      ? 'Đang chờ xác nhận'
                      : 'Đã bỏ lỡ'}
                  </span>
                  {canConfirm && (
                    <Button size="sm" variant="outline" onClick={() => handleConfirm(index)}>
                      Xác nhận
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Tổng quan</CardTitle>
            <CardDescription>
              Tình trạng uống nước trong ngày {formatDateLabel(selectedDate)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Lượng nước mục tiêu</span>
              <span className="font-semibold">{totalDailyIntake} ml</span>
            </div>
            <div className="overflow-hidden rounded-full bg-muted">
              <div
                className="h-2 bg-primary transition-all"
                style={{
                  width: `${Math.min(
                    (consumedAmount /
                      Math.max(schedule.reduce((sum, slot) => sum + slot.amount, 0), 1)) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Đã uống: {consumedAmount} ml</span>
              <span>
                Còn lại: {Math.max(totalDailyIntake - consumedAmount, 0)} ml
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mẹo nhỏ</CardTitle>
            <CardDescription>Gợi ý giúp duy trì thói quen uống nước đều đặn.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>Ưu tiên nước lọc, có thể thêm vài lát chanh hoặc bạc hà.</li>
              <li>Chuẩn bị bình nước 500ml để dễ theo dõi số lần uống.</li>
              <li>Hạn chế uống quá nhiều gần giờ ngủ để tránh mất ngủ.</li>
              <li>Điều chỉnh lượng nước theo nhu cầu (tập luyện, thời tiết, cân nặng).</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const reportContent = (
    <Card>
      <CardHeader>
        <CardTitle>Báo cáo 7 ngày gần nhất</CardTitle>
        <CardDescription>Thống kê lượng nước đã uống theo ngày.</CardDescription>
      </CardHeader>
      <CardContent>
        {isReportLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
        ) : reportData.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
        ) : (
          <div className="space-y-3">
            {reportData.map((row) => (
              <div
                key={row.date}
                className="flex items-center justify-between rounded-lg border px-4 py-2"
              >
                <div>
                  <p className="font-medium">{formatDateLabel(row.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.slots_completed} / {schedule.length} khung giờ
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{row.total} ml</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">Lịch uống</TabsTrigger>
          <TabsTrigger value="report">Báo cáo</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule">{scheduleContent}</TabsContent>
        <TabsContent value="report">{reportContent}</TabsContent>
      </Tabs>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đừng quên uống nước!</DialogTitle>
            <DialogDescription>
              {activeSlot
                ? `Khung giờ ${activeSlot.time} - ${activeSlot.title}. Vui lòng xác nhận bạn đã uống ${activeSlot.amount} ml nước.`
                : 'Vui lòng xác nhận bạn đã uống nước trong khung giờ hiện tại.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Để sau
            </Button>
            <Button
              onClick={() => {
                if (pendingSlotIndex != null) {
                  handleConfirm(pendingSlotIndex);
                  setShowConfirmDialog(false);
                }
              }}
            >
              Xác nhận đã uống
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
