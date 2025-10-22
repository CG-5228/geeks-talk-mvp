'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminHash, setAdminHash] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();
  const hash = params.hash as string;
  
  useEffect(() => {
    const validateAccess = async () => {
      try {
        const response = await fetch('/api/admin/check');
        const data = await response.json();
        
        if (!data.isAdmin || !data.adminHash) {
          router.push('/');
          return;
        }
        
        if (data.adminHash !== hash) {
          router.push(`/admin/${data.adminHash}`);
          return;
        }
        
        setAdminHash(data.adminHash);
        setIsValid(true);
      } catch (error) {
        console.error('Failed to validate admin access:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    
    validateAccess();
  }, [hash, router]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-white/70">Validating admin access...</p>
        </div>
      </div>
    );
  }
  
  if (!isValid || !adminHash) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-white/70">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0b0d] via-[#0d0f10] to-[#0a0b0d] flex">
      <AdminSidebar adminHash={adminHash} />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
