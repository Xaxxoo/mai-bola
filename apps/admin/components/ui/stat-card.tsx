export function StatCard({ label, value, detail, icon, tone = 'forest' }: { label: string; value: string; detail?: string; icon: string; tone?: 'forest' | 'mint' | 'amber' }) {
  const tones = { forest: 'bg-forest text-white', mint: 'bg-mint text-forest', amber: 'bg-amber-50 text-amber-900' };
  return <div className={`rounded-2xl p-5 shadow-sm ${tones[tone]}`}><div className="flex items-start justify-between"><p className="text-xs font-medium opacity-75">{label}</p><span className="text-xl opacity-80">{icon}</span></div><p className="mt-4 text-2xl font-bold tracking-tight">{value}</p>{detail && <p className="mt-1 text-xs opacity-70">{detail}</p>}</div>;
}
