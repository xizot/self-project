'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Download, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

type Platform = 'youtube' | 'tiktok' | 'facebook';
type Format = 'mp4' | 'mp3' | 'webm' | 'm4a';

interface VideoInfo {
  title: string;
  duration: string | null;
  thumbnail?: string | null;
}

export default function VideoConverter() {
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<Platform>('youtube');
  const [format, setFormat] = useState<Format>('mp4');
  const [quality, setQuality] = useState<string>('best');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const detectPlatform = (url: string): Platform | null => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('tiktok.com')) {
      return 'tiktok';
    }
    if (
      url.includes('facebook.com') ||
      url.includes('fb.com') ||
      url.includes('fb.watch')
    ) {
      return 'facebook';
    }
    return null;
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setError(null);
    setSuccess(null);
    setVideoInfo(null);
    setDownloadUrl(null);

    // Auto-detect platform
    const detected = detectPlatform(value);
    if (detected) {
      setPlatform(detected);
    }
  };

  const handleGetInfo = async () => {
    if (!url.trim()) {
      setError('Vui lòng nhập URL video');
      return;
    }

    const detected = detectPlatform(url);
    if (!detected) {
      setError(
        'URL không hợp lệ. Vui lòng nhập URL từ YouTube, TikTok hoặc Facebook'
      );
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setVideoInfo(null);

    try {
      const response = await fetch('/api/convert/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, platform: detected }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không thể lấy thông tin video');
      }

      setVideoInfo(data);
      setSuccess('Đã lấy thông tin video thành công');
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi lấy thông tin video');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!url.trim()) {
      setError('Vui lòng nhập URL video');
      return;
    }

    const detected = detectPlatform(url);
    if (!detected) {
      setError(
        'URL không hợp lệ. Vui lòng nhập URL từ YouTube, TikTok hoặc Facebook'
      );
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setDownloadUrl(null);

    try {
      const response = await fetch('/api/convert/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          platform: detected,
          format,
          quality,
        }),
      });

      // Check if response is a file (blob) or JSON error
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        // It's an error response
        const data = await response.json();
        throw new Error(data.error || 'Không thể tải video');
      }

      // It's a file response
      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `download.${format}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }
      }

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      setDownloadUrl(downloadUrl);
      setSuccess('Đã sẵn sàng tải xuống!');

      // Auto download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi tải video');
    } finally {
      setLoading(false);
    }
  };

  const qualityOptions =
    format === 'mp3' || format === 'm4a'
      ? [
          { value: 'best', label: 'Chất lượng tốt nhất' },
          { value: '128k', label: '128 kbps' },
          { value: '192k', label: '192 kbps' },
          { value: '256k', label: '256 kbps' },
          { value: '320k', label: '320 kbps' },
        ]
      : [
          { value: 'best', label: 'Chất lượng tốt nhất' },
          { value: '1080p', label: '1080p' },
          { value: '720p', label: '720p' },
          { value: '480p', label: '480p' },
          { value: '360p', label: '360p' },
        ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            Chuyển đổi Video/Audio
          </CardTitle>
          <CardDescription>
            Tải video và audio từ YouTube, TikTok, Facebook theo định dạng bạn
            chọn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="url">URL Video</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleGetInfo}
                disabled={loading || !url.trim()}
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang tải...
                  </>
                ) : (
                  'Lấy thông tin'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Hỗ trợ: YouTube, TikTok, Facebook
            </p>
          </div>

          {/* Platform Selection */}
          <div className="space-y-2">
            <Label htmlFor="platform">Nền tảng</Label>
            <Select
              value={platform}
              onValueChange={(value) => setPlatform(value as Platform)}
            >
              <SelectTrigger id="platform" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Format Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="format">Định dạng</Label>
              <Select
                value={format}
                onValueChange={(value) => {
                  setFormat(value as Format);
                  // Reset quality when switching to audio
                  if (value === 'mp3' || value === 'm4a') {
                    setQuality('best');
                  } else {
                    setQuality('best');
                  }
                }}
              >
                <SelectTrigger id="format" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">MP4 (Video)</SelectItem>
                  <SelectItem value="mp3">MP3 (Audio)</SelectItem>
                  <SelectItem value="webm">WebM (Video)</SelectItem>
                  <SelectItem value="m4a">M4A (Audio)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quality">
                {format === 'mp3' || format === 'm4a'
                  ? 'Chất lượng âm thanh'
                  : 'Chất lượng video'}
              </Label>
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger id="quality" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {qualityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Video Info */}
          {videoInfo && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-semibold">Thông tin video</span>
                  </div>
                  <p className="text-sm">
                    <strong>Tiêu đề:</strong> {videoInfo.title}
                  </p>
                  {videoInfo.duration && (
                    <p className="text-sm">
                      <strong>Thời lượng:</strong> {videoInfo.duration}
                    </p>
                  )}
                  {videoInfo.thumbnail && (
                    <div className="mt-2">
                      <Image
                        src={videoInfo.thumbnail}
                        alt="Thumbnail video"
                        width={320}
                        height={180}
                        className="rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Download Button */}
          <Button
            onClick={handleDownload}
            disabled={loading || !url.trim()}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Tải xuống
              </>
            )}
          </Button>

          {/* Manual Download Link */}
          {downloadUrl && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Nếu tải tự động không hoạt động, nhấp vào link bên dưới:
              </p>
              <a
                href={downloadUrl}
                download
                className="text-primary hover:underline text-sm"
              >
                Tải xuống trực tiếp
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Hướng dẫn sử dụng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Dán URL video từ YouTube, TikTok hoặc Facebook vào ô nhập</li>
            <li>Chọn nền tảng (tự động phát hiện hoặc chọn thủ công)</li>
            <li>Chọn định dạng muốn tải (MP4, MP3, WebM, M4A)</li>
            <li>Chọn chất lượng (độ phân giải cho video, bitrate cho audio)</li>
            <li>
              Nhấn &quot;Lấy thông tin&quot; để xem thông tin video (tùy chọn)
            </li>
            <li>Nhấn &quot;Tải xuống&quot; để bắt đầu tải file</li>
          </ol>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-xs">
              <strong>Lưu ý:</strong> Việc tải video có thể mất vài phút tùy
              thuộc vào độ dài và chất lượng video. Vui lòng đợi trong khi hệ
              thống xử lý.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
