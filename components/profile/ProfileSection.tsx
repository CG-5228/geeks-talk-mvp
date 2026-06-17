'use client';

import { useState } from 'react';
import AvatarUploader from './AvatarUploader';
import { Twitter, Github, Linkedin, Instagram, Youtube } from 'lucide-react';

type SocialLinks = {
  twitter?: string | null;
  github?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  youtube?: string | null;
};

export type ProfileInitial = {
  username: string;
  displayName: string | null;
  bio: string | null;
  pronouns: string | null;
  location: string | null;
  website: string | null;
  socialLinks: SocialLinks | null;
  image: string | null;
  email: string | null;
};

export default function ProfileSection({ initial }: { initial: ProfileInitial }) {
  const [username, setUsername] = useState(initial.username || '');
  const [displayName, setDisplayName] = useState(initial.displayName || '');
  const [bio, setBio] = useState(initial.bio || '');
  const [pronouns, setPronouns] = useState(initial.pronouns || '');
  const [location, setLocation] = useState(initial.location || '');
  const [website, setWebsite] = useState(initial.website || '');
  const [socials, setSocials] = useState<SocialLinks>({
    twitter: initial.socialLinks?.twitter || '',
    github: initial.socialLinks?.github || '',
    linkedin: initial.socialLinks?.linkedin || '',
    instagram: initial.socialLinks?.instagram || '',
    youtube: initial.socialLinks?.youtube || '',
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          displayName: displayName || null,
          bio: bio || null,
          pronouns: pronouns || null,
          location: location || null,
          website: website || undefined,
          socialLinks: {
            twitter: socials.twitter || null,
            github: socials.github || null,
            linkedin: socials.linkedin || null,
            instagram: socials.instagram || null,
            youtube: socials.youtube || null,
          },
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated' });
      } else {
        setMessage({ type: 'error', text: d.error || 'Failed to update profile' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setPending(false);
    }
  }

  const socialFields: { key: keyof SocialLinks; label: string; placeholder: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'twitter', label: 'Twitter / X', placeholder: '@handle', Icon: Twitter },
    { key: 'github', label: 'GitHub', placeholder: 'username', Icon: Github },
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'username or /in/username', Icon: Linkedin },
    { key: 'instagram', label: 'Instagram', placeholder: '@handle', Icon: Instagram },
    { key: 'youtube', label: 'YouTube', placeholder: '@channel', Icon: Youtube },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This information appears on your public profile.
        </p>
      </div>

      <div className="flex justify-center">
        <AvatarUploader initialUrl={initial.image} />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Username" hint="3–24 chars · letters, numbers, underscores">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={24}
            className={inputCls}
          />
        </Field>
        <Field label="Display name" hint="Shown above @username">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            placeholder="How you'd like to be called"
            className={inputCls}
          />
        </Field>
        <Field label="Pronouns" hint="e.g. she/her, they/them">
          <input
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
            maxLength={30}
            className={inputCls}
          />
        </Field>
        <Field label="Location" hint="City, country, or remote">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={80}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Website" hint="Must start with http:// or https://">
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yoursite.com"
          className={inputCls}
        />
      </Field>

      <Field label="Bio" hint={`${bio.length}/280 characters`}>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 280))}
          rows={3}
          placeholder="Tell us about yourself…"
          className={`${inputCls} resize-none`}
        />
      </Field>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Social links</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {socialFields.map(({ key, label, placeholder, Icon }) => (
            <label key={key} className="flex items-center gap-2 rounded-lg border border-border/20 bg-card/30 px-3 py-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground w-20">{label}</span>
              <input
                value={socials[key] || ''}
                onChange={(e) => setSocials((s) => ({ ...s, [key]: e.target.value }))}
                placeholder={placeholder}
                maxLength={64}
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={pending}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`text-sm ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg px-4 py-2.5 bg-card/30 border border-border/20 text-foreground placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/50';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="block text-sm font-medium text-foreground">{label}</label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
