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
              className="w-full px-6 py-3 rounded-full bg-[#E60023] hover:bg-[#ad001a] text-white font-bold text-sm cursor-pointer shadow-md transition-all"
            >
              Try Again
            </button>
            <a
              href="/"
              className="w-full inline-flex items-center justify-center px-6 py-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm transition-all"
            >
              Go to Homepage
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
