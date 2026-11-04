import { geoDistance } from 'd3-geo';

export type GlobePin = {
  id: string;
  name: string;
  lon: number;
  lat: number;
  current: boolean; // raced in the latest season
};

export type ProjectedPin = { pin: GlobePin; x: number; y: number; visible: boolean };

// Where each pin lands on screen, and whether it is on the side of the globe facing the viewer.
export function projectPins(pins: GlobePin[], proj: any, width: number): ProjectedPin[] {
  const centre = proj.invert([width / 2, width / 2]);
  return pins.map((pin) => {
    const p = proj([pin.lon, pin.lat]);
    const visible = !!p && !!centre && geoDistance([pin.lon, pin.lat], centre) < Math.PI / 2 - 0.04;
    return { pin, x: p ? p[0] : 0, y: p ? p[1] : 0, visible };
  });
}

// Visible pins within `radius` pixels of a touch, nearest first.
export function hitTest(points: ProjectedPin[], x: number, y: number, radius: number): ProjectedPin[] {
  return points
    .filter((p) => p.visible)
    .map((p) => ({ p, d: Math.hypot(p.x - x, p.y - y) }))
    .filter((h) => h.d <= radius)
    .sort((a, b) => a.d - b.d)
    .map((h) => h.p);
}

export type Label = { x: number; y: number; text: string; anchor: 'start' | 'end' };

// Greedy label placement: the selected pin first, then current circuits, then the rest.
// A label is skipped if it would overlap one already placed, which keeps crowded areas readable.
export function placeLabels(
  points: ProjectedPin[],
  selectedId: string | null,
  showAll: boolean,
  width: number
): Label[] {
  const order = points
    .filter((p) => p.visible && p.x > 4 && p.x < width - 4 && p.y > 4 && p.y < width - 4)
    .filter((p) => showAll || p.pin.id === selectedId)
    .sort((a, b) => rank(a, selectedId) - rank(b, selectedId));
  const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const out: Label[] = [];
  for (const p of order) {
    const w = p.pin.name.length * 6.4 + 6;
    const goLeft = p.x + 10 + w > width;
    const x0 = goLeft ? p.x - 10 - w : p.x + 8;
    const box = { x0, y0: p.y - 8, x1: x0 + w, y1: p.y + 8 };
    const clash = placed.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0);
    if (clash && p.pin.id !== selectedId) continue;
    placed.push(box);
    out.push({ x: goLeft ? p.x - 10 : p.x + 10, y: p.y + 4, text: p.pin.name, anchor: goLeft ? 'end' : 'start' });
  }
  return out;
}

function rank(p: ProjectedPin, selectedId: string | null): number {
  if (p.pin.id === selectedId) return 0;
  return p.pin.current ? 1 : 2;
}
