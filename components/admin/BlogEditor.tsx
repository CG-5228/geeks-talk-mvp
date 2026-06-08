'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import {
  Save,
  Eye,
  EyeOff,
  Upload,
  X,
  ArrowLeft,
  Bold,
  Italic,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Star,
  Clock,
  FileText,
  Hash,
  CheckCircle2,
  Loader2,
  Plus,
} from 'lucide-react';
import { BlogPost } from '@/types/admin';
import { useAdminToast } from './AdminToast';
import { calculateReadingTime } from '@/lib/blog/readingTime';

interface BlogEditorProps {
  post?: BlogPost;
  onSave?: (post: BlogPost) => void;
  onCancel?: () => void;
}

type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);

const countWords = (text: string) => {
  if (!text) return 0;
  const stripped = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ');
  return stripped.trim().split(/\s+/).filter(Boolean).length;
};

export default function BlogEditor({ post, onSave, onCancel }: BlogEditorProps) {
  const toast = useAdminToast();
  const [formData, setFormData] = useState<BlogPost>({
    title: '',
    content: '',
    excerpt: '',
    coverImage: null,
    published: false,
    tags: [],
    featured: false,
    slug: '',
    ...post,
  });

  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [tagDraft, setTagDraft] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [inlineUploading, setInlineUploading] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [persistedId, setPersistedId] = useState<string | undefined>(post?.id);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef(formData);
  formRef.current = formData;

  const wordCount = useMemo(() => countWords(formData.content), [formData.content]);
  const readingMinutes = useMemo(() => calculateReadingTime(formData.content), [formData.content]);

  const effectiveSlug = useMemo(() => {
    if (slugTouched && formData.slug) return formData.slug;
    if (formData.title) return slugify(formData.title);
    return formData.slug || '';
  }, [slugTouched, formData.slug, formData.title]);

  const updateField = <K extends keyof BlogPost>(key: K, value: BlogPost[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setAutosaveStatus('dirty');
  };

  const insertAtCursor = useCallback((before: string, after = '', placeholder = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.substring(start, end) || placeholder;
    const next = ta.value.substring(0, start) + before + selected + after + ta.value.substring(end);
    setFormData((prev) => ({ ...prev, content: next }));
    setAutosaveStatus('dirty');
    requestAnimationFrame(() => {
      ta.focus();
      const caret = start + before.length;
      ta.setSelectionRange(caret, caret + selected.length);
    });
  }, []);

  const insertLineStart = useCallback((prefix: string, placeholder = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const value = ta.value;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const existing = value.substring(lineStart, ta.selectionEnd);
    const body = existing || placeholder;
    const next = value.substring(0, lineStart) + prefix + body + value.substring(ta.selectionEnd);
    setFormData((prev) => ({ ...prev, content: next }));
    setAutosaveStatus('dirty');
    requestAnimationFrame(() => {
      ta.focus();
      const caret = lineStart + prefix.length;
      ta.setSelectionRange(caret, caret + body.length);
    });
  }, []);

  const applyContent = useCallback(
    (next: string, selection: { start: number; end: number }) => {
      setFormData((prev) => ({ ...prev, content: next }));
      setAutosaveStatus('dirty');
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.focus();
        ta.setSelectionRange(selection.start, selection.end);
      });
    },
    [],
  );

  const nextOrderedNumber = (value: string, lineStart: number, indent: string) => {
    if (lineStart === 0) return 1;
    const prevLineStart = value.lastIndexOf('\n', lineStart - 2) + 1;
    const prevLine = value.substring(prevLineStart, lineStart - 1);
    const m = prevLine.match(new RegExp(`^${indent.replace(/\s/g, '\\s')}(\\d+)\\.\\s`));
    if (m) return parseInt(m[1], 10) + 1;
    return 1;
  };

  const toggleOrderedList = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = ta.value;
    const blockStart = value.lastIndexOf('\n', start - 1) + 1;
    const blockEndRaw = value.indexOf('\n', end);
    const blockEnd = blockEndRaw === -1 ? value.length : blockEndRaw;
    const block = value.substring(blockStart, blockEnd);
    const lines = block.split('\n');

    const orderedRe = /^(\s*)(\d+)\.\s(.*)$/;
    const bulletRe = /^(\s*)[-*+]\s(.*)$/;
    const nonEmpty = lines.filter((l) => l.trim().length > 0);
    const allOrdered = nonEmpty.length > 0 && nonEmpty.every((l) => orderedRe.test(l));

    let rebuilt: string[];
    let placeholderHit = false;

    if (allOrdered) {
      rebuilt = lines.map((l) => {
        const m = l.match(orderedRe);
        return m ? `${m[1]}${m[3]}` : l;
      });
    } else {
      const indentMatch = (lines[0] || '').match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      let counter = nextOrderedNumber(value, blockStart, indent);
      rebuilt = lines.map((l) => {
        if (!l.trim()) return l;
        const bm = l.match(bulletRe);
        const om = l.match(orderedRe);
        const body = om ? om[3] : bm ? bm[2] : l.replace(/^\s*/, '');
        const lineIndent = om ? om[1] : bm ? bm[1] : indent;
        const prefix = `${lineIndent}${counter}. `;
        counter += 1;
        return `${prefix}${body}`;
      });
      if (nonEmpty.length === 0) {
        const n = nextOrderedNumber(value, blockStart, indent);
        rebuilt = [`${indent}${n}. list item`];
        placeholderHit = true;
      }
    }

    const nextBlock = rebuilt.join('\n');
    const next = value.substring(0, blockStart) + nextBlock + value.substring(blockEnd);
    const newBlockEnd = blockStart + nextBlock.length;
    const selection = placeholderHit
      ? { start: newBlockEnd - 'list item'.length, end: newBlockEnd }
      : { start: newBlockEnd, end: newBlockEnd };
    applyContent(next, selection);
  }, [applyContent]);

  const toggleBulletList = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = ta.value;
    const blockStart = value.lastIndexOf('\n', start - 1) + 1;
    const blockEndRaw = value.indexOf('\n', end);
    const blockEnd = blockEndRaw === -1 ? value.length : blockEndRaw;
    const block = value.substring(blockStart, blockEnd);
    const lines = block.split('\n');

    const orderedRe = /^(\s*)(\d+)\.\s(.*)$/;
    const bulletRe = /^(\s*)[-*+]\s(.*)$/;
    const nonEmpty = lines.filter((l) => l.trim().length > 0);
    const allBullet = nonEmpty.length > 0 && nonEmpty.every((l) => bulletRe.test(l));

    let rebuilt: string[];
    let placeholderHit = false;

    if (allBullet) {
      rebuilt = lines.map((l) => {
        const m = l.match(bulletRe);
        return m ? `${m[1]}${m[2]}` : l;
      });
    } else {
      rebuilt = lines.map((l) => {
        if (!l.trim()) return l;
        const om = l.match(orderedRe);
        const bm = l.match(bulletRe);
        const body = om ? om[3] : bm ? bm[2] : l.replace(/^\s*/, '');
        const indent = om ? om[1] : bm ? bm[1] : (l.match(/^(\s*)/)?.[1] ?? '');
        return `${indent}- ${body}`;
      });
      if (nonEmpty.length === 0) {
        const indent = (lines[0] || '').match(/^(\s*)/)?.[1] ?? '';
        rebuilt = [`${indent}- list item`];
        placeholderHit = true;
      }
    }

    const nextBlock = rebuilt.join('\n');
    const next = value.substring(0, blockStart) + nextBlock + value.substring(blockEnd);
    const newBlockEnd = blockStart + nextBlock.length;
    const selection = placeholderHit
      ? { start: newBlockEnd - 'list item'.length, end: newBlockEnd }
      : { start: newBlockEnd, end: newBlockEnd };
    applyContent(next, selection);
  }, [applyContent]);

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (start !== end) return;
      const value = ta.value;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineToCursor = value.substring(lineStart, start);

      const orderedMatch = lineToCursor.match(/^(\s*)(\d+)\.\s(.*)$/);
      const bulletMatch = lineToCursor.match(/^(\s*)([-*+])\s(\[[ xX]\]\s)?(.*)$/);

      if (orderedMatch) {
        const [, indent, num, body] = orderedMatch;
        if (!body.trim()) {
          e.preventDefault();
          const next = value.substring(0, lineStart) + indent + value.substring(start);
          const caret = lineStart + indent.length;
          applyContent(next, { start: caret, end: caret });
          return;
        }
        e.preventDefault();
        const prefix = `\n${indent}${parseInt(num, 10) + 1}. `;
        const next = value.substring(0, start) + prefix + value.substring(end);
        const caret = start + prefix.length;
        applyContent(next, { start: caret, end: caret });
        return;
      }

      if (bulletMatch) {
        const [, indent, marker, task, body] = bulletMatch;
        if (!body.trim()) {
          e.preventDefault();
          const next = value.substring(0, lineStart) + indent + value.substring(start);
          const caret = lineStart + indent.length;
          applyContent(next, { start: caret, end: caret });
          return;
        }
        e.preventDefault();
        const taskPrefix = task ? '[ ] ' : '';
        const prefix = `\n${indent}${marker} ${taskPrefix}`;
        const next = value.substring(0, start) + prefix + value.substring(end);
        const caret = start + prefix.length;
        applyContent(next, { start: caret, end: caret });
        return;
      }
    },
    [applyContent],
  );

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/blog/upload-image', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.push({ tone: 'error', title: 'Upload failed', description: data.error || 'Could not upload image' });
        return null;
      }
      return data.url as string;
    },
    [toast],
  );

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const url = await uploadImage(file);
      if (url) {
        updateField('coverImage', url);
        toast.push({ tone: 'success', title: 'Cover uploaded' });
      }
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleInlineImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setInlineUploading(true);
    try {
      const url = await uploadImage(file);
      if (url) {
        insertAtCursor(`![${file.name.replace(/\.[^.]+$/, '')}](`, ')', url);
      }
    } finally {
      setInlineUploading(false);
      if (inlineInputRef.current) inlineInputRef.current.value = '';
    }
  };

  const addTag = (raw: string) => {
    const clean = raw.trim().toLowerCase().slice(0, 32);
    if (!clean) return;
    const current = formData.tags ?? [];
    if (current.includes(clean) || current.length >= 8) {
      setTagDraft('');
      return;
    }
    updateField('tags', [...current, clean]);
    setTagDraft('');
  };

  const removeTag = (tag: string) => {
    updateField(
      'tags',
      (formData.tags ?? []).filter((t) => t !== tag),
    );
  };

  const save = useCallback(
    async (opts: { publish?: boolean; silent?: boolean } = {}) => {
      const current = formRef.current;
      if (!current.title.trim() || !current.content.trim()) {
        if (!opts.silent) {
          toast.push({ tone: 'warning', title: 'Missing content', description: 'Title and content are required.' });
        }
        return null;
      }
      if (!opts.silent) setLoading(true);
      setAutosaveStatus('saving');
      try {
        const publish = opts.publish ?? current.published;
        const payload: Record<string, unknown> = {
          title: current.title,
          content: current.content,
          excerpt: current.excerpt,
          coverImage: current.coverImage,
          tags: current.tags,
          featured: current.featured,
          published: publish,
        };
        if (slugTouched && current.slug) payload.slug = current.slug;

        const isUpdate = Boolean(persistedId);
        const res = await fetch('/api/admin/blog', {
          method: isUpdate ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isUpdate ? { id: persistedId, ...payload } : payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Save failed');

        const saved: BlogPost = data.post;
        setPersistedId(saved.id);
        setFormData((prev) => ({
          ...prev,
          id: saved.id,
          slug: saved.slug,
          published: saved.published,
          publishedAt: saved.publishedAt,
          updatedAt: saved.updatedAt,
          readingTimeMinutes: saved.readingTimeMinutes,
        }));
        setAutosaveStatus('saved');
        setLastSavedAt(Date.now());
        if (!opts.silent) {
          toast.push({
            tone: 'success',
            title: publish ? 'Post published' : 'Draft saved',
          });
          onSave?.(saved);
        }
        return saved;
      } catch (error) {
        setAutosaveStatus('error');
        if (!opts.silent) {
          toast.push({
            tone: 'error',
            title: 'Save failed',
            description: error instanceof Error ? error.message : 'Please try again',
          });
        }
        return null;
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [persistedId, slugTouched, onSave, toast],
  );

  // Autosave: only for already-persisted posts; debounced 2s after last edit.
  useEffect(() => {
    if (!persistedId) return;
    if (autosaveStatus !== 'dirty') return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      save({ silent: true });
    }, 2000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [formData, autosaveStatus, persistedId, save]);

  // Live stats refresh: pull viewCount / comments / reactions from the API on
  // mount and when the tab regains focus. Only stat fields are merged so we
  // never clobber the user's in-progress edits to title/content/etc.
  useEffect(() => {
    if (!persistedId) return;
    let cancelled = false;
    const refreshStats = async () => {
      try {
        const res = await fetch(`/api/admin/blog/${persistedId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { post: fresh } = (await res.json()) as { post: BlogPost };
        if (cancelled || !fresh) return;
        setFormData((prev) => ({
          ...prev,
          viewCount: fresh.viewCount ?? prev.viewCount,
          _count: fresh._count ?? prev._count,
        }));
      } catch {
        // Silent — stats are non-critical
      }
    };
    refreshStats();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshStats();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [persistedId]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 's') {
        e.preventDefault();
        save();
      } else if (document.activeElement === textareaRef.current) {
        if (k === 'b') {
          e.preventDefault();
          insertAtCursor('**', '**', 'bold');
        } else if (k === 'i') {
          e.preventDefault();
          insertAtCursor('*', '*', 'italic');
        } else if (k === 'k') {
          e.preventDefault();
          insertAtCursor('[', '](https://)', 'link text');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, insertAtCursor]);

  const autosaveLabel = (() => {
    switch (autosaveStatus) {
      case 'saving':
        return 'Saving…';
      case 'saved':
        return lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'Saved';
      case 'error':
        return 'Save failed';
      case 'dirty':
        return persistedId ? 'Unsaved changes' : 'Draft (not created yet)';
      default:
        return persistedId ? 'All changes saved' : 'New draft';
    }
  })();

  const autosaveTone = {
    saving: 'text-muted-foreground',
    saved: 'text-emerald-400',
    error: 'text-red-400',
    dirty: 'text-amber-400',
    idle: 'text-muted-foreground',
  }[autosaveStatus];

  const tags = formData.tags ?? [];
  const canSubmit = Boolean(formData.title.trim() && formData.content.trim());

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-background/90 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                aria-label="Back to blog list"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate">
                {persistedId ? 'Edit Post' : 'New Post'}
              </h1>
              <p className={`text-xs flex items-center gap-1.5 ${autosaveTone}`}>
                {autosaveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
                {autosaveStatus === 'saved' && <CheckCircle2 className="h-3 w-3" />}
                <span>{autosaveLabel}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewVisible((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              aria-pressed={previewVisible}
              title="Toggle preview (preview shows rendered markdown)"
            >
              {previewVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden sm:inline">{previewVisible ? 'Hide preview' : 'Show preview'}</span>
            </button>
            <button
              type="button"
              onClick={() => save({ publish: false })}
              disabled={loading || !canSubmit}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-white/5 border border-white/10 hover:bg-white/10 text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              Save draft
            </button>
            <button
              type="button"
              onClick={() => save({ publish: true })}
              disabled={loading || !canSubmit}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {formData.published ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Main editor column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Title */}
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Post title"
            className="w-full px-4 py-3 text-2xl font-bold bg-white/[0.03] border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
            aria-label="Post title"
          />

          {/* Meta bar */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              <span className="font-mono truncate max-w-[240px]" title={effectiveSlug}>
                /{effectiveSlug || 'auto-generated'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span className="tabular-nums">{wordCount.toLocaleString()} words</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span className="tabular-nums">{readingMinutes} min read</span>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-1.5 bg-white/[0.03] border border-white/10 rounded-lg sticky top-[73px] z-10">
            <ToolbarBtn label="Heading 1 (prepends # )" onClick={() => insertLineStart('# ', 'Heading 1')} icon={Heading1} />
            <ToolbarBtn label="Heading 2" onClick={() => insertLineStart('## ', 'Heading 2')} icon={Heading2} />
            <ToolbarBtn label="Heading 3" onClick={() => insertLineStart('### ', 'Heading 3')} icon={Heading3} />
            <div className="w-px h-5 bg-white/10 mx-1" aria-hidden />
            <ToolbarBtn label="Bold (⌘B)" onClick={() => insertAtCursor('**', '**', 'bold')} icon={Bold} />
            <ToolbarBtn label="Italic (⌘I)" onClick={() => insertAtCursor('*', '*', 'italic')} icon={Italic} />
            <ToolbarBtn label="Inline code" onClick={() => insertAtCursor('`', '`', 'code')} icon={Code} />
            <div className="w-px h-5 bg-white/10 mx-1" aria-hidden />
            <ToolbarBtn label="Link (⌘K)" onClick={() => insertAtCursor('[', '](https://)', 'link text')} icon={LinkIcon} />
            <ToolbarBtn
              label={inlineUploading ? 'Uploading image…' : 'Insert image'}
              onClick={() => inlineInputRef.current?.click()}
              icon={inlineUploading ? Loader2 : ImageIcon}
              spinning={inlineUploading}
            />
            <div className="w-px h-5 bg-white/10 mx-1" aria-hidden />
            <ToolbarBtn label="Bulleted list" onClick={toggleBulletList} icon={List} />
            <ToolbarBtn label="Numbered list" onClick={toggleOrderedList} icon={ListOrdered} />
            <ToolbarBtn label="Quote" onClick={() => insertLineStart('> ', 'quote')} icon={Quote} />
            <ToolbarBtn label="Code block" onClick={() => insertAtCursor('\n```\n', '\n```\n', 'code')} icon={Code2} />
          </div>

          <input
            ref={inlineInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInlineImageUpload}
          />

          {/* Editor + preview */}
          <div className={`grid gap-4 ${previewVisible ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
            <textarea
              ref={textareaRef}
              value={formData.content}
              onChange={(e) => updateField('content', e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Write in Markdown… **bold**, *italic*, `code`, ```blocks```, > quotes, # headings, lists, [links](url), ![images](url)"
              className="w-full min-h-[60vh] px-4 py-3 bg-white/[0.03] border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 font-mono text-sm leading-relaxed resize-y transition"
              aria-label="Post content"
              spellCheck
            />
            {previewVisible && (
              <div className="min-h-[60vh] px-5 py-4 bg-white/[0.03] border border-white/10 rounded-lg overflow-auto">
                <div className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-blockquote:border-primary/50 prose-blockquote:text-muted-foreground prose-img:rounded-lg">
                  {formData.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}>
                      {formData.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground italic">Preview will appear here as you write.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Status */}
          <section className="p-4 bg-white/[0.03] border border-white/10 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Status</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${formData.published ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-sm text-foreground">{formData.published ? 'Published' : 'Draft'}</span>
              </div>
              {formData.publishedAt && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {new Date(formData.publishedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <input
                type="checkbox"
                checked={Boolean(formData.featured)}
                onChange={(e) => updateField('featured', e.target.checked)}
                className="accent-primary"
              />
              <Star className={`h-4 w-4 ${formData.featured ? 'text-amber-400 fill-amber-400' : ''}`} />
              Featured post
            </label>
          </section>

          {/* Cover image */}
          <section className="p-4 bg-white/[0.03] border border-white/10 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Cover image</h3>
            {formData.coverImage ? (
              <div className="relative group rounded-lg overflow-hidden border border-white/10 aspect-[16/9]">
                <Image
                  src={formData.coverImage}
                  alt="Cover preview"
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => updateField('coverImage', null)}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition-opacity"
                  aria-label="Remove cover image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                className="w-full aspect-[16/9] rounded-lg border-2 border-dashed border-white/15 hover:border-primary/40 bg-white/[0.02] hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {coverUploading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-xs">Uploading…</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6" />
                    <span className="text-xs">Click to upload (max 8 MB)</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
          </section>

          {/* Tags */}
          <section className="p-4 bg-white/[0.03] border border-white/10 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Tags <span className="text-xs font-normal text-muted-foreground">({tags.length}/8)</span>
            </h3>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-primary/15 border border-primary/20 text-primary"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-foreground transition-colors"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagDraft);
                  } else if (e.key === 'Backspace' && !tagDraft && tags.length > 0) {
                    removeTag(tags[tags.length - 1]);
                  }
                }}
                placeholder="Add a tag…"
                disabled={tags.length >= 8}
                className="flex-1 px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => addTag(tagDraft)}
                disabled={!tagDraft.trim() || tags.length >= 8}
                className="px-3 py-1.5 text-sm bg-primary/15 border border-primary/30 rounded-md text-primary hover:bg-primary/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </section>

          {/* Excerpt */}
          <section className="p-4 bg-white/[0.03] border border-white/10 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Excerpt</h3>
            <textarea
              value={formData.excerpt}
              onChange={(e) => updateField('excerpt', e.target.value)}
              rows={3}
              maxLength={240}
              placeholder="A short summary shown in listings and search results."
              className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition resize-none"
            />
            <p className="mt-1 text-xs text-muted-foreground tabular-nums text-right">
              {(formData.excerpt || '').length}/240
            </p>
          </section>

          {/* Slug */}
          <section className="p-4 bg-white/[0.03] border border-white/10 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Slug</h3>
            <input
              type="text"
              value={slugTouched ? formData.slug || '' : effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                updateField('slug', slugify(e.target.value));
              }}
              placeholder="auto-from-title"
              className="w-full px-3 py-1.5 text-sm font-mono bg-white/5 border border-white/10 rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
            />
            {slugTouched && (
              <button
                type="button"
                onClick={() => {
                  setSlugTouched(false);
                  updateField('slug', '');
                }}
                className="mt-1 text-xs text-primary hover:underline"
              >
                Reset to auto from title
              </button>
            )}
          </section>

          {/* Stats (existing post) */}
          {persistedId && (
            <section className="p-4 bg-white/[0.03] border border-white/10 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground mb-3">Stats</h3>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Views</dt>
                <dd className="text-foreground text-right tabular-nums">
                  {(formData.viewCount ?? 0).toLocaleString()}
                </dd>
                <dt className="text-muted-foreground">Comments</dt>
                <dd className="text-foreground text-right tabular-nums">
                  {(formData._count?.comments ?? 0).toLocaleString()}
                </dd>
                <dt className="text-muted-foreground">Reactions</dt>
                <dd className="text-foreground text-right tabular-nums">
                  {(formData._count?.reactions ?? 0).toLocaleString()}
                </dd>
              </dl>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function ToolbarBtn({
  label,
  onClick,
  icon: Icon,
  spinning,
}: {
  label: string;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  spinning?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
    >
      <Icon className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} />
    </button>
  );
}
