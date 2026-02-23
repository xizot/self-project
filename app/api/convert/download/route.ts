import ytdl from '@distube/ytdl-core';
import { requireAuth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

type Format = 'mp4' | 'mp3' | 'webm' | 'm4a';

/**
 * POST /api/convert/download
 * YouTube: @distube/ytdl-core (no binary required)
 * TikTok/Facebook: not supported without yt-dlp
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const { url, platform, format, quality } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const validFormats: Format[] = ['mp4', 'mp3', 'webm', 'm4a'];
    if (!format || !validFormats.includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    if (platform !== 'youtube') {
      return NextResponse.json(
        {
          error:
            'TikTok và Facebook chưa hỗ trợ tải trực tiếp. Vui lòng cài yt-dlp để dùng tính năng này.',
        },
        { status: 422 }
      );
    }

    const isAudio = format === 'mp3' || format === 'm4a';

    // Get video info first
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title
      .replace(/[<>:"/\\|?*]/g, '')
      .trim()
      .substring(0, 100);

    let downloadOptions: ytdl.downloadOptions;

    if (isAudio) {
      downloadOptions = {
        filter: 'audioonly',
        quality: 'highestaudio',
      };
    } else {
      // For video: select best merged format at or below requested height
      const maxHeight =
        quality === 'best' ? Infinity : parseInt(quality.replace('p', ''), 10);

      downloadOptions = {
        filter: (f) => {
          if (!f.hasVideo || !f.hasAudio) return false;
          if (quality === 'best') return true;
          return (f.height ?? 0) <= maxHeight;
        },
        quality: 'highest',
      };
    }

    // Stream and buffer the download
    const stream = ytdl.downloadFromInfo(info, downloadOptions);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Determine content type and filename
    const contentType =
      format === 'mp3'
        ? 'audio/mpeg'
        : format === 'm4a'
          ? 'audio/mp4'
          : format === 'webm'
            ? 'video/webm'
            : 'video/mp4';

    // Use the actual format extension from what ytdl selected (audio may be webm)
    const filename = `${title}.${format}`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error downloading video:', error);
    return NextResponse.json(
      { error: error.message || 'Không thể tải video' },
      { status: 500 }
    );
  }
}
