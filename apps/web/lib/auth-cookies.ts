import { cookies } from 'next/headers';

const REFRESH_TOKEN_COOKIE = 'rt';
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export function setRefreshCookie(refreshToken: string) {
  cookies().set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_MAX_AGE,
  });
}

export function getRefreshCookie(): string | undefined {
  return cookies().get(REFRESH_TOKEN_COOKIE)?.value;
}

export function clearRefreshCookie() {
  cookies().delete(REFRESH_TOKEN_COOKIE);
}
