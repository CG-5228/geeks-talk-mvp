import { promises as fs } from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function saveAvatarBlob(userId: string, file: Blob) {
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 4 * 1024 * 1024) {
    throw new Error('File too large (max 4MB)');
  }
  // basic mime check by signature (very light)
  const isPng = buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
  const isWebp = buf.slice(0, 4).toString('utf8') === 'RIFF' && buf.slice(8, 12).toString('utf8') === 'WEBP';
  if (!isPng && !isJpg && !isWebp) {
    throw new Error('Unsupported image type (jpeg/png/webp only)');
  }
  const ext = isWebp ? 'webp' : isPng ? 'png' : 'jpg';
  const filename = `${userId}-${Date.now()}.${ext}`;
  const dest = path.join(UPLOADS_DIR, filename);
  await ensureUploadsDir();
  await fs.writeFile(dest, buf);
  return `/uploads/${filename}`;
}
