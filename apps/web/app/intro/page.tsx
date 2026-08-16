'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const slides = [
  {
    title: 'Save your bottles',
    description:
      'Collect PET bottles at home or work. Every bottle counts towards a cleaner Kaduna.',
    illustration: (
      <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="90" fill="#D8F3DC" />
        <rect x="80" y="40" width="40" height="80" rx="8" fill="#2D6A4F" />
        <rect x="86" y="32" width="28" height="12" rx="4" fill="#1B4332" />
        <path d="M80 120h40l6 40H74l6-40z" fill="#14342B" />
        <circle cx="100" cy="75" r="10" fill="#D8F3DC" opacity="0.6" />
        <path
          d="M55 160l8-12 10 8 12-20 10 14 12-8 8 18"
          stroke="#2D6A4F"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: 'We pick them up',
    description:
      'Request a pickup and our drivers come to your door. Free and easy, right from the app.',
    illustration: (
      <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="90" fill="#D8F3DC" />
        <rect x="55" y="80" width="90" height="50" rx="10" fill="#2D6A4F" />
        <circle cx="75" cy="135" r="12" fill="#14342B" />
        <circle cx="125" cy="135" r="12" fill="#14342B" />
        <circle cx="75" cy="135" r="5" fill="#D8F3DC" />
        <circle cx="125" cy="135" r="5" fill="#D8F3DC" />
        <rect x="60" y="88" width="20" height="15" rx="3" fill="#D8F3DC" opacity="0.5" />
        <rect x="120" y="88" width="20" height="15" rx="3" fill="#D8F3DC" opacity="0.5" />
        <path d="M100 60v-20m-15 5l15-15 15 15" stroke="#1B4332" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Get paid instantly',
    description:
      'Earn money for every kilogram collected. Cash out to your bank or mobile wallet anytime.',
    illustration: (
      <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="90" fill="#D8F3DC" />
        <rect x="55" y="60" width="90" height="70" rx="12" fill="#2D6A4F" />
        <rect x="55" y="82" width="90" height="14" fill="#14342B" />
        <text
          x="100"
          y="122"
          textAnchor="middle"
          fontFamily="sans-serif"
          fontWeight="700"
          fontSize="20"
          fill="#D8F3DC"
        >
          ₦₦₦
        </text>
        <circle cx="140" cy="55" r="18" fill="#1B4332" />
        <text
          x="140"
          y="61"
          textAnchor="middle"
          fontFamily="sans-serif"
          fontWeight="700"
          fontSize="16"
          fill="#D8F3DC"
        >
          ₦
        </text>
        <path
          d="M85 150l5-8 8 5 10-12 8 10"
          stroke="#2D6A4F"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function IntroPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const slide = slides[current];
  const isLast = current === slides.length - 1;

  function handleNext() {
    if (isLast) {
      localStorage.setItem('intro_seen', '1');
      router.push('/register');
    } else {
      setCurrent((c) => c + 1);
    }
  }

  function handleSkip() {
    localStorage.setItem('intro_seen', '1');
    router.push('/register');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-6 py-12">
      {/* Skip button */}
      <div className="w-full flex justify-end">
        {!isLast && (
          <button
            onClick={handleSkip}
            className="text-sm text-muted hover:text-text transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* Illustration + text */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-8">{slide.illustration}</div>
        <h2 className="text-2xl font-heading font-bold text-text">
          {slide.title}
        </h2>
        <p className="mt-3 max-w-[280px] text-sm text-muted leading-relaxed">
          {slide.description}
        </p>
      </div>

      {/* Bottom: dots + button */}
      <div className="w-full space-y-6">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === current ? 'w-6 bg-forest' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        <Button onClick={handleNext} className="w-full" size="lg">
          {isLast ? 'Get started' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
