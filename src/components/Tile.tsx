// One gradient stat tile. A long value (a points total, a four-digit start count) uses a slightly smaller number
// so it stays on one line and the tile simply grows wider.
export default function Tile({ label, value }: { label: string; value: string | number }) {
  const text = String(value);
  return (
    <div className="tile">
      <b className={`num${text.length > 5 ? ' long' : ''}`}>{text}</b>
      <span>{label}</span>
    </div>
  );
}
