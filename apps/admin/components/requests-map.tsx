'use client';

import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { StatusBadge } from '@/components/ui/status-badge';

export type RequestMapRow = { id: string; estimatedKg: number; status: string; supplier: { fullName: string; phone: string }; address: { streetText: string; area: string; zone: string; lat: number | string; lng: number | string } };
const icon = new L.Icon({ iconUrl: '/leaflet-pin.svg', iconSize: [28, 38], iconAnchor: [14, 38], popupAnchor: [0, -38] });

export function RequestsMap({ requests }: { requests: RequestMapRow[] }) {
  const points = requests.filter((request) => Number.isFinite(Number(request.address?.lat)) && Number.isFinite(Number(request.address?.lng)));
  const center: [number, number] = points.length ? [Number(points[0].address.lat), Number(points[0].address.lng)] : [10.5105, 7.4165];
  return <div className="h-[620px] overflow-hidden rounded-2xl border border-gray-200"><MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full"><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><MarkerClusterGroup chunkedLoading>{points.map((request) => <Marker key={request.id} position={[Number(request.address.lat), Number(request.address.lng)]} icon={icon}><Popup><div className="min-w-[180px] space-y-2"><p className="font-semibold text-text">{request.supplier.fullName}</p><p className="text-xs text-muted">{request.address.streetText}, {request.address.area}</p><div className="flex items-center justify-between"><StatusBadge status={request.status} /><span className="text-xs font-semibold">{request.estimatedKg} kg</span></div><a href={`tel:${request.supplier.phone}`} className="text-xs font-semibold text-forest">{request.supplier.phone}</a></div></Popup></Marker>)}</MarkerClusterGroup></MapContainer></div>;
}
