import { Prisma } from '@prisma/client';
import { db } from './db';

/**
 * Tables explicitly blocked from the admin DB viewer. These are Prisma/NextAuth
 * internals that admins should not be poking at directly, or are too sensitive
 * to expose through a generic row-level tool.
 */
const BLOCKED_MODELS = new Set<string>([
  'AdminAuditLog',
  // NextAuth/auth internals whose rows are entirely secret material — never
  // expose them through the generic row viewer.
  'Account',
  'Session',
  'VerificationToken',
]);

/**
 * Per-model columns that must never be serialized to the admin client even on
 * models that are otherwise browsable. Password hashes, 2FA secrets, OAuth
 * tokens, and verification-code hashes leak credential material. safeSelect()
 * builds an explicit Prisma `select` that omits these.
 */
const SENSITIVE_FIELDS: Record<string, string[]> = {
  User: ['hashedPassword', 'twoFactorSecret', 'twoFactorBackupCodes'],
  EmailCode: ['codeHash'],
  Room: ['passwordHash'],
  Account: ['refresh_token', 'access_token', 'id_token', 'session_state'],
  Session: ['sessionToken'],
  VerificationToken: ['token'],
};

/**
 * Models allowed to accept mutation (DELETE) via the generic DB API.
 * Everything else is read-only — deletions of core user data must happen
 * through the purpose-built admin routes that also cascade correctly.
 */
const WRITABLE_MODELS = new Set<string>([
  'DailyStats',
  'UserActivity',
]);

/**
 * Turn a PascalCase model name into a readable label.
 *  "VoiceGroupMember" → "Voice Group Member"
 *  "BlogPost"         → "Blog Post"
 */
export function humanizeModel(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}

function firstLowerCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

export function getModel(modelName: string): unknown {
  if (BLOCKED_MODELS.has(modelName)) return null;
  const model = (db as unknown as Record<string, unknown>)[firstLowerCase(modelName)];
  return model && typeof model === 'object' ? model : null;
}

export function isWritable(modelName: string): boolean {
  return WRITABLE_MODELS.has(modelName);
}

export interface ModelInfo {
  name: string;
  displayName: string;
  writable: boolean;
}

export function listModels(): ModelInfo[] {
  const models = Prisma.dmmf.datamodel.models
    .map((m) => m.name)
    .filter((n) => !BLOCKED_MODELS.has(n))
    .filter((n) => getModel(n) != null)
    .sort((a, b) => a.localeCompare(b));

  return models.map((name) => ({
    name,
    displayName: humanizeModel(name),
    writable: isWritable(name),
  }));
}

export interface DmmfField {
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

export function modelSchema(modelName: string): DmmfField[] | null {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName);
  if (!model) return null;
  return model.fields.map((f) => ({
    name: f.name,
    type: f.type,
    kind: f.kind as DmmfField['kind'],
    isList: !!f.isList,
    isRequired: !!f.isRequired,
    isId: !!f.isId,
    isUnique: !!f.isUnique,
    hasDefault: !!f.hasDefaultValue,
    isReadOnly: !!f.isReadOnly,
    isUpdatedAt: !!f.isUpdatedAt,
  }));
}

/**
 * Names of scalar string fields — the set we can safely build a case-insensitive
 * `contains` OR-group over for a search query. Skips id-ish fields only when the
 * search is short (to avoid misleading "contains 'a'" matches on a cuid).
 */
export function searchableStringFields(modelName: string): string[] {
  const schema = modelSchema(modelName);
  if (!schema) return [];
  return schema
    .filter((f) => f.kind === 'scalar' && f.type === 'String' && !f.isList)
    .map((f) => f.name);
}

/**
 * Return the best default ordering field: createdAt if present, else id.
 */
export function defaultOrderField(modelName: string): string {
  const schema = modelSchema(modelName);
  if (!schema) return 'id';
  if (schema.some((f) => f.name === 'createdAt')) return 'createdAt';
  return 'id';
}

/**
 * Confirm that a field exists on the model and is a scalar — the only safe
 * target for `orderBy`.
 */
export function isScalarField(modelName: string, fieldName: string): boolean {
  const schema = modelSchema(modelName);
  if (!schema) return false;
  const f = schema.find((x) => x.name === fieldName);
  return !!f && f.kind === 'scalar' && !f.isList;
}

/**
 * Build an explicit Prisma `select` over a model's scalar/enum fields, omitting
 * any sensitive columns. Returns undefined when the model has no denylisted
 * fields, so findMany keeps its default (all-columns) behavior for everything
 * non-sensitive.
 */
export function safeSelect(modelName: string): Record<string, true> | undefined {
  const denied = SENSITIVE_FIELDS[modelName];
  if (!denied || denied.length === 0) return undefined;
  const schema = modelSchema(modelName);
  if (!schema) return undefined;
  const deniedSet = new Set(denied);
  const select: Record<string, true> = {};
  for (const f of schema) {
    if ((f.kind === 'scalar' || f.kind === 'enum') && !deniedSet.has(f.name)) {
      select[f.name] = true;
    }
  }
  return select;
}

export function serializeBigInt<T>(value: T): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map((v) => serializeBigInt(v));
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeBigInt(v);
    }
    return out;
  }
  return value;
}
