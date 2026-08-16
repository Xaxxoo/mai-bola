'use client';

import { useRouter } from 'next/navigation';

type TopBarProps = {
  title: string;
  back?: boolean;
  action?: React.ReactNode;
};

export function TopBar({ title, back = false, action }: TopBarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-gray-100 bg-white/95 backdrop-blur px-4 py-3">
      {back && (
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center rounded-lg p-1 text-text hover:bg-tint"
          aria-label="Go back"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      <h1 className="flex-1 text-lg font-heading font-bold text-text truncate">
        {title}
      </h1>
      {action && <div className="flex-shrink-0">{action}</div>}
    </header>
  );
}
