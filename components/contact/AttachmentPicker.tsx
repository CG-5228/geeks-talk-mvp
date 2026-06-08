'use client';
import { useRef, useState } from 'react';
import { Paperclip, X, FileText, ImageIcon, Loader2 } from 'lucide-react';

export interface Attachment {
  s3Key: string;
  s3Url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

interface Props {
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
  max?: number;
  endpoint?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentPicker({
  attachments,
  onChange,
  max = 5,
  endpoint = '/api/contact/upload',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = max - attachments.length;
    if (remaining <= 0) {
      setError(`Up to ${max} files allowed.`);
      return;
    }
    setError('');
    setUploading(true);
    const toUpload = Array.from(files).slice(0, remaining);
    const uploaded: Attachment[] = [];
    try {
      for (const file of toUpload) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(endpoint, { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Upload failed');
        uploaded.push(data.file);
      }
      onChange([...attachments, ...uploaded]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setError(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function remove(idx: number) {
    const next = attachments.slice();
    next.splice(idx, 1);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-[rgba(236,245,255,0.92)]">Attachments</div>
        <div className="text-[11px] text-[rgba(220,235,255,0.55)]">
          {attachments.length}/{max} · max 10MB each
        </div>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || attachments.length >= max}
        className="w-full rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/25 transition px-4 py-6 flex flex-col items-center justify-center gap-2 text-sm text-[rgba(220,235,255,0.75)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-[color:hsl(var(--primary))]" />
            <span>Uploading…</span>
          </>
        ) : (
          <>
            <Paperclip className="w-5 h-5 text-[color:hsl(var(--primary))]" />
            <span>Drop files or click to browse</span>
            <span className="text-[11px] text-[rgba(220,235,255,0.5)]">PNG, JPG, PDF, TXT</span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,application/pdf,text/plain,.log,.md"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      {attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((a, i) => {
            const isImg = a.fileType.startsWith('image/');
            return (
              <li
                key={a.s3Key}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2"
              >
                <div className="w-8 h-8 rounded-md bg-white/[0.05] grid place-items-center text-[rgba(220,235,255,0.7)] flex-shrink-0">
                  {isImg ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-[rgba(236,245,255,0.92)] truncate">{a.fileName}</div>
                  <div className="text-[11px] text-[rgba(220,235,255,0.55)]">{formatBytes(a.fileSize)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove ${a.fileName}`}
                  className="p-1.5 rounded-md hover:bg-white/[0.07] text-[rgba(220,235,255,0.65)] hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
