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
      <body className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-sm text-neutral-400">An unexpected system error occurred.</p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-full bg-[#E60023] hover:bg-[#ad001a] text-white font-medium text-sm cursor-pointer transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
