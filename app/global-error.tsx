'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-sm text-neutral-400">An unexpected system error occurred.</p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-full bg-[#E60023] hover:bg-[#ad001a] text-white font-bold text-xs cursor-pointer transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
