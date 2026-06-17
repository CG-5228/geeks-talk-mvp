"use client";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface LightboxImage {
  id: string;
  url: string;
  name: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  openId: string | null;
  onClose: () => void;
}

export default function ImageLightbox({ images, openId, onClose }: ImageLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (openId == null) return;
    const i = images.findIndex((img) => img.id === openId);
    setIdx(i >= 0 ? i : 0);
  }, [openId, images]);

  useEffect(() => {
    if (openId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setIdx((v) => Math.min(v + 1, images.length - 1));
      else if (e.key === 'ArrowLeft') setIdx((v) => Math.max(v - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openId, images.length, onClose]);

  if (!mounted || openId == null || images.length === 0) return null;
  const current = images[idx] ?? images[0];

  const download = () => {
    const a = document.createElement('a');
    a.href = current.url;
    a.download = current.name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center animate-fade-up motion-reduce:animate-none"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            download();
          }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          title="Download"
          aria-label="Download image"
        >
          <Download className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          title="Close"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {images.length > 1 && idx > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIdx((v) => Math.max(v - 1, 0));
          }}
          className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {images.length > 1 && idx < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIdx((v) => Math.min(v + 1, images.length - 1));
          }}
          className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          aria-label="Next image"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <img
        src={current.url}
        alt={current.name}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[92vw] max-h-[86vh] object-contain rounded-lg shadow-2xl"
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-mono"
      >
        {current.name}
        {images.length > 1 ? ` · ${idx + 1} / ${images.length}` : ''}
      </div>
    </div>,
    document.body
  );
}
