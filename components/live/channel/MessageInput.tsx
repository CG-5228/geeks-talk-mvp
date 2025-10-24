"use client";
import { useEffect, useRef, useState } from 'react';
import { Smile, Calculator, Plus, X, File, Image } from 'lucide-react';
import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';
import MessageReplyContext from '../message/MessageReplyContext';

// Optimize: import picker once at module level
const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false }) as any;
const CalculatorModal = dynamic(() => import('@/components/live/calculator/Calculator'), { ssr: false });

export interface MessageInputProps {
  onSendMessage: (text: string, replyToId?: string) => void;
  maxChars?: number;
  disabled?: boolean;
  replyContext?: {
    message: {
      id: string;
      content: string;
      authorName: string;
      authorImage?: string | null;
    };
    onCancel: () => void;
  };
}

export default function MessageInput({ onSendMessage, maxChars = 500, disabled, replyContext }: MessageInputProps) {
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{id: string, name: string, type: string, url: string}>>([]);
  const emojiRef = useRef<HTMLDivElement>(null);
  const remaining = Math.max(0, maxChars - text.length);
  const canSend = !disabled && (text.trim().length > 0 || uploadedFiles.length > 0) && remaining >= 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    if (showEmoji) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmoji]);

  useEffect(() => {
    // simple auto-grow
    const el = taRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [text]);

  const send = () => {
    const t = text.trim();
    if (!t && uploadedFiles.length === 0) return;
    onSendMessage(t, replyContext?.message.id);
    setText("");
    setUploadedFiles([]);
    // Clear reply context after sending
    if (replyContext) {
      replyContext.onCancel();
    }
    // keep focus
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate file size (50MB max)
    const validFiles = files.filter(file => {
      if (file.size > 50 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 50MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploadingFiles(validFiles);
    uploadFiles(validFiles);
  };

  const uploadFiles = async (files: File[]) => {
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/live/channels/${window.location.pathname.split('/').pop()}/files`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();
        return {
          id: data.file.id,
          name: file.name,
          type: file.type,
          url: data.file.downloadUrl,
        };
      });

      const results = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...results]);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploadingFiles([]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isImage = (fileType: string) => {
    return fileType.startsWith('image/');
  };

  const insertAtCaret = (content: string) => {
    const el = taRef.current; if (!el) return;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + content + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + content.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const handleCalculatorResult = (result: string) => {
    insertAtCaret(result);
    setShowCalculator(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) send();
    }
  };

  return (
    <div className="px-6 pb-4">
      {/* Reply Context */}
      {replyContext && (
        <MessageReplyContext
          message={replyContext.message}
          onCancel={replyContext.onCancel}
        />
      )}
      
      <div className="relative overflow-visible rounded-2xl bg-white/5 ring-1 ring-border/20 backdrop-blur-md p-2">
        <div className="flex items-end gap-2">
          {/* Emoji toggle on far left */}
          <div className="relative" ref={emojiRef}>
            <button
              className="p-2 rounded-xl hover:bg-white/5 text-[rgba(220,235,255,0.8)]"
              title="Emoji"
              onClick={() => setShowEmoji((s) => !s)}
            >
              <Smile className="h-4.5 w-4.5" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-[110%] left-0 z-[99]">
                <Picker
                  data={data as any}
                  onEmojiSelect={(e: any) => { insertAtCaret(e.native || ''); setShowEmoji(false); }}
                  theme="dark"
                  previewPosition="none"
                />
              </div>
            )}
          </div>

          {/* Calculator button */}
          <button
            className="p-2 rounded-xl hover:bg-white/5 text-[rgba(220,235,255,0.8)]"
            title="Calculator"
            onClick={() => setShowCalculator(true)}
          >
            <Calculator className="h-4.5 w-4.5" />
          </button>

          {/* File upload button */}
          <button
            className="p-2 rounded-xl hover:bg-white/5 text-[rgba(220,235,255,0.8)]"
            title="Upload file"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
          <div className="flex-1 min-w-0">
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a message"
              rows={1}
              className="w-full resize-none bg-transparent outline-none text-[rgba(236,245,255,0.95)] placeholder:text-[rgba(220,235,255,0.55)] min-h-[44px] max-h-40"
            />
            
            {/* File previews */}
            {(uploadedFiles.length > 0 || uploadingFiles.length > 0) && (
              <div className="mt-2 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={file.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                    {isImage(file.type) ? (
                      <Image className="w-4 h-4 text-blue-400" />
                    ) : (
                      <File className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm text-[rgba(220,235,255,0.9)] truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-auto p-1 hover:bg-white/10 rounded"
                    >
                      <X className="w-3 h-3 text-[rgba(220,235,255,0.5)]" />
                    </button>
                  </div>
                ))}
                
                {uploadingFiles.map((file, index) => (
                  <div key={`uploading-${index}`} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                    {isImage(file.type) ? (
                      <Image className="w-4 h-4 text-blue-400" />
                    ) : (
                      <File className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm text-[rgba(220,235,255,0.9)] truncate">{file.name}</span>
                    <span className="ml-auto text-xs text-[rgba(220,235,255,0.5)]">Uploading...</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={send}
            disabled={!canSend}
            className={`ml-auto rounded-full px-4 py-2 text-sm font-medium transition ${canSend ? 'bg-[hsl(var(--primary))]/90 hover:bg-[hsl(var(--primary))] text-white' : 'bg-white/10 text-[rgba(220,235,255,0.6)] cursor-not-allowed'}`}
          >
            {`Send · ${remaining}`}
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
      />

      {/* Calculator Modal */}
      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        onResult={handleCalculatorResult}
      />
    </div>
  );
}
