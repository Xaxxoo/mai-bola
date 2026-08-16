export interface LatLng {
  lat: number;
  lng: number;
}

function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371; // km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Orders items by nearest-neighbour starting from the first item.
 * Returns a new array of indices in visit order.
 */
export function nearestNeighbourOrder<T extends LatLng>(items: T[]): number[] {
  if (items.length <= 1) return items.map((_, i) => i);

  const visited = new Set<number>();
  const order: number[] = [];
  let current = 0;

  visited.add(current);
  order.push(current);

  while (order.length < items.length) {
    let nearest = -1;
    let nearestDist = Infinity;

    for (let i = 0; i < items.length; i++) {
      if (visited.has(i)) continue;
      const dist = haversineDistance(items[current], items[i]);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    }

    visited.add(nearest);
    order.push(nearest);
    current = nearest;
  }

  return order;
}
