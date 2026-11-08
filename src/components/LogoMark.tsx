// The Formula DB logo, drawn to the same measurements as the phone app: a crimson to violet tile with three staggered
// horizontal bars, FORMULA in spaced capitals, and a large DB stretched to exactly the width of FORMULA.
export default function LogoMark() {
  return (
    <svg className="logo-svg" viewBox="0 0 250 88" role="img" aria-label="Formula DB">
      <defs>
        <linearGradient id="logo-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C2253F" />
          <stop offset="1" stopColor="#3B1F6B" />
        </linearGradient>
      </defs>
      <rect width="88" height="88" rx="22" fill="url(#logo-tile)" />
      <rect x="31" y="24" width="36" height="10" rx="5" fill="#FFE3E8" />
      <rect x="20" y="39" width="36" height="10" rx="5" fill="#FFFFFF" />
      <rect x="31" y="54" width="36" height="10" rx="5" fill="#FFFFFF" />
      <text x="104" y="22" fontSize="22" fontWeight="500" fill="var(--text)" textLength="138" lengthAdjust="spacing" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        FORMULA
      </text>
      <text x="104" y="78" fontSize="62" fontWeight="700" fill="var(--link)" textLength="138" lengthAdjust="spacingAndGlyphs" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        DB
      </text>
    </svg>
  );
}
