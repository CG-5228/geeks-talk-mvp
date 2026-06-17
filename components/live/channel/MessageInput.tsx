"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Smile, Calculator, Plus, X, File, Image, Send } from 'lucide-react';
import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';
import MessageReplyContext from '../message/MessageReplyContext';
import { useMessageDraft } from '@/lib/live/useMessageDraft';
import ComposerAutocomplete from '../composer/ComposerAutocomplete';
import {
  detectToken,
  getEmojiSuggestions,
  getSlashSuggestions,
  type AnySuggestion,
  type AutocompleteToken,
  type MentionSuggestion,
} from '../composer/autocomplete';

// Optimize: import picker once at module level
const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false }) as any;
const CalculatorModal = dynamic(() => import('@/components/live/calculator/Calculator'), { ssr: false });

export interface MessageInputProps {
  onSendMessage: (text: string, replyToId?: string, files?: Array<{id: string, name: string, type: string, url: string}>) => void;
  maxChars?: number;
  disabled?: boolean;
  channelId?: string;
  draftScope?: string;
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

export default function MessageInput({ onSendMessage, maxChars, disabled, channelId, draftScope, replyContext }: MessageInputProps) {
  // Read maxChars from environment variable, fallback to 500
  const maxCharsLimit = maxChars || parseInt(process.env.NEXT_PUBLIC_MESSAGE_MAX_LENGTH || '500', 10);
  const effectiveScope = draftScope ?? (channelId ? `ch:${channelId}` : undefined);
  const { value: text, update: setText, clear: clearDraft } = useMessageDraft(effectiveScope);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{id: string, name: string, type: string, url: string}>>([]);
  const emojiRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [mentionResults, setMentionResults] = useState<MentionSuggestion[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const remaining = Math.max(0, maxCharsLimit - text.length);
  const canSend = !disabled && (text.trim().length > 0 || uploadedFiles.length > 0) && remaining >= 0;

  const token: AutocompleteToken | null = useMemo(() => detectToken(text, cursorPos), [text, cursorPos]);

  // Debounced mention fetch — only hits the members endpoint when an @token is active.
  useEffect(() => {
    if (!token || token.trigger !== 'mention' || !channelId) {
      setMentionResults([]);
      setMentionLoading(false);
      return;
    }
    const q = token.query;
    const ctrl = new AbortController();
    setMentionLoading(true);
    const timer = setTimeout(() => {
      fetch(
        `/api/live/channels/${encodeURIComponent(channelId)}/members?search=${encodeURIComponent(q)}`,
        { signal: ctrl.signal },
      )
        .then((r) => (r.ok ? r.json() : { members: [] }))
        .then((data) => {
          const members: MentionSuggestion[] = (data.members || [])
            .slice(0, 8)
            .map((m: {
              id: string;
              name: string | null;
              username: string | null;
              image: string | null;
              onlineStatus?: string;
            }) => ({
              kind: 'mention' as const,
              id: m.id,
              name: m.name || m.username || 'User',
              username: m.username || m.id.slice(0, 8),
              image: m.image ?? null,
              onlineStatus: (m.onlineStatus === 'online' || m.onlineStatus === 'away'
                ? m.onlineStatus
                : 'offline') as 'online' | 'away' | 'offline',
              insert: `@${m.username || m.id}`,
            }));
          setMentionResults(members);
          setMentionLoading(false);
        })
        .catch(() => {
          setMentionLoading(false);
        });
    }, 120);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [token, channelId]);

  const autocompleteItems: AnySuggestion[] = useMemo(() => {
    if (!token) return [];
    if (token.trigger === 'mention') return mentionResults;
    if (token.trigger === 'emoji') return getEmojiSuggestions(token.query);
    return getSlashSuggestions(token.query);
  }, [token, mentionResults]);

  useEffect(() => {
    setAutocompleteIndex(0);
  }, [token?.trigger, token?.query, mentionResults]);

  const applySuggestion = useCallback(
    (index: number) => {
      if (!token) return;
      const item = autocompleteItems[index];
      if (!item) return;
      const needsSpace = item.kind !== 'slash' || (item.kind === 'slash' && item.commit === 'immediate');
      const replacement = item.insert + (needsSpace ? ' ' : '');
      const next = text.slice(0, token.start) + replacement + text.slice(token.end);
      const caret = token.start + replacement.length;
      setText(next);
      requestAnimationFrame(() => {
        const el = taRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(caret, caret);
        setCursorPos(caret);
      });
    },
    [token, autocompleteItems, text, setText],
  );

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
    const raw = text.trim();
    if (!raw && uploadedFiles.length === 0) return;

    // Slash-command interception before we actually send.
    if (raw.toLowerCase() === '/help') {
      window.dispatchEvent(new CustomEvent('chat:open-shortcuts'));
      clearDraft();
      return;
    }
    let t = raw;
    if (/^\/me\s+/i.test(raw)) {
      const body = raw.replace(/^\/me\s+/i, '').trim();
      if (body) t = `_${body}_`;
    }

    onSendMessage(t, replyContext?.message.id, uploadedFiles);
    clearDraft();
    setUploadedFiles([]);
    // Clear reply context after sending
    if (replyContext) {
      replyContext.onCancel();
    }
    // Broadcast that we've stopped typing.
    sendTypingStop();
    // keep focus
    requestAnimationFrame(() => taRef.current?.focus());
  };

  // Typing broadcast: emits `typing:start` on the first keystroke and
  // `typing:stop` after 3s of inactivity. Debounced so we don't hammer the
  // endpoint on every keypress.
  const typingActiveRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitTyping = useCallback(async (isTyping: boolean) => {
    if (!channelId) return;
    try {
      await fetch('/api/live/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, isTyping }),
      });
    } catch {
      // best-effort only — typing hints are fire-and-forget
    }
  }, [channelId]);

  const sendTypingStart = useCallback(() => {
    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      emitTyping(true);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingActiveRef.current = false;
      emitTyping(false);
    }, 3000);
  }, [emitTyping]);

  const sendTypingStop = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (typingActiveRef.current) {
      typingActiveRef.current = false;
      emitTyping(false);
    }
  }, [emitTyping]);

  // Cleanup on unmount / channel switch: make sure we don't leave a stale typer.
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (typingActiveRef.current) {
        typingActiveRef.current = false;
        emitTyping(false);
      }
    };
  }, [channelId, emitTyping]);

  const acceptFiles = (files: File[]) => {
    if (files.length === 0) return;
    const validFiles = files.filter((file) => {
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    acceptFiles(Array.from(event.target.files || []));
    event.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = items
      .filter((it) => it.kind === 'file')
      .map((it) => it.getAsFile())
      .filter((f): f is File => f !== null);
    if (files.length === 0) return;
    e.preventDefault();
    acceptFiles(files);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<File[]>).detail;
      if (Array.isArray(detail) && detail.length > 0) acceptFiles(detail);
    };
    window.addEventListener('chat:upload-files', handler as EventListener);
    return () => window.removeEventListener('chat:upload-files', handler as EventListener);
  }, [channelId]);

  const uploadFiles = async (files: File[]) => {
    if (!channelId) {
      console.error('No channel ID provided for file upload');
      alert('Unable to upload files: No channel selected');
      setUploadingFiles([]);
      return;
    }

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/live/channels/${channelId}/files`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(errorData.error || `Failed to upload ${file.name}`);
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
      console.log('🔍 File upload results:', results);
      setUploadedFiles(prev => {
        const newFiles = [...prev, ...results];
        console.log('🔍 Updated uploadedFiles state:', newFiles);
        return newFiles;
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      alert(`Failed to upload files: ${error instanceof Error ? error.message : 'Please try again.'}`);
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
    if (token && autocompleteItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocompleteIndex((i) => Math.min(i + 1, autocompleteItems.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocompleteIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(autocompleteIndex);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        // Move cursor past the token end so detectToken returns null.
        setCursorPos(-1);
        return;
      }
    }
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
      
      <div className="relative overflow-visible rounded-full bg-white/5 ring-1 ring-border/20 backdrop-blur-md p-2">
        {token && (
          <ComposerAutocomplete
            items={autocompleteItems}
            activeIndex={autocompleteIndex}
            trigger={token.trigger}
            query={token.query}
            onSelect={applySuggestion}
            onHover={setAutocompleteIndex}
          />
        )}
        <div className="flex items-center gap-2">
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
            className="p-2 rounded-xl hover:bg-white/5 text-[rgba(220,235,255,0.8)] disabled:opacity-50 disabled:cursor-not-allowed"
            title={channelId ? "Upload file" : "Select a channel to upload files"}
            onClick={() => fileInputRef.current?.click()}
            disabled={!channelId}
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
          <div className="flex-1 min-w-0">
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setCursorPos(e.target.selectionStart ?? e.target.value.length);
                if (e.target.value.length > 0) sendTypingStart();
                else sendTypingStop();
              }}
              onSelect={(e) => {
                const el = e.currentTarget;
                setCursorPos(el.selectionStart ?? 0);
              }}
              onClick={(e) => setCursorPos(e.currentTarget.selectionStart ?? 0)}
              onKeyDown={onKeyDown}
              onKeyUp={(e) => setCursorPos(e.currentTarget.selectionStart ?? 0)}
              onPaste={handlePaste}
              onBlur={sendTypingStop}
              disabled={disabled}
              placeholder={disabled ? 'You cannot send messages while suspended' : 'Type a message — @mention, :emoji:, /commands, markdown'}
              rows={1}
              className="w-full resize-none bg-transparent outline-none text-[rgba(236,245,255,0.95)] placeholder:text-[rgba(220,235,255,0.55)] min-h-[44px] max-h-40 disabled:cursor-not-allowed disabled:opacity-60"
              aria-autocomplete={token ? 'list' : undefined}
              aria-expanded={token ? autocompleteItems.length > 0 : undefined}
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
          <div className="relative">
            <button
              onClick={send}
              disabled={!canSend}
              className={`ml-auto rounded-full p-2.5 transition ${canSend ? 'bg-[hsl(var(--primary))]/90 hover:bg-[hsl(var(--primary))] text-white' : 'bg-white/10 text-[rgba(220,235,255,0.6)] cursor-not-allowed'}`}
              title="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
            {remaining <= 50 && (
              <div className="absolute -bottom-6 left-0 text-xs text-[rgba(220,235,255,0.6)]">
                {remaining}
              </div>
            )}
          </div>
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
