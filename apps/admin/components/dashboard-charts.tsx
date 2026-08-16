'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Point = { date: string; value: number };
const label = (date: string) => new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });

export function DashboardCharts({ collected, paid }: { collected: Point[]; paid: Point[] }) {
  const collectedData = collected.map((point) => ({ ...point, label: label(point.date) }));
  const paidData = paid.map((point) => ({ ...point, label: label(point.date) }));
  return <div className="grid grid-cols-2 gap-6"><div className="rounded-2xl bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="font-heading text-lg font-bold text-text">Kg collected</h2><p className="text-xs text-muted">Weekly collection volume</p></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={collectedData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" /><XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><Tooltip formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Collected']} /><Bar dataKey="value" fill="#2D6A4F" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></div><div className="rounded-2xl bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="font-heading text-lg font-bold text-text">Paid to suppliers</h2><p className="text-xs text-muted">Weekly supplier payments</p></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={paidData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" /><XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><Tooltip formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Paid']} /><Line type="monotone" dataKey="value" stroke="#1B4332" strokeWidth={3} dot={{ fill: '#D8F3DC', stroke: '#1B4332', strokeWidth: 2, r: 4 }} /></LineChart></ResponsiveContainer></div></div></div>;
}
