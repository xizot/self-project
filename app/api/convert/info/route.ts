import ytdl from '@distube/ytdl-core';
import { requireAuth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

type Platform = 'youtube' | 'tiktok' | 'facebook';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * POST /api/convert/info
 * YouTube: ytdl-core (title + duration + thumbnail, no binary needed)
 * TikTok: oEmbed API
 * Facebook: oEmbed API
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const { url, platform } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const validPlatforms: Platform[] = ['youtube', 'tiktok', 'facebook'];
    if (!platform || !validPlatforms.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    if (platform === 'youtube') {
      const info = await ytdl.getInfo(url);
      const details = info.videoDetails;
      const thumbnail =
        details.thumbnails[details.thumbnails.length - 1]?.url || null;
      return NextResponse.json({
        title: details.title,
        duration: formatDuration(parseInt(details.lengthSeconds, 10)),
        thumbnail,
      });
    }

    if (platform === 'tiktok') {
      const res = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
      );
      if (!res.ok) throw new Error('Không thể lấy thông tin video TikTok.');
      const data = await res.json();
      return NextResponse.json({
        title: data.title || 'TikTok Video',
        duration: null,
        thumbnail: data.thumbnail_url || null,
      });
    }

    // Facebook — no public oEmbed without auth
    return NextResponse.json({
      title: 'Facebook Video',
      duration: null,
      thumbnail: null,
    });
  } catch (error: any) {
    console.error('Error getting video info:', error);
    return NextResponse.json(
      { error: error.message || 'Không thể lấy thông tin video' },
      { status: 500 }
    );
  }
}
