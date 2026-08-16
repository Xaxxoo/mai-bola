'use client';

const STEPS = [
  { status: 'PENDING', label: 'Requested' },
  { status: 'SCHEDULED', label: 'Scheduled' },
  { status: 'EN_ROUTE', label: 'On the way' },
  { status: 'COLLECTED', label: 'Collected' },
] as const;

// Map internal statuses to step index
function getStepIndex(status: string): number {
  if (status === 'PENDING' || status === 'CLUSTERED') return 0;
  if (status === 'SCHEDULED') return 1;
  if (status === 'EN_ROUTE') return 2;
  if (status === 'COLLECTED') return 3;
  return -1; // CANCELLED
}

type StatusStepperProps = {
  status: string;
};

export function StatusStepper({ status }: StatusStepperProps) {
  const currentIndex = getStepIndex(status);

  if (currentIndex < 0) return null; // Don't show for cancelled

  return (
    <div className="flex items-center justify-between">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isUpcoming = i > currentIndex;

        return (
          <div key={step.status} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-forest text-white ring-4 ring-green-100'
                      : 'bg-gray-200 text-muted'
                }`}
              >
                {isComplete ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`mt-1 text-[10px] leading-tight text-center ${
                  isCurrent ? 'font-semibold text-forest' : isUpcoming ? 'text-muted' : 'text-green-600'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 rounded ${
                  isComplete ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
