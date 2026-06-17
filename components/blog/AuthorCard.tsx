import Image from 'next/image';
import Link from 'next/link';
import { User } from 'lucide-react';

interface Props {
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    bio?: string | null;
  };
}

export default function AuthorCard({ author }: Props) {
  const displayName = author.name || author.username || 'Anonymous';
  const profileHref = author.username ? `/profile/${author.username}` : null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[color:var(--card-bg)]/50 backdrop-blur-xl p-5 md:p-6 flex items-start gap-4">
      {author.image ? (
        <Image
          src={author.image}
          alt={displayName}
          width={56}
          height={56}
          className="rounded-full ring-2 ring-[color:hsl(var(--primary)/0.25)] flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-[color:hsl(var(--primary)/0.2)] grid place-items-center ring-2 ring-[color:hsl(var(--primary)/0.25)] flex-shrink-0">
          <User className="w-6 h-6 text-[color:hsl(var(--primary))]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[rgba(220,235,255,0.55)]">
          Written by
        </div>
        {profileHref ? (
          <Link
            href={profileHref}
            className="mt-1 inline-block text-lg font-semibold text-[rgba(236,245,255,0.95)] hover:text-[color:hsl(var(--primary))] transition"
          >
            {displayName}
          </Link>
        ) : (
          <div className="mt-1 text-lg font-semibold text-[rgba(236,245,255,0.95)]">{displayName}</div>
        )}
        {author.bio ? (
          <p className="mt-2 text-sm text-[rgba(220,235,255,0.75)] leading-relaxed line-clamp-3">{author.bio}</p>
        ) : (
          <p className="mt-2 text-sm text-[rgba(220,235,255,0.6)] italic">Writing about what we learn building Geeks Talk.</p>
        )}
      </div>
    </div>
  );
}
