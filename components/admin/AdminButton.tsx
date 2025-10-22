'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';

export default function AdminButton() {
  const [adminHash, setAdminHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    fetch('/api/admin/check')
      .then(r => r.json())
      .then(data => {
        if (data.isAdmin && data.adminHash) {
          setAdminHash(data.adminHash);
        }
      })
      .catch(error => {
        console.error('Failed to check admin status:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);
  
  if (loading) {
    return null;
  }
  
  if (!adminHash) {
    return null;
  }
  
  return (
    <button
      onClick={() => router.push(`/admin/${adminHash}`)}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors border border-purple-500/30 hover:border-purple-500/50"
    >
      <Shield size={18} />
      <span className="font-medium">AD</span>
    </button>
  );
}
