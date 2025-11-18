'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Settings } from 'lucide-react';
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

interface PomodoroTimerProps {}

export default function PomodoroTimer({}: PomodoroTimerProps) {
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
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientAudioContextRef = useRef<AudioContext | null>(null);
  const ambientOscillatorsRef = useRef<OscillatorNode[]>([]);

  // Create notification beep sound using Web Audio API
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Higher pitch for work completion
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Create ambient background music using Web Audio API
  const createAmbientMusic = (type: 'work' | 'break') => {
    try {
      // Clean up existing oscillators
      stopAmbientMusic();

      if (!ambientAudioContextRef.current) {
        ambientAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = ambientAudioContextRef.current;
      const oscillators: OscillatorNode[] = [];

      if (type === 'work') {
        // Focus music: low frequency ambient tones
        const frequencies = [220, 330, 440]; // A3, E4, A4
        frequencies.forEach((freq, index) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          const lfo = audioContext.createOscillator(); // Low frequency oscillator for subtle variation
          const lfoGain = audioContext.createGain();

          oscillator.type = 'sine';
          oscillator.frequency.value = freq;
          lfo.type = 'sine';
          lfo.frequency.value = 0.1 + index * 0.05; // Very slow modulation

          lfoGain.gain.value = freq * 0.02; // Small frequency variation
          lfo.connect(lfoGain);
          lfoGain.connect(oscillator.frequency);

          gainNode.gain.value = musicVolume * 0.15 * (1 - index * 0.2); // Lower volume for higher frequencies

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.start();
          lfo.start();
          oscillators.push(oscillator);
        });
      } else {
        // Break music: softer, more relaxing tones
        const frequencies = [196, 294, 392]; // G3, D4, G4
        frequencies.forEach((freq, index) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          const lfo = audioContext.createOscillator();
          const lfoGain = audioContext.createGain();

          oscillator.type = 'triangle'; // Softer than sine
          oscillator.frequency.value = freq;
          lfo.type = 'sine';
          lfo.frequency.value = 0.08 + index * 0.03;

          lfoGain.gain.value = freq * 0.015;
          lfo.connect(lfoGain);
          lfoGain.connect(oscillator.frequency);

          gainNode.gain.value = musicVolume * 0.12 * (1 - index * 0.15);

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.start();
          lfo.start();
          oscillators.push(oscillator);
        });
      }

      ambientOscillatorsRef.current = oscillators;
    } catch (error) {
      console.error('Error creating ambient music:', error);
    }
  };

  const stopAmbientMusic = () => {
    ambientOscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {
        // Oscillator might already be stopped
      }
    });
    ambientOscillatorsRef.current = [];
  };

  // Initialize audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.volume = musicVolume;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // Clean up ambient music
      ambientOscillatorsRef.current.forEach((osc) => {
        try {
          osc.stop();
        } catch (e) {
          // Oscillator might already be stopped
        }
      });
      ambientOscillatorsRef.current = [];
      if (ambientAudioContextRef.current) {
        ambientAudioContextRef.current.close();
        ambientAudioContextRef.current = null;
      }
    };
  }, []);

  // Update audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

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
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  // Play music based on session type
  useEffect(() => {
    if (isRunning && isMusicEnabled) {
      const musicUrl = sessionType === 'work' ? focusMusicUrl : breakMusicUrl;
      
      // If custom music URL is provided, use it
      if (musicUrl && audioRef.current) {
        if (audioRef.current.src !== musicUrl) {
          audioRef.current.src = musicUrl;
        }
        
        // Stop ambient music when using custom URL
        stopAmbientMusic();
        
        audioRef.current.play().catch((error) => {
          console.error('Error playing music:', error);
          // Fallback to ambient music if URL fails
          createAmbientMusic(sessionType);
        });
      } else {
        // Use ambient music if no URL is provided
        if (audioRef.current) {
          audioRef.current.pause();
        }
        createAmbientMusic(sessionType);
      }
    } else {
      // Stop all music
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopAmbientMusic();
    }

    return () => {
      stopAmbientMusic();
    };
  }, [isRunning, sessionType, isMusicEnabled, focusMusicUrl, breakMusicUrl, musicVolume]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    // Play notification sound
    playNotificationSound();

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const message = sessionType === 'work' 
        ? 'Phiên làm việc hoàn thành! Đến lúc nghỉ giải lao! 🎉'
        : 'Thời gian nghỉ đã hết! Sẵn sàng làm việc? 💪';
      new Notification('Bộ đếm thời gian Pomodoro', { body: message });
    }

    // Switch session type
    const nextType: SessionType = sessionType === 'work' ? 'break' : 'work';
    setSessionType(nextType);
    const nextMinutes = nextType === 'work' ? workMinutes : breakMinutes;
    setTimeLeft(nextMinutes * 60);
  };

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
  };

  const handleSessionTypeChange = (type: SessionType) => {
    if (isRunning) return; // Don't allow change while running
    
    setSessionType(type);
    const minutes = type === 'work' ? workMinutes : breakMinutes;
    setTimeLeft(minutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = sessionType === 'work'
    ? ((workMinutes * 60 - timeLeft) / (workMinutes * 60)) * 100
    : ((breakMinutes * 60 - timeLeft) / (breakMinutes * 60)) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">Bộ đếm thời gian Pomodoro</CardTitle>
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
                    <Label htmlFor="work-minutes">Thời gian làm việc (phút)</Label>
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
                    <Label htmlFor="break-minutes">Thời gian nghỉ (phút)</Label>
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
                        <Label htmlFor="focus-music">URL nhạc tập trung (Phiên làm việc)</Label>
                        <Input
                          id="focus-music"
                          type="url"
                          placeholder="https://example.com/focus-music.mp3"
                          value={focusMusicUrl}
                          onChange={(e) => setFocusMusicUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Nhập URL file âm thanh trực tiếp (MP3, OGG, v.v.). Để trống để sử dụng nhạc ambient.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="break-music">URL nhạc nghỉ giải lao</Label>
                        <Input
                          id="break-music"
                          type="url"
                          placeholder="https://example.com/relax-music.mp3"
                          value={breakMusicUrl}
                          onChange={(e) => setBreakMusicUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Nhập URL file âm thanh trực tiếp cho thời gian nghỉ. Để trống để sử dụng nhạc ambient.
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
                          onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                        />
                        <div className="text-xs text-muted-foreground">
                          {Math.round(musicVolume * 100)}%
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
                  color: sessionType === 'work' ? 'hsl(var(--primary))' : 'hsl(var(--destructive))',
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
                    color: sessionType === 'work' 
                      ? 'hsl(var(--primary))' 
                      : 'hsl(var(--destructive))',
                  }}
                />
              </svg>
            </div>
            <div className="text-sm text-muted-foreground">
              {sessionType === 'work' ? 'Thời gian tập trung' : 'Thời gian thư giãn'}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3 justify-center">
            {!isRunning ? (
              <Button
                onClick={handleStart}
                size="lg"
                className="flex items-center gap-2"
              >
                <Play className="h-5 w-5" />
                Bắt đầu
              </Button>
            ) : (
              <Button
                onClick={handlePause}
                size="lg"
                variant="outline"
                className="flex items-center gap-2"
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
          </div>

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
            Kỹ thuật Pomodoro là một phương pháp quản lý thời gian sử dụng bộ đếm thời gian để chia công việc thành các khoảng thời gian,
            thường là 25 phút, được ngăn cách bởi các khoảng nghỉ ngắn.
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
  );
}

