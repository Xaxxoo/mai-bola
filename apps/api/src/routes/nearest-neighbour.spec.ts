import { nearestNeighbourOrder, LatLng } from './nearest-neighbour';

describe('nearestNeighbourOrder', () => {
  it('returns empty array for empty input', () => {
    expect(nearestNeighbourOrder([])).toEqual([]);
  });

  it('returns [0] for single item', () => {
    expect(nearestNeighbourOrder([{ lat: 10, lng: 7 }])).toEqual([0]);
  });

  it('orders two points (trivial)', () => {
    const result = nearestNeighbourOrder([
      { lat: 10, lng: 7 },
      { lat: 11, lng: 8 },
    ]);
    expect(result).toEqual([0, 1]);
  });

  it('picks nearest neighbour at each step', () => {
    // Points laid out roughly: A(0,0), B(10,10), C(1,1), D(9,9)
    // Starting from A, nearest is C(1,1), then D(9,9), then B(10,10)
    const points: LatLng[] = [
      { lat: 0, lng: 0 },   // A — index 0
      { lat: 10, lng: 10 }, // B — index 1
      { lat: 1, lng: 1 },   // C — index 2
      { lat: 9, lng: 9 },   // D — index 3
    ];

    const order = nearestNeighbourOrder(points);

    expect(order[0]).toBe(0); // starts at A
    expect(order[1]).toBe(2); // nearest to A is C
    expect(order[2]).toBe(3); // nearest to C is D
    expect(order[3]).toBe(1); // only B left
  });

  it('visits every point exactly once', () => {
    const points: LatLng[] = [
      { lat: 10.52, lng: 7.43 },
      { lat: 10.51, lng: 7.44 },
      { lat: 10.53, lng: 7.42 },
      { lat: 10.50, lng: 7.45 },
      { lat: 10.54, lng: 7.41 },
    ];

    const order = nearestNeighbourOrder(points);

    expect(order).toHaveLength(5);
    expect(new Set(order).size).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(order).toContain(i);
    }
  });

  it('handles points at the same location', () => {
    const points: LatLng[] = [
      { lat: 10, lng: 7 },
      { lat: 10, lng: 7 },
      { lat: 10, lng: 7 },
    ];

    const order = nearestNeighbourOrder(points);
    expect(order).toHaveLength(3);
    expect(new Set(order).size).toBe(3);
  });
});
