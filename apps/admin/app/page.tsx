import { APP_NAME } from '@mai-bola/shared';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
      <h1 className="text-4xl font-bold text-slate-800">{APP_NAME}</h1>
      <p className="mt-4 text-lg text-slate-600">Admin Dashboard</p>
    </main>
  );
}
