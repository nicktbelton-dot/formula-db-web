import Link from '@/components/AppLink';

// One gradient stat tile. A long value (a points total, a four-digit start count) uses a slightly smaller number
// so it stays on one line and the tile simply grows wider. Given an href, the tile is a link to the records behind it.
export default function Tile({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const text = String(value);
  const inner = (
    <>
      <b className={`num${text.length > 5 ? ' long' : ''}`}>{text}</b>
      <span>{href ? `${label} ›` : label}</span>
    </>
  );
  return href ? (
    <Link className="tile tile-link" href={href}>
      {inner}
    </Link>
  ) : (
    <div className="tile">{inner}</div>
  );
}
