import { promises as fs } from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Inspect the leading bytes of a buffer and return the detected content type
 * based on magic bytes, or null if it matches none of the supported types.
 * Never trust client-supplied mime/extension — call this on the actual bytes.
 *
 * Supported: png, jpeg, gif, webp, heic/heif, pdf.
 */
export function sniffImageType(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // GIF: 47 49 46 38 ("GIF8")
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return 'image/gif';
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  // PDF: 25 50 44 46 ("%PDF")
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  // HEIC/HEIF: ISOBMFF "ftyp" box at offset 4 with a HEIF-family brand. Common
  // for iPhone/mobile photo uploads, so recognize it as a real image type.
  if (
    buffer.slice(4, 8).toString('ascii') === 'ftyp' &&
    ['heic', 'heix', 'hevc', 'hevm', 'hevs', 'heim', 'heis', 'mif1', 'msf1', 'heif'].includes(
      buffer.slice(8, 12).toString('ascii'),
    )
  ) {
    return 'image/heic';
  }

  return null;
}

export async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function saveAvatarBlob(userId: string, file: Blob) {
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 4 * 1024 * 1024) {
    throw new Error('File too large (max 4MB)');
  }
  // Validate by magic bytes — never trust client mime/extension.
  const sniffed = sniffImageType(buf);
  if (sniffed !== 'image/png' && sniffed !== 'image/jpeg' && sniffed !== 'image/webp' && sniffed !== 'image/gif') {
    throw new Error('Unsupported image type (jpeg/png/gif/webp only)');
  }
  const ext =
    sniffed === 'image/webp' ? 'webp' :
    sniffed === 'image/png' ? 'png' :
    sniffed === 'image/gif' ? 'gif' : 'jpg';
  const filename = `${userId}-${Date.now()}.${ext}`;
  const dest = path.join(UPLOADS_DIR, filename);
  await ensureUploadsDir();
  await fs.writeFile(dest, buf);
  return `/uploads/${filename}`;
}
