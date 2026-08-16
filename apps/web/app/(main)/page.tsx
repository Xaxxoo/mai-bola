import { APP_NAME } from '@mai-bola/shared';
import { Card } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const stats = [
  { label: 'Total Collected', value: '245 kg', change: '+12%' },
  { label: 'Wallet Balance', value: '\u20A618,400', change: '' },
  { label: 'Pending Pickups', value: '3', change: '' },
];

const recentPickups = [
  { id: '1', address: 'Barnawa, Kaduna South', weight: '12.5 kg', status: 'COLLECTED' },
  { id: '2', address: 'Rigasa, Kaduna North', weight: '8.0 kg', status: 'EN_ROUTE' },
  { id: '3', address: 'Kakuri, Kaduna South', weight: '—', status: 'PENDING' },
];

export default function HomePage() {
  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Welcome */}
      <div>
        <p className="text-sm text-muted">Welcome back</p>
        <h1 className="text-2xl font-heading font-bold text-text">{APP_NAME}</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} padding="sm">
            <p className="text-xs text-muted">{stat.label}</p>
            <p className="mt-1 text-lg font-bold text-text">{stat.value}</p>
            {stat.change && (
              <p className="text-xs text-green-500 font-medium">{stat.change}</p>
            )}
          </Card>
        ))}
        <Card padding="sm" className="flex items-center justify-center">
          <Button size="sm">New Pickup</Button>
        </Card>
      </div>

      {/* Recent pickups */}
      <section>
        <h2 className="mb-3 text-lg font-heading font-semibold text-text">
          Recent Pickups
        </h2>
        <div className="space-y-2">
          {recentPickups.map((pickup) => (
            <Card key={pickup.id} padding="sm" className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text">{pickup.address}</p>
                <p className="text-xs text-muted">{pickup.weight}</p>
              </div>
              <StatusBadge type="pickup" status={pickup.status} />
            </Card>
          ))}
        </div>
      </section>

      {/* Component showcase */}
      <section>
        <h2 className="mb-3 text-lg font-heading font-semibold text-text">
          Components
        </h2>
        <Card>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm">Primary</Button>
              <Button variant="secondary" size="sm">Secondary</Button>
              <Button variant="ghost" size="sm">Ghost</Button>
              <Button variant="primary" size="sm" loading>Loading</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
