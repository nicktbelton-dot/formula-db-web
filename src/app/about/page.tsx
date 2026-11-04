export const metadata = { title: 'About and sources Â· Formula DB' };

export default function About() {
  return (
    <div className="prose">
      <p className="crumb">About</p>
      <h1 style={{ fontSize: 46, fontWeight: 800 }}>About Formula DB</h1>
      <p style={{ marginTop: 12 }}>
        Formula DB is a free, unofficial Formula One encyclopedia: every driver, team, circuit and season since 1950, with records and a
        question box that answers from the data. It started as a personal phone app and is now on the web too.
      </p>
      <h2>How the numbers are checked</h2>
      <p>
        Race results come from a public results service and are loaded into one database. Totals such as wins, poles and titles are
        worked out from the results, then checked against the official totals for every polesitter through 2024. Teams that changed name
        or engine badge are joined into lineages, so a team's history reads as one story.
      </p>
      <h2>Found a mistake?</h2>
      <p>Tell us on the contact page, with the address of the page you were looking at, and we will check and correct it.</p>
    </div>
  );
}
