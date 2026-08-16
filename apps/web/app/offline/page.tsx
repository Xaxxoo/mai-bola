'use client';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 text-6xl">📡</div>
      <h1 className="mb-2 text-2xl font-heading font-bold text-text">
        You are offline
      </h1>
      <p className="mb-8 text-muted">
        Check your internet connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-xl bg-forest px-6 py-3 font-semibold text-white"
      >
        Retry
      </button>
    </main>
  );
}
