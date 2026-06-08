import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { lookup } from 'dns/promises';
import http from 'http';
import https from 'https';

export const dynamic = 'force-dynamic';

// Small in-memory LRU so a crowded channel doesn't refetch the same 3 URLs
// every render. Capped by entry count because most previews are small JSON.
type Entry = { expiresAt: number; payload: PreviewPayload };
type PreviewPayload = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 256;
const cache = new Map<string, Entry>();

function setCache(key: string, payload: PreviewPayload) {
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
  if (cache.size > CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}

function getCache(key: string): PreviewPayload | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.payload;
}

// Expand an IPv6 string to its 8 hextet numbers (handling :: compression and a
// trailing dotted-IPv4 group), or null if unparseable. Lets us reliably detect
// IPv4-mapped/compatible forms — critical because new URL() normalizes
// [::ffff:169.254.169.254] to the hex form [::ffff:a9fe:a9fe].
function expandIpv6(input: string): number[] | null {
  let s = input;
  const pct = s.indexOf('%');
  if (pct >= 0) s = s.slice(0, pct); // strip zone id
  // Fold a trailing dotted IPv4 (e.g. ::ffff:1.2.3.4) into two hextets.
  const dot = s.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (dot) {
    const v4 = dot[2].split('.').map((n) => parseInt(n, 10));
    if (v4.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    s = `${dot[1]}${hi}:${lo}`;
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(':') : []) : null;
  let hextets: string[];
  if (tail === null) {
    hextets = head;
  } else {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    hextets = [...head, ...new Array(missing).fill('0'), ...tail];
  }
  if (hextets.length !== 8) return null;
  const nums = hextets.map((h) => (h === '' ? 0 : parseInt(h, 16)));
  if (nums.some((n) => !Number.isFinite(n) || n < 0 || n > 0xffff)) return null;
  return nums;
}

// Returns true if an IP literal (v4 or v6) is loopback / private / link-local /
// CGNAT / ULA — i.e. one that must never be fetched server-side.
function isPrivateIp(ip: string): boolean {
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const a = parseInt(v4[1], 10);
    const b = parseInt(v4[2], 10);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  const h = expandIpv6(ip.toLowerCase());
  if (!h) return true; // unparseable IPv6 — fail closed
  if (h.every((x) => x === 0)) return true; // ::
  if (h.slice(0, 7).every((x) => x === 0) && h[7] === 1) return true; // ::1 loopback
  // IPv4-mapped (::ffff:a.b.c.d) or IPv4-compatible (::a.b.c.d): first 5 hextets
  // zero and the 6th is 0 or 0xffff — re-check the embedded IPv4.
  if (h[0] === 0 && h[1] === 0 && h[2] === 0 && h[3] === 0 && h[4] === 0 && (h[5] === 0 || h[5] === 0xffff)) {
    const a = (h[6] >> 8) & 0xff, b = h[6] & 0xff, c = (h[7] >> 8) & 0xff, d = h[7] & 0xff;
    return isPrivateIp(`${a}.${b}.${c}.${d}`);
  }
  if ((h[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((h[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  return false;
}

// A URL that passed the SSRF guard, carrying the exact IP it resolved to so the
// fetch can be PINNED to that address (closing the DNS-rebinding TOCTOU window
// between validation and connection).
type SafeTarget = { url: URL; address: string; family: number };

// SSRF guard — reject anything that isn't plainly a public http(s) URL, then
// resolve DNS and reject if ANY resolved address is private/loopback/link-local.
// Returns the validated URL together with the resolved IP to pin the connection
// to; the DNS resolution is what blocks internal DNS names and rebinding.
async function safeUrl(raw: string): Promise<SafeTarget | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  if (!host) return null;
  if (host === 'localhost' || host.endsWith('.localhost')) return null;
  // If the host is already an IP literal, check + pin it directly.
  const literal = host.replace(/^\[|\]$/g, '');
  const isV4 = /^\d+\.\d+\.\d+\.\d+$/.test(literal);
  const isV6 = literal.includes(':');
  if (isV4 || isV6) {
    if (isPrivateIp(literal)) return null;
    return { url, address: literal, family: isV6 ? 6 : 4 };
  }
  // Otherwise resolve every A/AAAA record, reject if any is private, and pin
  // the first validated address for the connection.
  try {
    const records = await lookup(host, { all: true });
    if (records.length === 0) return null;
    for (const r of records) {
      if (isPrivateIp(r.address)) return null;
    }
    return { url, address: records[0].address, family: records[0].family };
  } catch {
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
}

function pickMeta(html: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`,
      'i'
    );
    const m = html.match(re);
    if (!m) continue;
    const contentMatch = m[0].match(/content=["']([^"']*)["']/i);
    if (contentMatch) return decodeEntities(contentMatch[1]).trim();
  }
  return null;
}

function pickTitle(html: string): string | null {
  const og = pickMeta(html, ['og:title', 'twitter:title']);
  if (og) return og;
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (m) return decodeEntities(m[1]).trim();
  return null;
}

type RawResponse = {
  status: number;
  location?: string;
  contentType: string;
  readBody: (capBytes: number) => Promise<string>;
};

// Custom DNS resolver that always returns the pre-validated IP. Handles both the
// single-result and all:true callback shapes Node's connect logic may use.
function makePinnedLookup(address: string, family: number) {
  return (_hostname: string, options: any, cb: any) => {
    if (options && options.all) cb(null, [{ address, family }]);
    else cb(null, address, family);
  };
}

// One pinned HTTP(S) request — no automatic redirect following. The connection
// is forced to the IP safeUrl() already validated, so a DNS-rebinding attacker
// cannot swap in a private IP between the check and the connect. The hostname
// still drives the Host header and TLS SNI, keeping certificate validation intact.
function pinnedRequest(target: URL, pin: SafeTarget, signal: AbortSignal): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const mod = target.protocol === 'https:' ? https : http;
    const req = mod.request(
      target,
      {
        method: 'GET',
        lookup: makePinnedLookup(pin.address, pin.family) as any,
        signal,
        headers: {
          'User-Agent': 'GeeksTalkBot/1.0 (+link-preview)',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        const loc = res.headers.location;
        const contentType = (res.headers['content-type'] || '') as string;
        const readBody = (capBytes: number) =>
          new Promise<string>((resolveBody) => {
            const decoder = new TextDecoder('utf-8');
            let html = '';
            let total = 0;
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              resolveBody(html);
            };
            res.on('data', (chunk: Buffer) => {
              if (done) return;
              total += chunk.byteLength;
              html += decoder.decode(chunk, { stream: true });
              if (total >= capBytes || /<\/head>/i.test(html)) {
                res.destroy();
                finish();
              }
            });
            res.on('end', finish);
            res.on('close', finish);
            res.on('error', finish);
          });
        resolve({ status, location: typeof loc === 'string' ? loc : undefined, contentType, readBody });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function fetchPreview(initial: SafeTarget): Promise<PreviewPayload | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    // Follow redirects MANUALLY, re-resolving + re-validating + re-pinning each
    // hop. Otherwise a public URL could 30x-redirect to an internal host (e.g.
    // the cloud metadata endpoint) after the initial safeUrl() check passed.
    let current = initial;
    let resp: RawResponse | null = null;
    for (let hop = 0; hop < 4; hop++) {
      resp = await pinnedRequest(current.url, current, controller.signal);
      if (resp.status >= 300 && resp.status < 400) {
        if (!resp.location) return null;
        const next = await safeUrl(new URL(resp.location, current.url).toString());
        if (!next) return null;
        current = next;
        continue;
      }
      break;
    }
    if (!resp || resp.status < 200 || resp.status >= 300) return null;
    if (!resp.contentType.includes('text/html') && !resp.contentType.includes('application/xhtml')) return null;
    // Read up to ~256KB — big pages waste memory and OG usually sits in <head>.
    const html = await resp.readBody(256 * 1024);
    const target = current.url;
    const title = pickTitle(html);
    const description = pickMeta(html, ['og:description', 'twitter:description', 'description']);
    let image = pickMeta(html, ['og:image:secure_url', 'og:image', 'twitter:image']);
    if (image && image.startsWith('//')) image = `${target.protocol}${image}`;
    else if (image && image.startsWith('/')) image = `${target.origin}${image}`;
    const siteName = pickMeta(html, ['og:site_name', 'application-name']) || target.hostname.replace(/^www\./, '');
    if (!title && !description && !image) return null;
    return {
      url: target.toString(),
      title,
      description,
      image,
      siteName,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rl = await rateLimit(`link-preview:${session.user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('url');
  if (!raw) return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  const target = await safeUrl(raw);
  if (!target) return NextResponse.json({ error: 'Invalid or blocked URL' }, { status: 400 });
  const key = target.url.toString();
  const cached = getCache(key);
  if (cached) return NextResponse.json(cached);
  const preview = await fetchPreview(target);
  if (!preview) return NextResponse.json({ error: 'No preview' }, { status: 204 });
  setCache(key, preview);
  return NextResponse.json(preview);
}
