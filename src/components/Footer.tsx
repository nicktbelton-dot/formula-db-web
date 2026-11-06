import Link from '@/components/AppLink';

export default function Footer() {
  return (
    <footer className="foot">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <div>
          <Link href="/about">About and sources</Link>
          <Link href="/credits">Credits</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/contact">Contact us</Link>
        </div>
        <div>Unofficial. Not affiliated with Formula 1.</div>
      </div>
      <p style={{ marginTop: 14, maxWidth: '90ch' }}>
        Results from Jolpica-F1, cars and layouts from F1DB (CC BY 4.0), biographies from Wikipedia (CC BY-SA 4.0), photos from Wikimedia Commons, weather from Open-Meteo.com (CC BY 4.0), each credited where it appears.
      </p>
    </footer>
  );
}
