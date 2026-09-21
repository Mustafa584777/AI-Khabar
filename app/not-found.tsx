import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 text-[#E60023] text-2xl font-bold">
          404
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Page Not Found
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          The prompt, guide, or page you are looking for might have been moved or does not exist.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E60023] hover:bg-[#ad001a] text-white font-bold text-xs transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
