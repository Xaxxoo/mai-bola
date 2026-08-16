import { cookies } from 'next/headers';

const COOKIE = 'rt';

export function setRefreshCookie(value: string) {
  cookies().set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function getRefreshCookie() { return cookies().get(COOKIE)?.value; }
export function clearRefreshCookie() { cookies().delete(COOKIE); }
