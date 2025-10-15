import Link from 'next/link';

export default function SubjectNav() {
  // Placeholder subject links. Replace with dynamic fetch as you build out data.
  const subjects = [
    { slug: 'cs', name: 'CS' },
    { slug: 'math', name: 'Math' },
    { slug: 'ai', name: 'AI' },
  ];

  return (
    <nav className="flex items-center gap-3 text-sm text-gray-700">
      {subjects.map((s) => (
        <Link key={s.slug} href={`/subjects/${s.slug}`} className="hover:underline">
          {s.name}
        </Link>
      ))}
    </nav>
  );
}
