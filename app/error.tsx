'use client';

import { useEffect } from 'react';
import { Home, RefreshCw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          An unexpected error occurred. You can try refreshing or returning to the homepage.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 pt-2 w-full max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => {
              try {
                reset();
              } catch (e) {
                console.error(e);
              }
              window.location.reload();
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#E60023] hover:bg-[#ad001a] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <a
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-bold text-sm transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Go to Homepage</span>
          </a>
        </div>
      </div>
    </div>
  );
}
