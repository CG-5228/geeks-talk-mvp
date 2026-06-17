import {
  Binary,
  Braces,
  Calendar,
  Clock,
  FileText,
  Hash,
  Key,
  Link2,
  List,
  ToggleLeft,
  Type,
  type LucideIcon,
} from 'lucide-react';

export type PrismaScalar =
  | 'String'
  | 'Int'
  | 'BigInt'
  | 'Float'
  | 'Decimal'
  | 'Boolean'
  | 'DateTime'
  | 'Json'
  | 'Bytes'
  | 'Enum'
  | 'Relation'
  | 'Unknown';

export interface SchemaField {
  name: string;
  type: string;
  kind: 'scalar' | 'object' | 'enum' | 'unsupported';
  isList: boolean;
  isRequired: boolean;
  isId: boolean;
  isUnique: boolean;
  hasDefault: boolean;
  isReadOnly: boolean;
  isUpdatedAt: boolean;
}

export interface TableMeta {
  name: string;
  displayName: string;
  count: number;
  writable: boolean;
}

export interface FieldBadge {
  label: string;
  icon: LucideIcon;
  className: string;
}

// Badges are intentionally borderless — background tint + colored text is enough
// to convey scalar type. Adding a border (even a subtle one like border-white/10)
// reads as a white edge against the dark panel and looks sloppy. Do not re-add
// `border-*` classes here or the base `border` utility on the badge span.
const SCALAR_STYLES: Record<PrismaScalar, { icon: LucideIcon; className: string }> = {
  String: { icon: Type, className: 'bg-emerald-500/10 text-emerald-300' },
  Int: { icon: Hash, className: 'bg-sky-500/10 text-sky-300' },
  BigInt: { icon: Hash, className: 'bg-sky-500/10 text-sky-300' },
  Float: { icon: Hash, className: 'bg-sky-500/10 text-sky-300' },
  Decimal: { icon: Hash, className: 'bg-sky-500/10 text-sky-300' },
  Boolean: { icon: ToggleLeft, className: 'bg-amber-500/10 text-amber-300' },
  DateTime: { icon: Clock, className: 'bg-purple-500/10 text-purple-300' },
  Json: { icon: Braces, className: 'bg-orange-500/10 text-orange-300' },
  Bytes: { icon: Binary, className: 'bg-fuchsia-500/10 text-fuchsia-300' },
  Enum: { icon: List, className: 'bg-teal-500/10 text-teal-300' },
  Relation: { icon: Link2, className: 'bg-white/5 text-muted-foreground' },
  Unknown: { icon: FileText, className: 'bg-white/5 text-muted-foreground' },
};

function normalizeScalar(type: string, kind: string): PrismaScalar {
  if (kind === 'object') return 'Relation';
  if (kind === 'enum') return 'Enum';
  switch (type) {
    case 'String':
    case 'Int':
    case 'BigInt':
    case 'Float':
    case 'Decimal':
    case 'Boolean':
    case 'DateTime':
    case 'Json':
    case 'Bytes':
      return type;
    default:
      return 'Unknown';
  }
}

export function fieldBadge(field: SchemaField): FieldBadge {
  if (field.isId) {
    return {
      label: 'ID',
      icon: Key,
      className: 'bg-primary/15 text-primary',
    };
  }
  const scalar = normalizeScalar(field.type, field.kind);
  const style = SCALAR_STYLES[scalar];
  const label = field.isList ? `${field.type}[]` : field.type;
  return { label, icon: style.icon, className: style.className };
}

export function inferredScalar(value: unknown): PrismaScalar {
  if (value === null || value === undefined) return 'Unknown';
  if (typeof value === 'boolean') return 'Boolean';
  if (typeof value === 'number') return 'Int';
  if (typeof value === 'bigint') return 'BigInt';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return 'DateTime';
    return 'String';
  }
  if (value instanceof Date) return 'DateTime';
  if (Array.isArray(value)) return 'Json';
  if (typeof value === 'object') return 'Json';
  return 'Unknown';
}

export function valueBadge(value: unknown): FieldBadge {
  const scalar = inferredScalar(value);
  const style = SCALAR_STYLES[scalar];
  return { label: scalar, icon: style.icon, className: style.className };
}

export function formatCell(value: unknown, opts?: { max?: number }): string {
  const max = opts?.max ?? 80;
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number' || typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    return value.length > max ? `${value.slice(0, max)}…` : value;
  }
  try {
    const json = JSON.stringify(value);
    return json.length > max ? `${json.slice(0, max)}…` : json;
  } catch {
    return String(value);
  }
}

export function formatFull(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function isScalarValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean'
  );
}

/**
 * Flatten a record to CSV-safe scalars. Objects/arrays become JSON strings;
 * dates become ISO strings; BigInt becomes string.
 */
export function flattenForExport(record: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) {
      out[key] = null;
    } else if (typeof value === 'bigint') {
      out[key] = value.toString();
    } else if (value instanceof Date) {
      out[key] = value.toISOString();
    } else if (typeof value === 'object') {
      try {
        out[key] = JSON.stringify(value);
      } catch {
        out[key] = String(value);
      }
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      out[key] = value;
    } else {
      out[key] = String(value);
    }
  }
  return out;
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

export const DATABASE_PAGE_SIZES = [25, 50, 100, 200] as const;
export type DatabasePageSize = (typeof DATABASE_PAGE_SIZES)[number];

export function isValidPageSize(n: number): n is DatabasePageSize {
  return (DATABASE_PAGE_SIZES as readonly number[]).includes(n);
}
