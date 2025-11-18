import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

type Platform = 'youtube' | 'tiktok' | 'facebook';

/**
 * POST /api/convert/info
 * Get video information from URL
 */
const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { url, platform } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms: Platform[] = ['youtube', 'tiktok', 'facebook'];
    if (!platform || !validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      );
    }

    // Try to use yt-dlp if available
    try {
      // Check if yt-dlp is available
      try {
        await execAsync('yt-dlp --version');
      } catch {
        return NextResponse.json({
          title: 'Không thể lấy thông tin',
          duration: '0:00',
          thumbnail: null,
          message: 'yt-dlp chưa được cài đặt. Vui lòng cài đặt yt-dlp để sử dụng tính năng này.',
        });
      }

      // Get video info
      const { stdout } = await execAsync(`yt-dlp --dump-json --no-playlist "${url}"`, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      
      const info = JSON.parse(stdout);
      
      return NextResponse.json({
        title: info.title || 'Không có tiêu đề',
        duration: formatDuration(info.duration || 0),
        thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || null,
      });
    } catch (error: any) {
      console.error('Error getting video info:', error);
      
      // Check if it's a yt-dlp error
      if (error.message?.includes('yt-dlp') || error.code === 'ENOENT') {
        return NextResponse.json({
          title: 'Không thể lấy thông tin',
          duration: '0:00',
          thumbnail: null,
          message: 'yt-dlp chưa được cài đặt. Vui lòng cài đặt yt-dlp để sử dụng tính năng này.',
        });
      }
      
      return NextResponse.json(
        { error: error.message || 'Không thể lấy thông tin video. Vui lòng kiểm tra URL và thử lại.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error getting video info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get video info' },
      { status: 500 }
    );
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

