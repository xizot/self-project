import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

type Platform = 'youtube' | 'tiktok' | 'facebook';
type Format = 'mp4' | 'mp3' | 'webm' | 'm4a';

const execAsync = promisify(exec);

/**
 * POST /api/convert/download
 * Download and convert video/audio
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { url, platform, format, quality } = body;

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

    // Validate format
    const validFormats: Format[] = ['mp4', 'mp3', 'webm', 'm4a'];
    if (!format || !validFormats.includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format' },
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
          error: 'yt-dlp chưa được cài đặt trên server',
          message: 'Vui lòng cài đặt yt-dlp: pip install yt-dlp hoặc brew install yt-dlp',
        }, { status: 501 });
      }

      // Determine output format and quality
      let formatOption = '';
      if (format === 'mp3') {
        const qualityMap: Record<string, string> = {
          'best': '0',
          '320k': '320K',
          '256k': '256K',
          '192k': '192K',
          '128k': '128K',
        };
        formatOption = `-x --audio-format mp3 --audio-quality ${qualityMap[quality] || '0'}`;
      } else if (format === 'm4a') {
        const qualityMap: Record<string, string> = {
          'best': '0',
          '320k': '320K',
          '256k': '256K',
          '192k': '192K',
          '128k': '128K',
        };
        formatOption = `-x --audio-format m4a --audio-quality ${qualityMap[quality] || '0'}`;
      } else {
        // Video format
        const qualityMap: Record<string, string> = {
          'best': 'best',
          '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
          '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
          '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
          '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
        };
        formatOption = `-f ${qualityMap[quality] || 'best'}`;
      }

      // Create temp directory if it doesn't exist
      const tmpDir = os.tmpdir();
      const outputPath = path.join(tmpDir, `download_${Date.now()}_${Math.random().toString(36).substring(7)}.${format}`);
      
      // Build command
      const command = `yt-dlp ${formatOption} -o "${outputPath}" --no-playlist "${url}"`;
      
      // Execute download
      await execAsync(command, { maxBuffer: 10 * 1024 * 1024 }); // 10MB buffer
      
      // Read file
      const fileBuffer = await fs.readFile(outputPath);
      
      // Get filename from yt-dlp output or use default
      let filename = `download.${format}`;
      try {
        const { stdout: titleOutput } = await execAsync(`yt-dlp --get-filename -o "%(title)s.%(ext)s" "${url}"`);
        filename = titleOutput.trim().replace(/\n/g, '') || filename;
        // Sanitize filename
        filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200);
        if (!filename.endsWith(`.${format}`)) {
          filename = `${filename}.${format}`;
        }
      } catch {
        // Use default filename
      }
      
      // Clean up temp file
      try {
        await fs.unlink(outputPath);
      } catch {
        // Ignore cleanup errors
      }
      
      // Determine content type
      const contentType = format === 'mp3' 
        ? 'audio/mpeg'
        : format === 'm4a'
        ? 'audio/mp4'
        : format === 'webm'
        ? 'video/webm'
        : 'video/mp4';
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    } catch (error: any) {
      console.error('Error downloading video:', error);
      
      // Check if it's a yt-dlp error
      if (error.message?.includes('yt-dlp') || error.code === 'ENOENT') {
        return NextResponse.json({
          error: 'yt-dlp chưa được cài đặt trên server',
          message: 'Vui lòng cài đặt yt-dlp: pip install yt-dlp hoặc brew install yt-dlp',
        }, { status: 501 });
      }
      
      return NextResponse.json(
        { error: error.message || 'Không thể tải video. Vui lòng kiểm tra URL và thử lại.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error downloading video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download video' },
      { status: 500 }
    );
  }
}

