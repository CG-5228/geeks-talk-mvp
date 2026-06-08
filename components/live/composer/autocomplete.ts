import emojiData from '@emoji-mart/data';

export type AutocompleteTrigger = 'mention' | 'emoji' | 'slash';

export type AutocompleteToken = {
  trigger: AutocompleteTrigger;
  query: string;
  start: number; // index in text where the trigger char is
  end: number;   // exclusive end (cursor position)
};

export type MentionSuggestion = {
  kind: 'mention';
  id: string;
  name: string;
  username: string;
  image: string | null;
  onlineStatus: 'online' | 'away' | 'offline';
  insert: string; // what gets inserted (e.g. "@username")
};

export type EmojiSuggestion = {
  kind: 'emoji';
  id: string;
  name: string;
  native: string;
  insert: string; // the native emoji
};

export type SlashSuggestion = {
  kind: 'slash';
  id: string;
  name: string;        // e.g. "/me"
  description: string; // help text
  insert: string;      // what to stage in the input
  commit?: 'immediate' | 'stage'; // 'stage' leaves the command in place for the user to finish typing
};

export type AnySuggestion = MentionSuggestion | EmojiSuggestion | SlashSuggestion;

/**
 * Parse the text around the cursor to detect whether the user is mid-token
 * on an @mention, :emoji-shortcode, or /slash command. Returns null when
 * nothing matches.
 */
export function detectToken(text: string, cursor: number): AutocompleteToken | null {
  if (cursor <= 0) return null;

  // Slash: only when the command is at the very start of the message.
  if (text.startsWith('/')) {
    const upTo = text.slice(0, cursor);
    // Only trigger while on the first line/word of the input.
    if (!/\s/.test(upTo) || upTo.split(/\s/)[0].length === upTo.length) {
      const match = upTo.match(/^\/([A-Za-z0-9_-]*)$/);
      if (match) {
        return { trigger: 'slash', query: match[1], start: 0, end: cursor };
      }
    }
  }

  // Walk back from cursor to find the most recent trigger char.
  let i = cursor - 1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === '@' || ch === ':') {
      const before = i > 0 ? text[i - 1] : '';
      const isBoundary = i === 0 || /\s|[.,;!?(]/.test(before);
      if (!isBoundary) return null;
      const query = text.slice(i + 1, cursor);
      // Mention must be alphanumeric/underscore
      if (ch === '@' && /^[A-Za-z0-9_]{0,32}$/.test(query)) {
        return { trigger: 'mention', query, start: i, end: cursor };
      }
      // Emoji shortcode must be alnum + underscore + dash
      if (ch === ':' && /^[A-Za-z0-9_+-]{1,32}$/.test(query)) {
        return { trigger: 'emoji', query, start: i, end: cursor };
      }
      return null;
    }
    if (/\s/.test(ch)) return null; // hit whitespace without finding a trigger
    i--;
  }
  return null;
}

const SLASH_COMMANDS: SlashSuggestion[] = [
  {
    kind: 'slash',
    id: 'me',
    name: '/me',
    description: 'Describe what you are doing (italicized)',
    insert: '/me ',
    commit: 'stage',
  },
  {
    kind: 'slash',
    id: 'shrug',
    name: '/shrug',
    description: 'Append ¯\\_(ツ)_/¯ to your message',
    insert: '¯\\_(ツ)_/¯',
    commit: 'immediate',
  },
  {
    kind: 'slash',
    id: 'tableflip',
    name: '/tableflip',
    description: 'Flip the table: (╯°□°)╯︵ ┻━┻',
    insert: '(╯°□°)╯︵ ┻━┻',
    commit: 'immediate',
  },
  {
    kind: 'slash',
    id: 'unflip',
    name: '/unflip',
    description: 'Put the table back: ┬─┬ ノ( ゜-゜ノ)',
    insert: '┬─┬ ノ( ゜-゜ノ)',
    commit: 'immediate',
  },
  {
    kind: 'slash',
    id: 'help',
    name: '/help',
    description: 'Show keyboard shortcuts',
    insert: '/help',
    commit: 'stage',
  },
];

export function getSlashSuggestions(query: string, limit = 8): SlashSuggestion[] {
  const q = query.toLowerCase();
  if (!q) return SLASH_COMMANDS.slice(0, limit);
  return SLASH_COMMANDS.filter(
    (c) =>
      c.name.slice(1).toLowerCase().startsWith(q) ||
      c.description.toLowerCase().includes(q),
  ).slice(0, limit);
}

type RawEmoji = {
  id: string;
  name: string;
  keywords?: string[];
  skins?: Array<{ native?: string }>;
};

const EMOJI_INDEX: Array<{ id: string; name: string; native: string; keywords: string[] }> = (() => {
  const raw = (emojiData as unknown as { emojis: Record<string, RawEmoji> }).emojis;
  return Object.values(raw)
    .map((e) => ({
      id: e.id,
      name: e.name,
      native: e.skins?.[0]?.native ?? '',
      keywords: e.keywords ?? [],
    }))
    .filter((e) => e.native);
})();

export function getEmojiSuggestions(query: string, limit = 8): EmojiSuggestion[] {
  if (!query) return [];
  const q = query.toLowerCase();
  const scored: Array<{ s: EmojiSuggestion; score: number }> = [];
  for (const e of EMOJI_INDEX) {
    let score = 0;
    if (e.id.startsWith(q)) score = 100;
    else if (e.id.includes(q)) score = 60;
    else if (e.keywords.some((k) => k.startsWith(q))) score = 50;
    else if (e.name.toLowerCase().includes(q)) score = 30;
    if (score > 0) {
      scored.push({
        s: {
          kind: 'emoji',
          id: e.id,
          name: e.name,
          native: e.native,
          insert: e.native,
        },
        score,
      });
    }
    if (scored.length > 200) break; // keep the scan bounded
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s);
}
