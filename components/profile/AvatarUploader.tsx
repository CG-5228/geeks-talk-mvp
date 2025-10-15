"use client";
import { useRef, useState } from 'react';
import Image from 'next/image';

export default function AvatarUploader({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = () => inputRef.current?.click();
  const onChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/user/avatar', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok) setUrl(data.url);
    setLoading(false);
  };

  return (
    <div className="relative w-40 h-40 mx-auto">
      <Image src={url || '/avatar.png'} alt="avatar" fill className="rounded-full object-cover" />
      <button onClick={onPick} className="absolute bottom-2 right-2 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] p-2 shadow" aria-label="Change avatar">
        ✎
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onChange} />
      {loading && <div className="mt-2 text-xs text-[rgba(220,235,255,0.7)] text-center">Uploading…</div>}
    </div>
  );
}
