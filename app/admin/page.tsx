'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/cms-login');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f0f0f1] dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="flex items-center gap-2 text-sm text-neutral-500 font-medium">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Redirecting to CMS Login...</span>
      </div>
    </div>
  );
}
