import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/auth';

/** Signed upload to Cloudinary. CLOUDINARY_URL format: cloudinary://<key>:<secret>@<cloud_name> */
function cloudinary() {
  const url = process.env.CLOUDINARY_URL;
  const m = url?.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  return m ? { apiKey: m[1], apiSecret: m[2], cloudName: m[3] } : null;
}

export async function GET() {
  return NextResponse.json({ enabled: Boolean(cloudinary()) });
}

export async function POST(request: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const config = cloudinary();
  if (!config) return NextResponse.json({ error: 'Uploads are not configured. Set CLOUDINARY_URL, or paste a media URL instead.' }, { status: 501 });

  const file = (await request.formData()).get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');
  if (!isVideo && !isAudio && !file.type.startsWith('image/')) return NextResponse.json({ error: 'Upload an image, video or audio file.' }, { status: 400 });

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'coastal-carnival';
  const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${config.apiSecret}`).digest('hex');
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', config.apiKey);
  body.append('timestamp', String(timestamp));
  body.append('folder', folder);
  body.append('signature', signature);

  // Cloudinary stores audio under the "video" resource type.
  const resource = isVideo || isAudio ? 'video' : 'image';
  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/${resource}/upload`, { method: 'POST', body });
  const result = await response.json();
  if (!response.ok) return NextResponse.json({ error: result.error?.message || 'Upload failed.' }, { status: 502 });
  return NextResponse.json({ url: result.secure_url as string });
}
