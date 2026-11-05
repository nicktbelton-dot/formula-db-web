'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fold } from '@/core/search';
import type { PickerDriver } from '@/lib/compareData';

// A searchable driver chooser: type a name, pick from the matches. The list is drawn in a layer above the whole page,
// positioned under the box, so nothing on the page can cover it or show through it.
export default function DriverPicker({
  id,
  label,
  which,
  drivers,
  value,
  onSelect,
}: {
  id: string;
  label: string;
  which: 'a' | 'b';
  drivers: PickerDriver[];
  value: PickerDriver | null;
  onSelect: (d: PickerDriver | null) => void;
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const field = useRef<HTMLDivElement>(null); // the input box
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => setText(value ? value.name : ''), [value]);

  // close when clicking anywhere except the box or the list
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (field.current?.contains(t) || list.current?.contains(t)) return;
      setOpen(false);
      setText(value ? value.name : '');
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [value]);

  // place the list under the box, and keep it there while the page scrolls or resizes
  const place = useCallback(() => {
    const el = field.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 16;
    setPos({ top: r.bottom + 4, left: r.left, width: r.width, maxHeight: Math.max(200, Math.min(420, below)) });
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  const browsing = open && (!fold(text) || (value !== null && text === value.name));
  const matches = useMemo(() => {
    if (!open) return [];
    // before anything is typed, the most successful drivers come first
    if (browsing) return [...drivers].sort((a, b) => b.career_wins - a.career_wins).slice(0, 60);
    const needle = fold(text);
    return drivers.filter((d) => fold(d.name).includes(needle)).slice(0, 60);
  }, [drivers, text, open, browsing]);

  const choose = (d: PickerDriver) => {
    onSelect(d);
    setOpen(false);
  };
  const years = (d: PickerDriver) => (d.first_season ? (d.first_season === d.last_season ? String(d.first_season) : `${d.first_season}–${d.last_season}`) : '');

  const dropdown =
    open && pos ? (
      <div
        ref={list}
        className="picker-list"
        id={`${id}-list`}
        role="listbox"
        style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
      >
        {browsing ? <p className="picker-hint">Most race wins first. Type to search all {drivers.length} drivers.</p> : null}
        {matches.length === 0 ? <p className="picker-hint">No driver matches.</p> : null}
        {matches.map((d, i) => (
          <button key={d.driver_id} role="option" aria-selected={i === active} className="opt" onMouseEnter={() => setActive(i)} onClick={() => choose(d)}>
            <span>{d.name}</span>
            <span className="yrs num">{years(d)}</span>
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div className="field picker">
      <label htmlFor={id}>{label}</label>
      <div className={`picker-box ${which}`} ref={field}>
        <span className="dot" aria-hidden="true" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          autoComplete="off"
          placeholder={which === 'a' ? 'Choose the first driver' : 'Choose the second driver'}
          value={text}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive(Math.min(active + 1, matches.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive(Math.max(active - 1, 0));
            } else if (e.key === 'Enter' && matches[active]) {
              e.preventDefault();
              choose(matches[active]);
            } else if (e.key === 'Escape') {
              setOpen(false);
              setText(value ? value.name : '');
            }
          }}
        />
        {value ? (
          <button className="clear" onClick={() => onSelect(null)} aria-label={`Clear ${label}`}>×</button>
        ) : null}
      </div>
      {dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
