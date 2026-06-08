import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  type LucideIcon,
} from 'lucide-react';

export type FileSource = 'voice' | 'channel';
export type FileCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'spreadsheet'
  | 'archive'
  | 'code'
  | 'other';

export interface AdminFileRecord {
  id: string;
  source: FileSource;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  createdAt: string;
  uploader: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    image: string | null;
  } | null;
  channel: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
  groupNumber: number | null;
}

export interface FileStats {
  counts: {
    total: number;
    voice: number;
    channel: number;
  };
  size: {
    total: number;
    byCategory: Record<FileCategory, number>;
  };
}

const CATEGORY_ICONS: Record<FileCategory, LucideIcon> = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  archive: FileArchive,
  code: FileCode,
  other: File,
};

// Intentionally borderless — see lib/databaseAdmin.ts for the rationale. Do not
// re-introduce `border-*` classes; tint + text color alone carries the category.
const CATEGORY_STYLES: Record<FileCategory, string> = {
  image: 'bg-emerald-500/10 text-emerald-300',
  video: 'bg-fuchsia-500/10 text-fuchsia-300',
  audio: 'bg-sky-500/10 text-sky-300',
  document: 'bg-amber-500/10 text-amber-300',
  spreadsheet: 'bg-teal-500/10 text-teal-300',
  archive: 'bg-orange-500/10 text-orange-300',
  code: 'bg-purple-500/10 text-purple-300',
  other: 'bg-white/5 text-muted-foreground',
};

const CATEGORY_LABELS: Record<FileCategory, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  spreadsheet: 'Spreadsheet',
  archive: 'Archive',
  code: 'Code',
  other: 'Other',
};

const DOC_EXTS = new Set(['pdf', 'doc', 'docx', 'rtf', 'txt', 'md', 'odt', 'pages']);
const SHEET_EXTS = new Set(['xls', 'xlsx', 'csv', 'tsv', 'numbers', 'ods']);
const ARCHIVE_EXTS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']);
const CODE_EXTS = new Set([
  'js', 'ts', 'tsx', 'jsx', 'json', 'yaml', 'yml', 'xml', 'html', 'css',
  'scss', 'sass', 'less', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift',
  'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'sh', 'bash', 'zsh', 'sql',
]);

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function categorizeFile(mime: string, name: string): FileCategory {
  const ext = extOf(name);
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf' || DOC_EXTS.has(ext)) return 'document';
  if (SHEET_EXTS.has(ext) || mime.includes('spreadsheet') || mime === 'text/csv') {
    return 'spreadsheet';
  }
  if (
    ARCHIVE_EXTS.has(ext) ||
    mime === 'application/zip' ||
    mime === 'application/x-tar' ||
    mime === 'application/x-7z-compressed' ||
    mime === 'application/vnd.rar'
  ) {
    return 'archive';
  }
  if (CODE_EXTS.has(ext) || mime.startsWith('text/') || mime === 'application/json') {
    return 'code';
  }
  return 'other';
}

export function categoryMeta(cat: FileCategory): {
  label: string;
  icon: LucideIcon;
  className: string;
} {
  return {
    label: CATEGORY_LABELS[cat],
    icon: CATEGORY_ICONS[cat],
    className: CATEGORY_STYLES[cat],
  };
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const val = bytes / Math.pow(k, i);
  return `${val >= 10 || i === 0 ? val.toFixed(0) : val.toFixed(1)} ${sizes[i]}`;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '—';
  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  const units: Array<[number, string]> = [
    [60_000, 's'],
    [3_600_000, 'm'],
    [86_400_000, 'h'],
    [604_800_000, 'd'],
    [2_592_000_000, 'w'],
    [31_536_000_000, 'mo'],
  ];
  if (abs < 60_000) return 'just now';
  for (let i = 0; i < units.length - 1; i++) {
    const [threshold, label] = units[i + 1]!;
    if (abs < threshold) {
      const [prev] = units[i]!;
      const n = Math.floor(abs / prev);
      return diff >= 0 ? `${n}${label} ago` : `in ${n}${label}`;
    }
  }
  const years = Math.floor(abs / units[units.length - 1]![0]);
  return diff >= 0 ? `${years}y ago` : `in ${years}y`;
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return Promise.resolve(false);
  }
  return navigator.clipboard
    .writeText(text)
    .then(() => true)
    .catch(() => false);
}

export const FILE_SOURCES = [
  { value: 'all' as const, label: 'All sources' },
  { value: 'voice' as const, label: 'Voice chat' },
  { value: 'channel' as const, label: 'Text channel' },
];

export const FILE_CATEGORIES: Array<{ value: 'all' | FileCategory; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'document', label: 'Documents' },
  { value: 'spreadsheet', label: 'Spreadsheets' },
  { value: 'archive', label: 'Archives' },
  { value: 'code', label: 'Code' },
  { value: 'other', label: 'Other' },
];

export const FILE_ORDER_FIELDS = [
  { value: 'createdAt' as const, label: 'Upload date' },
  { value: 'fileName' as const, label: 'Name' },
  { value: 'fileSize' as const, label: 'Size' },
  { value: 'fileType' as const, label: 'Type' },
];
export type FileOrderField = (typeof FILE_ORDER_FIELDS)[number]['value'];

export const FILE_PAGE_SIZES = [25, 50, 100, 200] as const;
export type FilePageSize = (typeof FILE_PAGE_SIZES)[number];
export function isValidFilePageSize(n: number): n is FilePageSize {
  return (FILE_PAGE_SIZES as readonly number[]).includes(n);
}
