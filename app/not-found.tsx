import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f10]">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white mb-4">Not Found</h2>
        <p className="text-gray-400 mb-6">Could not find the requested resource.</p>
        <Link
          href="/"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
