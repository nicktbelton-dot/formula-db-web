export const metadata = { title: 'Credits · Formula DB' };

export default function Credits() {
  return (
    <div className="prose">
      <p className="crumb">Credits</p>
      <h1 style={{ fontSize: 46, fontWeight: 800 }}>Credits and sources</h1>
      <p style={{ marginTop: 12 }}>Formula DB is built on the work of others, and each source is credited here and where its material appears.</p>
      <h2>Data</h2>
      <ul>
        <li><b>Jolpica-F1</b>: race results, qualifying, standings and calendars. A community-run successor to the Ergast API.</li>
        <li><b>F1DB</b> (CC BY 4.0): car models, engines, tyre suppliers and track layouts. Layout drawings are by Jules Roy, distributed with F1DB.</li>
        <li><b>Wikipedia</b> (CC BY-SA 4.0): the biographies and descriptions of drivers, teams and circuits, each with a link to its source article.</li>
        <li><b>Wikimedia Commons</b>: car photographs, each used under its own open licence and credited under the picture.</li>
        <li><b>Open-Meteo.com</b> (CC BY 4.0): weather forecasts and past weather records for the race-weekend forecast and the typical weather on circuit pages. <a className="link" href="https://open-meteo.com/" rel="noopener">open-meteo.com</a></li>
      </ul>
      <h2>Software</h2>
      <p>Built with Next.js, React and sql.js (SQLite in the browser).</p>
      <h2>Trade marks</h2>
      <p>
        Formula DB is unofficial and not associated in any way with the Formula 1 companies. F1, Formula One, Formula 1, FIA Formula One
        World Championship, Grand Prix and related marks are trade marks of Formula One Licensing B.V.
      </p>
    </div>
  );
}
