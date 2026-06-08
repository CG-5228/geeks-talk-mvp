'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CoverUploader({
  coverImage,
  editable,
}: {
  coverImage: string | null | undefined;
  editable: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(coverImage || null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/user/cover', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Upload failed');
      setCurrent(d.url);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove() {
    setUploading(true);
    try {
      await fetch('/api/user/cover', { method: 'DELETE' });
      setCurrent(null);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative h-40 sm:h-56 w-full overflow-hidden rounded-t-xl">
      {current ? (
        <Image
          src={current}
          alt="Cover"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 900px"
          unoptimized
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/15 to-transparent" />
      )}

      {editable && (
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/70 backdrop-blur text-xs font-medium text-foreground hover:bg-background/90 border border-border/40 transition disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            {current ? 'Change cover' : 'Add cover'}
          </button>
          {current && (
            <button
              onClick={remove}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/70 backdrop-blur text-xs font-medium text-foreground hover:bg-red-500/20 hover:text-red-300 border border-border/40 transition disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
      )}

      {err && (
        <div className="absolute bottom-3 left-3 right-3 text-xs bg-red-500/20 text-red-100 border border-red-500/30 rounded-md px-3 py-2">
          {err}
        </div>
      )}
    </div>
  );
}
