'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  startTransition,
} from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Settings,
  PictureInPicture2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

type SessionType = 'work' | 'break';

export default function PomodoroTimer() {
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [timeLeft, setTimeLeft] = useState(workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>('work');
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [showSettings, setShowSettings] = useState(false);
  const [focusMusicUrl, setFocusMusicUrl] = useState('');
  const [breakMusicUrl, setBreakMusicUrl] = useState('');
  const STORAGE_KEY = 'pomodoroTimerState';

  const musicSuggestions = [
    {
      title: 'Âm Thầm Bên Em',
      url: 'https://nhac.losslesspro.com/nhac/1S6pwjuj6NIxcdHJ8dSoSM_zE2y1v1Esb',
    },
    {
      title: 'Buông Đôi Tay Nhau Ra',
      url: 'https://nhac.losslesspro.com/nhac/1vRT1kTeCMzy1OLwPYwMlLDNgW_wjcVU-',
    },
    {
      title: 'Thái Bình Mồ Hôi Rơi',
      url: 'https://nhac.losslesspro.com/nhac/17NLeWErDQ6fvpdOwRZRLVKqeFQel7LWM',
    },
  ];

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const [isPipOpen, setIsPipOpen] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [pipError, setPipError] = useState<string | null>(null);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Create notification beep sound using Web Audio API
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Higher pitch for work completion
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Create ambient background music using Web Audio API
  // Initialize audio
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.loop = true;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  // Restore saved state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);

      startTransition(() => {
        if (typeof parsed.workMinutes === 'number') {
          setWorkMinutes(parsed.workMinutes);
        }
        if (typeof parsed.breakMinutes === 'number') {
          setBreakMinutes(parsed.breakMinutes);
        }
        if (parsed.sessionType === 'work' || parsed.sessionType === 'break') {
          setSessionType(parsed.sessionType);
        }
        if (typeof parsed.focusMusicUrl === 'string') {
          setFocusMusicUrl(parsed.focusMusicUrl);
        }
        if (typeof parsed.breakMusicUrl === 'string') {
          setBreakMusicUrl(parsed.breakMusicUrl);
        }
        if (typeof parsed.isMusicEnabled === 'boolean') {
          setIsMusicEnabled(parsed.isMusicEnabled);
        }

        if (typeof parsed.timeLeft === 'number') {
          let adjustedTimeLeft = parsed.timeLeft;
          if (parsed.isRunning && typeof parsed.timestamp === 'number') {
            const elapsed = Math.floor((Date.now() - parsed.timestamp) / 1000);
            adjustedTimeLeft = Math.max(parsed.timeLeft - elapsed, 0);
          }
          setTimeLeft(adjustedTimeLeft);
          setIsRunning(parsed.isRunning && adjustedTimeLeft > 0);
        }
      });
    } catch (error) {
      console.error('Error restoring Pomodoro state:', error);
    }
  }, []);

  // Persist state
  const persistTimerState = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          workMinutes,
          breakMinutes,
          sessionType,
          isRunning,
          timeLeft,
          focusMusicUrl,
          breakMusicUrl,
          isMusicEnabled,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('Error saving Pomodoro state:', error);
    }
  }, [
    workMinutes,
    breakMinutes,
    sessionType,
    isRunning,
    timeLeft,
    focusMusicUrl,
    breakMusicUrl,
    isMusicEnabled,
  ]);

  useEffect(() => {
    persistTimerState();
  }, [persistTimerState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => persistTimerState();
    window.addEventListener('beforeunload', handler);
    document.addEventListener('visibilitychange', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      document.removeEventListener('visibilitychange', handler);
    };
  }, [persistTimerState]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPipSupported(true);
    }
  }, []);

  // Update audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);

    // Play notification sound
    playNotificationSound();

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const message =
        sessionType === 'work'
          ? 'Phiên làm việc hoàn thành! Đến lúc nghỉ giải lao! 🎉'
          : 'Thời gian nghỉ đã hết! Sẵn sàng làm việc? 💪';
      new Notification('Bộ đếm thời gian Pomodoro', { body: message });
    }

    // Switch session type
    const nextType: SessionType = sessionType === 'work' ? 'break' : 'work';
    setSessionType(nextType);
    const nextMinutes = nextType === 'work' ? workMinutes : breakMinutes;
    setTimeLeft(nextMinutes * 60);
  }, [sessionType, workMinutes, breakMinutes]);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [handleTimerComplete, isRunning, timeLeft]);

  // Play music based on session type
  useEffect(() => {
    if (!audioRef.current) return;

    if (isRunning && isMusicEnabled) {
      const musicUrl = sessionType === 'work' ? focusMusicUrl : breakMusicUrl;

      if (musicUrl) {
        if (audioRef.current.src !== musicUrl) {
          audioRef.current.src = musicUrl;
        }

        audioRef.current.play().catch((error) => {
          console.error('Error playing music:', error);
        });
      } else {
        audioRef.current.pause();
      }
    } else {
      audioRef.current.pause();
    }
  }, [breakMusicUrl, focusMusicUrl, isMusicEnabled, isRunning, sessionType]);

  const handleStart = () => {
    setIsRunning(true);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    const minutes = sessionType === 'work' ? workMinutes : breakMinutes;
    setTimeLeft(minutes * 60);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      setIsPipOpen(false);
    }
  };

  const handleSessionTypeChange = (type: SessionType) => {
    if (isRunning) return; // Don't allow change while running

    setSessionType(type);
    const minutes = type === 'work' ? workMinutes : breakMinutes;
    setTimeLeft(minutes * 60);
  };

  const progress =
    sessionType === 'work'
      ? ((workMinutes * 60 - timeLeft) / (workMinutes * 60)) * 100
      : ((breakMinutes * 60 - timeLeft) / (breakMinutes * 60)) * 100;

  const updatePipWindow = useCallback(() => {
    const pipWindow = pipWindowRef.current;
    if (!pipWindow || pipWindow.closed) {
      return;
    }
    const doc = pipWindow.document;
    doc.body.innerHTML = `
      <style>
        body {
          margin: 0;
          background: #0f172a;
          color: #e2e8f0;
          font-family: 'Geist', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 8px;
        }
        .time {
          font-size: 64px;
          font-weight: 700;
          letter-spacing: 2px;
          color: ${sessionType === 'work' ? '#22d3ee' : '#fb7185'};
        }
        .status {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #94a3b8;
        }
        .state {
          font-size: 12px;
          color: #cbd5f5;
        }
      </style>
      <div class="time">${formatTime(timeLeft)}</div>
      <div class="status">${sessionType === 'work' ? 'Làm việc' : 'Nghỉ ngơi'}</div>
      <div class="state">${isRunning ? 'Đang chạy' : 'Đã tạm dừng'}</div>
    `;
  }, [formatTime, isRunning, sessionType, timeLeft]);

  useEffect(() => {
    updatePipWindow();
  }, [updatePipWindow]);

  useEffect(() => {
    return () => {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
        pipWindowRef.current = null;
      }
    };
  }, []);

  const handleTogglePictureInPicture = async () => {
    setPipError(null);
    if (!(window as any).documentPictureInPicture) {
      setPipError('Trình duyệt không hỗ trợ Picture-in-Picture');
      return;
    }

    try {
      const existingWindow = pipWindowRef.current;
      if (existingWindow && !existingWindow.closed) {
        existingWindow.close();
        pipWindowRef.current = null;
        setIsPipOpen(false);
        return;
      }

      const pip = await (window as any).documentPictureInPicture.requestWindow({
        width: 300,
        height: 200,
      });

      pip.document.title = 'Pomodoro';
      pipWindowRef.current = pip;
      setIsPipOpen(true);
      updatePipWindow();

      pip.addEventListener('pagehide', () => {
        pipWindowRef.current = null;
        setIsPipOpen(false);
      });
    } catch (error: any) {
      console.error('Error opening PiP:', error);
      setPipError(error.message || 'Không thể bật Picture-in-Picture');
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold">
                  Bộ đếm thời gian Pomodoro
                </CardTitle>
                <CardDescription>
                  Tập trung vào công việc, nghỉ giải lao và duy trì năng suất
                </CardDescription>
              </div>
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cài đặt</DialogTitle>
                    <DialogDescription>
                      Tùy chỉnh bộ đếm thời gian Pomodoro
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="work-minutes">
                        Thời gian làm việc (phút)
                      </Label>
                      <Input
                        id="work-minutes"
                        type="number"
                        min="1"
                        max="60"
                        value={workMinutes}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          setWorkMinutes(value);
                          if (sessionType === 'work' && !isRunning) {
                            setTimeLeft(value * 60);
                          }
                        }}
                        disabled={isRunning}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="break-minutes">
                        Thời gian nghỉ (phút)
                      </Label>
                      <Input
                        id="break-minutes"
                        type="number"
                        min="1"
                        max="30"
                        value={breakMinutes}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          setBreakMinutes(value);
                          if (sessionType === 'break' && !isRunning) {
                            setTimeLeft(value * 60);
                          }
                        }}
                        disabled={isRunning}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="music-enabled">Nhạc nền</Label>
                      <Switch
                        id="music-enabled"
                        checked={isMusicEnabled}
                        onCheckedChange={setIsMusicEnabled}
                      />
                    </div>
                    {isMusicEnabled && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="focus-music">
                            URL nhạc tập trung (Phiên làm việc)
                          </Label>
                          <Input
                            id="focus-music"
                            type="url"
                            placeholder="https://example.com/focus-music.mp3"
                            value={focusMusicUrl}
                            onChange={(e) => setFocusMusicUrl(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Nhập URL file âm thanh trực tiếp (MP3, OGG, v.v.).
                            Để trống để sử dụng nhạc ambient.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="break-music">
                            URL nhạc nghỉ giải lao
                          </Label>
                          <Input
                            id="break-music"
                            type="url"
                            placeholder="https://example.com/relax-music.mp3"
                            value={breakMusicUrl}
                            onChange={(e) => setBreakMusicUrl(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Nhập URL file âm thanh trực tiếp cho thời gian nghỉ.
                            Để trống để sử dụng nhạc ambient.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="music-volume">Âm lượng nhạc</Label>
                          <Input
                            id="music-volume"
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={musicVolume}
                            onChange={(e) =>
                              setMusicVolume(parseFloat(e.target.value))
                            }
                          />
                          <div className="text-xs text-muted-foreground">
                            {Math.round(musicVolume * 100)}%
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Gợi ý nhạc</Label>
                          <div className="flex flex-col gap-2">
                            {musicSuggestions.map((suggestion) => (
                              <div
                                key={suggestion.url}
                                className="rounded-md border p-3 text-xs space-y-2"
                              >
                                <p className="font-medium">
                                  {suggestion.title}
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                    onClick={() =>
                                      setFocusMusicUrl(suggestion.url)
                                    }
                                  >
                                    Dùng cho làm việc
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                    onClick={() =>
                                      setBreakMusicUrl(suggestion.url)
                                    }
                                  >
                                    Dùng cho nghỉ ngơi
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Session Type Toggle */}
            <div className="flex gap-2 justify-center">
              <Button
                variant={sessionType === 'work' ? 'default' : 'outline'}
                onClick={() => handleSessionTypeChange('work')}
                disabled={isRunning}
                className="flex-1"
              >
                Làm việc
              </Button>
              <Button
                variant={sessionType === 'break' ? 'default' : 'outline'}
                onClick={() => handleSessionTypeChange('break')}
                disabled={isRunning}
                className="flex-1"
              >
                Nghỉ giải lao
              </Button>
            </div>

            {/* Timer Display */}
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <div
                  className="text-8xl font-mono font-bold"
                  style={{
                    color:
                      sessionType === 'work'
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--destructive))',
                  }}
                >
                  {formatTime(timeLeft)}
                </div>
                {/* Progress Ring */}
                <svg
                  className="absolute inset-0 -z-10 transform -rotate-90"
                  width="200"
                  height="200"
                  viewBox="0 0 200 200"
                >
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted opacity-20"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 90}`}
                    strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                    className="transition-all duration-1000"
                    style={{
                      color:
                        sessionType === 'work'
                          ? 'hsl(var(--primary))'
                          : 'hsl(var(--destructive))',
                    }}
                  />
                </svg>
              </div>
              <div className="text-sm text-muted-foreground">
                {sessionType === 'work'
                  ? 'Thời gian tập trung'
                  : 'Thời gian thư giãn'}
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3 justify-center">
              {!isRunning ? (
                <Button
                  onClick={handleStart}
                  size="lg"
                  className="flex items-center gap-2 min-w-[130px]"
                >
                  <Play className="h-5 w-5" />
                  Bắt đầu
                </Button>
              ) : (
                <Button
                  onClick={handlePause}
                  size="lg"
                  variant="outline"
                  className="flex items-center gap-2 min-w-[130px]"
                >
                  <Pause className="h-5 w-5" />
                  Tạm dừng
                </Button>
              )}
              <Button
                onClick={handleReset}
                size="lg"
                variant="outline"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-5 w-5" />
                Đặt lại
              </Button>
              {pipSupported && (
                <Button
                  onClick={handleTogglePictureInPicture}
                  size="lg"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <PictureInPicture2 className="h-5 w-5" />
                  {isPipOpen ? 'Tắt PiP' : 'Bật PiP'}
                </Button>
              )}
            </div>

            {pipError && (
              <p className="text-xs text-destructive text-center">{pipError}</p>
            )}

            {/* Music Control */}
            <div className="flex items-center justify-center gap-2 pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMusicEnabled(!isMusicEnabled)}
                className="flex items-center gap-2"
              >
                {isMusicEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                <span className="text-sm">
                  {isMusicEnabled ? 'Bật nhạc' : 'Tắt nhạc'}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Về kỹ thuật Pomodoro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Kỹ thuật Pomodoro là một phương pháp quản lý thời gian sử dụng bộ
              đếm thời gian để chia công việc thành các khoảng thời gian, thường
              là 25 phút, được ngăn cách bởi các khoảng nghỉ ngắn.
            </p>
            <p>
              <strong>Cách hoạt động:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Đặt bộ đếm thời gian 25 phút (phiên làm việc)</li>
              <li>Tập trung vào nhiệm vụ cho đến khi bộ đếm thời gian kêu</li>
              <li>Nghỉ giải lao 5 phút</li>
              <li>Lặp lại chu kỳ</li>
              <li>Sau 4 phiên làm việc, nghỉ giải lao dài hơn (15-30 phút)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
