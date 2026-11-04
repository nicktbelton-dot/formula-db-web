'use client';

import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import world from 'world-atlas/land-110m.json';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GlobePin, hitTest, placeLabels, projectPins } from '@/lib/globeMath';

// World outline (Natural Earth, 110m), drawn as SVG. Drag to turn, pinch or Ctrl+scroll to zoom, tap a pin.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TOPO = world as any;
const LAND = feature(TOPO, TOPO.objects.land);
const GRATICULE = geoGraticule10();
const SPHERE = { type: 'Sphere' };

type Cam = { lon: number; lat: number; zoom: number };
const START: Cam = { lon: 10, lat: 35, zoom: 1 };
const MAX_ZOOM = 9;
const TAP_RADIUS = 26;
const MAX_SIZE = 640;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const wrapLon = (l: number) => ((((l + 180) % 360) + 360) % 360) - 180;

function makeProjection(cam: Cam, size: number) {
  return geoOrthographic().scale(size * 0.46 * cam.zoom).translate([size / 2, size / 2]).clipAngle(90).rotate([-cam.lon, -cam.lat]);
}

type Props = { pins: GlobePin[]; selectedId: string | null; onSelect: (id: string | null) => void };

export default function Globe({ pins, selectedId, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const [cam, setCam] = useState<Cam>(START);

  // the handlers are created once, so they read the latest values through refs
  const camRef = useRef(cam);
  camRef.current = cam;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const raf = useRef<number | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef({ lastX: 0, lastY: 0, moved: 0, pinchD0: 0, zoom0: 1, pinched: false });

  // the globe is as wide as its column, up to a limit, and always square
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize(Math.max(0, Math.min(el.clientWidth, MAX_SIZE)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stopAnim = useCallback(() => {
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  }, []);

  const animateTo = useCallback(
    (to: Cam) => {
      stopAnim();
      const from = camRef.current;
      const start = performance.now();
      const duration = 380;
      const dLon = wrapLon(to.lon - from.lon); // the shortest way round
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const e = 1 - Math.pow(1 - t, 3);
        setCam({ lon: wrapLon(from.lon + dLon * e), lat: from.lat + (to.lat - from.lat) * e, zoom: from.zoom + (to.zoom - from.zoom) * e });
        raf.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      raf.current = requestAnimationFrame(step);
    },
    [stopAnim]
  );
  useEffect(() => stopAnim, [stopAnim]);

  const handleTap = (x: number, y: number) => {
    const s = sizeRef.current;
    if (s <= 0) return;
    const proj = makeProjection(camRef.current, s);
    const hits = hitTest(projectPins(pinsRef.current, proj, s), x, y, TAP_RADIUS);
    if (hits.length === 0) {
      selectRef.current(null);
      return;
    }
    const cur = camRef.current;
    // several pins under the finger (for example in Europe): zoom in there instead of guessing
    if (hits.length > 1 && cur.zoom < MAX_ZOOM - 0.5) {
      const lon = hits.reduce((n, h) => n + h.pin.lon, 0) / hits.length;
      const lat = hits.reduce((n, h) => n + h.pin.lat, 0) / hits.length;
      animateTo({ lon, lat, zoom: clamp(cur.zoom * 2.6, 1, MAX_ZOOM) });
      return;
    }
    selectRef.current(hits[0].pin.id);
    animateTo({ lon: hits[0].pin.lon, lat: hits[0].pin.lat, zoom: cur.zoom });
  };

  const onPointerDown = (e: { pointerId: number; clientX: number; clientY: number; currentTarget: HTMLElement }) => {
    stopAnim();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const st = g.current;
    if (pointers.current.size === 1) {
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      st.moved = 0;
      st.pinched = false;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      st.pinched = true;
      st.pinchD0 = Math.hypot(a.x - b.x, a.y - b.y);
      st.zoom0 = camRef.current.zoom;
    }
  };

  const onPointerMove = (e: { pointerId: number; clientX: number; clientY: number }) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const st = g.current;
    const cur = camRef.current;
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (st.pinchD0 > 0) setCam({ ...cur, zoom: clamp((st.zoom0 * d) / st.pinchD0, 1, MAX_ZOOM) });
      return;
    }
    const dx = e.clientX - st.lastX;
    const dy = e.clientY - st.lastY;
    st.lastX = e.clientX;
    st.lastY = e.clientY;
    st.moved += Math.abs(dx) + Math.abs(dy);
    const degPerPx = 180 / (Math.PI * sizeRef.current * 0.46 * cur.zoom);
    setCam({ ...cur, lon: wrapLon(cur.lon - dx * degPerPx), lat: clamp(cur.lat + dy * degPerPx, -80, 80) });
  };

  const onPointerUp = (e: { pointerId: number; clientX: number; clientY: number }) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const st = g.current;
    if (pointers.current.size === 1) {
      // one finger lifted after a pinch: carry on dragging from where the other one is
      const [rest] = [...pointers.current.values()];
      st.lastX = rest.x;
      st.lastY = rest.y;
      return;
    }
    if (pointers.current.size === 0 && !st.pinched && st.moved < 14) {
      const rect = boxRef.current?.getBoundingClientRect();
      if (rect) handleTap(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  // The mouse wheel (or a trackpad pinch) zooms the globe. At the limits, zoomed fully out or fully in,
  // the wheel is left alone so the page still scrolls and is never trapped by the globe.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const cur = camRef.current;
      const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY; // some mice report lines, not pixels
      const next = clamp(cur.zoom * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)), 1, MAX_ZOOM);
      if (next === cur.zoom) return;
      e.preventDefault();
      stopAnim();
      setCam({ ...cur, zoom: next });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [size, stopAnim]);

  const proj = useMemo(() => makeProjection(cam, size), [cam, size]);
  const paths = useMemo(() => {
    const gen = geoPath(proj);
    return { sphere: gen(SPHERE) ?? '', graticule: gen(GRATICULE) ?? '', land: gen(LAND) ?? '' };
  }, [proj]);
  const points = useMemo(() => projectPins(pins, proj, size), [pins, proj, size]);
  const labels = useMemo(() => placeLabels(points, selectedId, cam.zoom >= 2.2, size), [points, selectedId, cam.zoom, size]);
  const drawn = points.filter((p) => p.visible).sort((a, b) => Number(a.pin.current) - Number(b.pin.current));

  const zoomBy = (f: number) => animateTo({ ...camRef.current, zoom: clamp(camRef.current.zoom * f, 1, MAX_ZOOM) });

  return (
    <div ref={wrapRef} className="globe-wrap">
      <div
        ref={boxRef}
        className="globe-box"
        style={{ width: size, height: size }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {size > 0 ? (
          <svg width={size} height={size} role="img" aria-label="A globe of Formula One circuits. The List view is a text version of the same information.">
            <path d={paths.sphere} fill="var(--globe-sea)" />
            <path d={paths.graticule} fill="none" stroke="var(--globe-line)" strokeWidth={0.8} />
            <path d={paths.land} fill="var(--globe-land)" />
            <path d={paths.sphere} fill="none" stroke="var(--globe-line)" strokeWidth={1.5} />
            {drawn.map((p) => {
              const selected = p.pin.id === selectedId;
              return (
                <circle
                  key={p.pin.id}
                  cx={p.x}
                  cy={p.y}
                  r={selected ? 8 : p.pin.current ? 5.5 : 4}
                  fill={selected ? 'var(--accent)' : p.pin.current ? 'var(--link)' : 'var(--muted)'}
                  stroke={selected ? 'var(--link)' : 'var(--bg)'}
                  strokeWidth={selected ? 3 : 1.5}
                />
              );
            })}
            {labels.map((l) => {
              // white text on a dark pill, so names stay readable over land, sea and either theme
              const textWidth = l.text.length * 6.2;
              const x0 = l.anchor === 'start' ? l.x - 5 : l.x - textWidth - 5;
              return (
                <g key={l.text + l.x}>
                  <rect x={x0} y={l.y - 12} width={textWidth + 10} height={17} rx={8} fill="var(--card)" fillOpacity={0.92} />
                  <text x={l.x} y={l.y} fontSize={11} fontWeight={600} fill="#FFFFFF" textAnchor={l.anchor}>{l.text}</text>
                </g>
              );
            })}
          </svg>
        ) : null}
      </div>
      <div className="globe-controls">
        <button className="ib" onClick={() => zoomBy(1 / 1.8)} aria-label="Zoom out">−</button>
        <button className="ib" onClick={() => zoomBy(1.8)} aria-label="Zoom in">+</button>
        <button className="btn" onClick={() => animateTo(START)}>Reset</button>
      </div>
      <p className="muted globe-hint">Drag to turn the globe. Scroll or pinch to zoom. Tap a pin for the circuit, or a cluster to zoom in.</p>
    </div>
  );
}
