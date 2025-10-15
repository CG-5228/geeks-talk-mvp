// Simple placeholder moderation: flags messages containing banned words.
// Replace with a real moderation service later.
const banned = [
  'spam',
  'scam',
  'offensive',
];

export async function moderateMessage(text: string): Promise<boolean> {
  if (!text) return false;
  const lower = text.toLowerCase();
  return banned.some((w) => lower.includes(w));
}
