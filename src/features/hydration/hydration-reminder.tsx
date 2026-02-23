'use client';

import { Badge } from '@/src/shared/components/ui/badge';
import { Button } from '@/src/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/shared/components/ui/dialog';
import { Input } from '@/src/shared/components/ui/input';
import { Label } from '@/src/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/components/ui/select';
import { Switch } from '@/src/shared/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/src/shared/components/ui/tabs';
import { cn } from '@/src/shared/lib/utils';
import { Bell, BellOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

const activityMultipliers: Record<string, number> = {
  sedentary: 1.0,
  light: 1.1,
  moderate: 1.2,
  active: 1.35,
  very_active: 1.5,
};

const climateBonus: Record<string, number> = {
  normal: 0,
  hot: 300,
  very_hot: 500,
};

// Adjust ml/kg based on BMI to avoid over-estimating for overweight individuals
function getMlPerKg(weight: number, heightCm?: number): number {
  if (!heightCm || heightCm <= 0) return 35;
  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  if (bmi < 18.5) return 40;   // underweight — higher need
  if (bmi < 25) return 35;     // normal
  if (bmi < 30) return 30;     // overweight — use lean mass estimate
  return 25;                   // obese
}

const MAX_ML_PER_SLOT = 300;  // Health-safe limit per drinking session (>300ml at once can cause digestive discomfort)
const WARN_ML_PER_SLOT = 250; // Soft warning threshold

/**
 * Distribute targetMl across slots proportionally, capped at maxPerSlot.
 * Excess from capped slots is redistributed to uncapped slots iteratively.
 */
function smartDistribute(
  slots: HydrationSlot[],
  targetMl: number,
  maxPerSlot: number = MAX_ML_PER_SLOT
): { amounts: number[]; achieved: number } {
  const weights = slots.map((s) => s.amount);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return { amounts: slots.map(() => 0), achieved: 0 };

  let amounts = weights.map((w) => (w / totalWeight) * targetMl);

  // Iteratively redistribute excess from capped slots to uncapped ones
  for (let iter = 0; iter < 20; iter++) {
    const capped = amounts.map((a) => Math.min(a, maxPerSlot));
    const totalCapped = capped.reduce((a, b) => a + b, 0);
    const remaining = targetMl - totalCapped;
    if (remaining <= 0.5) { amounts = capped; break; }

    const expandableWeights = amounts.map((a, i) => (a < maxPerSlot - 0.5 ? weights[i] : 0));
    const totalExpandable = expandableWeights.reduce((a, b) => a + b, 0);
    if (totalExpandable === 0) { amounts = capped; break; }

    amounts = capped.map((a, i) =>
      a + (expandableWeights[i] / totalExpandable) * remaining
    );
  }

  const rounded = amounts.map((a) => Math.max(50, Math.round(a / 10) * 10));
  return { amounts: rounded, achieved: rounded.reduce((a, b) => a + b, 0) };
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Auto-add slots into the largest time gaps until we have enough slots
 * to fit targetMl (with maxPerSlot per slot). New slots are inserted at
 * the midpoint of the largest gap, rounded to the nearest 5 minutes.
 * Minimum gap required to split: 40 minutes.
 */
function autoAddSlots(
  currentSlots: HydrationSlot[],
  targetMl: number,
  maxPerSlot: number = MAX_ML_PER_SLOT
): { slots: HydrationSlot[]; added: number } {
  const neededSlots = Math.ceil(targetMl / maxPerSlot);
  const extraNeeded = neededSlots - currentSlots.length;
  if (extraNeeded <= 0) return { slots: currentSlots, added: 0 };

  let result = [...currentSlots].sort(
    (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
  );

  let added = 0;
  for (let i = 0; i < extraNeeded; i++) {
    // Find the largest splittable gap (>= 40 min)
    let maxGap = 39;
    let insertAfterIdx = -1;
    for (let j = 0; j < result.length - 1; j++) {
      const gap =
        parseTimeToMinutes(result[j + 1].time) - parseTimeToMinutes(result[j].time);
      if (gap > maxGap) { maxGap = gap; insertAfterIdx = j; }
    }
    if (insertAfterIdx === -1) break; // no splittable gap left

    const startMin = parseTimeToMinutes(result[insertAfterIdx].time);
    const endMin = parseTimeToMinutes(result[insertAfterIdx + 1].time);
    // Round midpoint to nearest 5 min
    const midMin = Math.round((startMin + endMin) / 2 / 5) * 5;

    result = [
      ...result.slice(0, insertAfterIdx + 1),
      {
        time: minutesToTime(midMin),
        amount: maxPerSlot,
        title: 'Bổ sung',
        note: 'Khung giờ bổ sung để đạt lượng nước khuyến nghị.',
      },
      ...result.slice(insertAfterIdx + 1),
    ];
    added++;
  }

  return { slots: result, added };
}

function calculateWaterIntake(
  weight: number,
  activity: string,
  climate: string,
  heightCm?: number
): number {
  const mlPerKg = getMlPerKg(weight, heightCm);
  const base = weight * mlPerKg * (activityMultipliers[activity] ?? 1.0);
  const total = base + (climateBonus[climate] ?? 0);
  return Math.round(total / 50) * 50;
}

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
  const browserNotifiedRef = useRef<Set<string>>(new Set());

  // ── Settings state ──
  const [settingsWeight, setSettingsWeight] = useState('');
  const [settingsHeight, setSettingsHeight] = useState('');
  const [settingsActivity, setSettingsActivity] = useState('sedentary');
  const [settingsClimate, setSettingsClimate] = useState('normal');
  const [recommendedMl, setRecommendedMl] = useState<number | null>(null);
  const [editableSchedule, setEditableSchedule] =
    useState<HydrationSlot[]>(defaultSchedule);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleSaveMsg, setScheduleSaveMsg] = useState<string | null>(null);

  // ── Browser Notification permission ──
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotifPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  }, []);

  const sendBrowserNotification = useCallback(
    (title: string, body: string, tag: string) => {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      try {
        const n = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag,
          renotify: true,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch {
        // Notification API not available (e.g. HTTP context)
      }
    },
    []
  );

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

  const fetchLogs = useCallback(async (date: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/hydration/logs?date=${date}`);
      if (!res.ok) throw new Error('Failed to fetch hydration logs');
      const data = await res.json();
      const fetchedSchedule = data.schedule ?? defaultSchedule;
      setSchedule(fetchedSchedule);
      setConsumedSlots(
        Array.isArray(data.logs)
          ? data.logs.map((log: { slot_index: number }) => log.slot_index)
          : []
      );
      setIsReminderActive(Boolean(data.settings?.is_active));
      // Load saved body metrics
      if (data.settings?.weight) {
        setSettingsWeight(String(data.settings.weight));
      }
      if (data.settings?.activity_level) {
        setSettingsActivity(data.settings.activity_level);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(selectedDate);
  }, [fetchLogs, selectedDate]);

  useEffect(() => {
    overdueNotifiedRef.current.clear();
    browserNotifiedRef.current.clear();
  }, [selectedDate]);

  // Sync editable schedule when user opens settings tab
  useEffect(() => {
    if (activeTab === 'settings') {
      setEditableSchedule(schedule.map((s) => ({ ...s })));
      setScheduleSaveMsg(null);
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (consumedSlots.includes(slotIndex)) return;
      const key = `${selectedDate}-${slotIndex}`;
      if (overdueNotifiedRef.current.has(key)) return;
      overdueNotifiedRef.current.add(key);

      // Browser notification (works when user is on another tab)
      sendBrowserNotification(
        '⚠️ Bỏ lỡ khung giờ uống nước!',
        `${slot.time} – ${slot.title} (${slot.amount} ml)`,
        `hydration-overdue-${slotIndex}`
      );

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
    [consumedSlots, schedule, selectedDate, sendBrowserNotification]
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
      index =
        currentMinutes < parseTimeToMinutes(schedule[0].time)
          ? 0
          : schedule.length - 1;
    }
    return index;
  }, [currentMinutes, schedule]);

  const upcomingIndex = useMemo(() => {
    const idx = schedule.findIndex(
      (slot) => parseTimeToMinutes(slot.time) > currentMinutes
    );
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
        overdueNotifiedRef.current.delete(`${selectedDate}-${index}`);
        if (pendingSlotIndex === index) {
          setPendingSlotIndex(null);
          setShowConfirmDialog(false);
        }
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'clear_by_metadata',
            type: 'hydration_overdue',
            metadata: { date: selectedDate, slot_index: index },
          }),
        });
      } catch (error) {
        console.error(error);
      }
    },
    [consumedSlots, dayRelation.isToday, pendingSlotIndex, selectedDate]
  );

  const handleToggleReminder = useCallback(async (value: boolean) => {
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
  }, []);

  const handleCalculate = useCallback(() => {
    const w = parseFloat(settingsWeight);
    if (!settingsWeight || isNaN(w) || w < 20 || w > 300) return;
    const h = settingsHeight ? parseFloat(settingsHeight) : undefined;
    setRecommendedMl(calculateWaterIntake(w, settingsActivity, settingsClimate, h));
  }, [settingsActivity, settingsClimate, settingsHeight, settingsWeight]);

  const handleDistributeToSchedule = useCallback(() => {
    if (!recommendedMl) return;

    // 1. Auto-add slots if current schedule can't fit the target
    const { slots: adjustedSlots, added } = autoAddSlots(editableSchedule, recommendedMl);

    // 2. Distribute the target across the (possibly expanded) slot list
    const { amounts, achieved } = smartDistribute(adjustedSlots, recommendedMl);
    const updated = adjustedSlots.map((slot, i) => ({ ...slot, amount: amounts[i] }));
    setEditableSchedule(updated);

    const shortfall = recommendedMl - achieved;
    let msg = `Đã phân bổ ${achieved.toLocaleString()} ml`;
    if (added > 0) msg += ` (thêm ${added} khung giờ mới)`;
    if (shortfall > 50) msg += ` — còn thiếu ${shortfall.toLocaleString()} ml do không còn khoảng trống`;
    msg += `. Nhấn "Lưu lịch" để áp dụng.`;
    setScheduleSaveMsg(msg);
  }, [editableSchedule, recommendedMl]);

  const handleSaveSchedule = useCallback(async () => {
    setIsSavingSchedule(true);
    setScheduleSaveMsg(null);
    try {
      const weight = settingsWeight ? parseFloat(settingsWeight) : null;
      const res = await fetch('/api/hydration/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_schedule: editableSchedule,
          weight: weight && !isNaN(weight) ? weight : null,
          activity_level: settingsActivity,
        }),
      });
      if (!res.ok) throw new Error('Failed to save schedule');
      setSchedule(editableSchedule.map((s) => ({ ...s })));
      setScheduleSaveMsg('Đã lưu lịch thành công!');
    } catch {
      setScheduleSaveMsg('Lưu thất bại, vui lòng thử lại.');
    } finally {
      setIsSavingSchedule(false);
    }
  }, [editableSchedule, settingsActivity, settingsWeight]);

  const handleResetSchedule = useCallback(() => {
    setEditableSchedule(defaultSchedule.map((s) => ({ ...s })));
    setScheduleSaveMsg(null);
  }, []);

  const playReminderSound = useCallback(() => {
    try {
      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = 660;
      gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.3,
        audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 1
      );
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

      // Browser notification — send once per slot per day
      const notifKey = `${selectedDate}-${currentSlotIndex}-triggered`;
      if (!browserNotifiedRef.current.has(notifKey)) {
        browserNotifiedRef.current.add(notifKey);
        sendBrowserNotification(
          '💧 Đến giờ uống nước!',
          `${slot.time} – ${slot.title} (${slot.amount} ml)`,
          `hydration-due-${currentSlotIndex}`
        );
      }
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
    selectedDate,
    sendBrowserNotification,
  ]);

  useEffect(() => {
    if (showConfirmDialog && isReminderActive) {
      playReminderSound();
    }
  }, [showConfirmDialog, isReminderActive, playReminderSound]);

  const activeSlot =
    pendingSlotIndex != null ? schedule[pendingSlotIndex] : null;

  const scheduleContent = (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card className="col-span-1">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Lịch nhắc uống nước</CardTitle>
              <CardDescription>
                Dựa trên khuyến nghị ~2 lít nước / ngày, chia thành các thời
                điểm lý tưởng.
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
                <span className="text-xs text-muted-foreground">
                  Kích hoạt nhắc
                </span>
                <Switch
                  checked={isReminderActive}
                  onCheckedChange={handleToggleReminder}
                  disabled={selectedDate !== today}
                />
              </div>
              {isReminderActive && notifPermission !== 'granted' && (
                <Button
                  size="sm"
                  variant={notifPermission === 'denied' ? 'ghost' : 'outline'}
                  className="gap-1.5 text-xs"
                  onClick={requestNotifPermission}
                  disabled={notifPermission === 'denied'}
                  title={
                    notifPermission === 'denied'
                      ? 'Bạn đã chặn thông báo. Vui lòng bật lại trong cài đặt trình duyệt.'
                      : undefined
                  }
                >
                  {notifPermission === 'denied' ? (
                    <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Bell className="h-3.5 w-3.5" />
                  )}
                  {notifPermission === 'denied'
                    ? 'Thông báo bị chặn'
                    : 'Cho phép thông báo'}
                </Button>
              )}
              {isReminderActive && notifPermission === 'granted' && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Bell className="h-3.5 w-3.5" />
                  Thông báo bật
                </span>
              )}
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
                  status === 'current' &&
                    'border-primary bg-primary/10 shadow-sm',
                  status === 'upcoming' &&
                    index === upcomingIndex &&
                    selectedDate === today &&
                    'border-primary/60'
                )}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-semibold tabular-nums">
                      {slot.time}
                    </p>
                    <Badge
                      variant={status === 'completed' ? 'outline' : 'default'}
                    >
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConfirm(index)}
                    >
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
                      Math.max(
                        schedule.reduce((sum, slot) => sum + slot.amount, 0),
                        1
                      )) *
                      100,
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
            <CardDescription>
              Gợi ý giúp duy trì thói quen uống nước đều đặn.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>Ưu tiên nước lọc, có thể thêm vài lát chanh hoặc bạc hà.</li>
              <li>Chuẩn bị bình nước 500ml để dễ theo dõi số lần uống.</li>
              <li>Hạn chế uống quá nhiều gần giờ ngủ để tránh mất ngủ.</li>
              <li>
                Điều chỉnh lượng nước theo nhu cầu (tập luyện, thời tiết, cân
                nặng).
              </li>
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
        <CardDescription>
          Thống kê lượng nước đã uống theo ngày.
        </CardDescription>
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

  const editableTotal = editableSchedule.reduce((s, slot) => s + slot.amount, 0);

  const settingsContent = (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Calculator card */}
      <Card>
        <CardHeader>
          <CardTitle>Máy tính lượng nước</CardTitle>
          <CardDescription>
            Tính lượng nước tối thiểu dựa trên thể trạng và lối sống của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="weight-input">Cân nặng (kg)</Label>
              <Input
                id="weight-input"
                type="number"
                min={20}
                max={300}
                step={0.5}
                placeholder="Ví dụ: 65"
                value={settingsWeight}
                onChange={(e) => setSettingsWeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height-input">Chiều cao (cm)</Label>
              <Input
                id="height-input"
                type="number"
                min={100}
                max={250}
                step={1}
                placeholder="Ví dụ: 170"
                value={settingsHeight}
                onChange={(e) => setSettingsHeight(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mức độ hoạt động</Label>
            <Select value={settingsActivity} onValueChange={setSettingsActivity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Ít vận động (ngồi nhiều)</SelectItem>
                <SelectItem value="light">Nhẹ (đi bộ 1–3 ngày/tuần)</SelectItem>
                <SelectItem value="moderate">Vừa phải (3–5 ngày/tuần)</SelectItem>
                <SelectItem value="active">Tích cực (6–7 ngày/tuần)</SelectItem>
                <SelectItem value="very_active">Rất tích cực (tập nặng hàng ngày)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Khí hậu / Nhiệt độ</Label>
            <Select value={settingsClimate} onValueChange={setSettingsClimate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Bình thường (18–25°C)</SelectItem>
                <SelectItem value="hot">Nóng (25–35°C)</SelectItem>
                <SelectItem value="very_hot">Rất nóng (&gt;35°C)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" onClick={handleCalculate}>
            Tính toán
          </Button>

          {recommendedMl !== null && (() => {
            const currentTotal = editableSchedule.reduce((s, slot) => s + slot.amount, 0);
            const diff = recommendedMl - currentTotal;
            return (
              <div className="rounded-lg border bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Lịch hiện tại</span>
                  <span className="font-medium">{currentTotal.toLocaleString()} ml</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Khuyến nghị</span>
                  <span className="font-bold text-primary">{recommendedMl.toLocaleString()} ml</span>
                </div>
                {diff !== 0 && (
                  <div className="flex items-center justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground">Chênh lệch</span>
                    <span className={cn('font-semibold', diff > 0 ? 'text-blue-600' : 'text-orange-600')}>
                      {diff > 0 ? '+' : ''}{diff.toLocaleString()} ml
                      {' '}({diff > 0 ? 'cần uống thêm' : 'đang uống dư'})
                    </span>
                  </div>
                )}
                {settingsWeight && settingsHeight && (() => {
                  const w = parseFloat(settingsWeight);
                  const h = parseFloat(settingsHeight) / 100;
                  const bmi = w / (h * h);
                  const bmiLabel =
                    bmi < 18.5 ? 'Thiếu cân' :
                    bmi < 25   ? 'Bình thường' :
                    bmi < 30   ? 'Thừa cân' : 'Béo phì';
                  const mlPerKg = getMlPerKg(w, parseFloat(settingsHeight));
                  return (
                    <p className="text-xs text-muted-foreground">
                      BMI: {bmi.toFixed(1)} ({bmiLabel}) — áp dụng {mlPerKg} ml/kg
                    </p>
                  );
                })()}
                <p className="text-xs text-muted-foreground">
                  Công thức: cân nặng × ml/kg (theo BMI) × hệ số hoạt động + bonus nhiệt độ
                </p>
                {recommendedMl > editableSchedule.length * MAX_ML_PER_SLOT && (
                  <p className="text-xs text-blue-600">
                    ℹ️ Lịch hiện tại chứa tối đa {(editableSchedule.length * MAX_ML_PER_SLOT).toLocaleString()} ml.
                    Hệ thống sẽ tự thêm ~{Math.ceil((recommendedMl - editableSchedule.length * MAX_ML_PER_SLOT) / MAX_ML_PER_SLOT)} khung giờ
                    vào khoảng trống lớn nhất.
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={handleDistributeToSchedule}
                >
                  {diff === 0
                    ? 'Lịch đã phù hợp khuyến nghị'
                    : diff > 0
                      ? `Phân bổ thêm ${diff.toLocaleString()} ml vào lịch`
                      : `Giảm ${Math.abs(diff).toLocaleString()} ml trong lịch`}
                </Button>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Schedule editor card */}
      <Card>
        <CardHeader>
          <CardTitle>Chỉnh sửa lịch uống nước</CardTitle>
          <CardDescription>
            Điều chỉnh lượng nước cho từng khung giờ. Tổng:{' '}
            <span className="font-semibold text-foreground">
              {editableTotal.toLocaleString()} ml
            </span>
            {' '}· Khuyến nghị tối đa{' '}
            <span className="font-medium">{MAX_ML_PER_SLOT} ml/lần</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {editableSchedule.map((slot, index) => {
            const isOverMax = slot.amount > MAX_ML_PER_SLOT;
            const isOverWarn = slot.amount > WARN_ML_PER_SLOT;
            return (
              <div key={index} className="flex items-center gap-3">
                <span className="text-sm font-mono w-12 shrink-0 text-muted-foreground">
                  {slot.time}
                </span>
                <span className="text-sm flex-1 truncate">{slot.title}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Input
                    type="number"
                    min={50}
                    max={600}
                    step={10}
                    className={cn(
                      'w-20 text-right',
                      isOverMax && 'border-destructive text-destructive focus-visible:ring-destructive',
                      !isOverMax && isOverWarn && 'border-orange-400 text-orange-600 focus-visible:ring-orange-400'
                    )}
                    value={slot.amount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val)) return;
                      setEditableSchedule((prev) =>
                        prev.map((s, i) =>
                          i === index ? { ...s, amount: val } : s
                        )
                      );
                    }}
                  />
                  <span className={cn(
                    'text-xs w-5',
                    isOverMax ? 'text-destructive' : isOverWarn ? 'text-orange-500' : 'text-muted-foreground'
                  )}>ml</span>
                </div>
              </div>
            );
          })}
          {editableSchedule.some((s) => s.amount > MAX_ML_PER_SLOT) && (
            <p className="text-xs text-destructive pt-1">
              ⚠️ Một số khung giờ vượt {MAX_ML_PER_SLOT} ml — uống quá nhiều một lần có thể gây khó chịu dạ dày.
            </p>
          )}
          {!editableSchedule.some((s) => s.amount > MAX_ML_PER_SLOT) &&
           editableSchedule.some((s) => s.amount > WARN_ML_PER_SLOT) && (
            <p className="text-xs text-orange-500 pt-1">
              Một số khung giờ trên {WARN_ML_PER_SLOT} ml — lý tưởng nhất nên uống từng ngụm nhỏ.
            </p>
          )}

          {scheduleSaveMsg && (
            <p
              className={cn(
                'text-sm pt-1',
                scheduleSaveMsg.includes('Lưu thất bại')
                  ? 'text-destructive'
                  : scheduleSaveMsg.includes('thành công')
                    ? 'text-green-600'
                    : 'text-blue-600'
              )}
            >
              {scheduleSaveMsg}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleResetSchedule}
            >
              Đặt lại mặc định
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleSaveSchedule}
              disabled={isSavingSchedule}
            >
              {isSavingSchedule ? 'Đang lưu...' : 'Lưu lịch'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="schedule">Lịch uống</TabsTrigger>
          <TabsTrigger value="report">Báo cáo</TabsTrigger>
          <TabsTrigger value="settings">Cài đặt</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule">{scheduleContent}</TabsContent>
        <TabsContent value="report">{reportContent}</TabsContent>
        <TabsContent value="settings">{settingsContent}</TabsContent>
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
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
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
