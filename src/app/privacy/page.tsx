export const metadata = { title: 'Privacy · Formula DB' };

export default function Privacy() {
  return (
    <div className="prose">
      <p className="crumb">Privacy</p>
      <h1 style={{ fontSize: 46, fontWeight: 800 }}>Privacy</h1>
      <p style={{ marginTop: 12 }}>Formula DB does not ask you to sign up, does not use cookies, and has no advertising or tracking.</p>

      <h2>What stays in your browser</h2>
      <ul>
        <li>Your light or dark choice, your favourite drivers, teams and circuits, and your list views are saved in this browser only, in its local storage. They never leave your device, and clearing your browser data removes them.</li>
        <li>The questions you ask and the comparisons you make are worked out inside your browser from the site&apos;s own data. They are not sent to us or to anyone else.</li>
      </ul>

      <h2>Weather: the one thing that does leave your browser</h2>
      <p>
        Two parts of the site show weather: the forecast for the next race weekend, and the typical weather on each circuit page. To show
        them, your browser asks a free weather service, <a className="link" href="https://open-meteo.com/" rel="noopener">Open-Meteo.com</a>,
        for the forecast or the past weather records at the circuit&apos;s coordinates.
      </p>
      <ul>
        <li>What is sent is the circuit&apos;s latitude and longitude, not anything about you.</li>
        <li>As with any request on the internet, your device&apos;s internet address is visible to the service that receives it, so Open-Meteo can see that a request came from that address. We do not receive or store it. Open-Meteo&apos;s own privacy information applies to what it does with requests.</li>
        <li>To keep requests to a minimum, your browser remembers each answer, for a few hours for a forecast and about a month for typical weather.</li>
        <li>If you would rather not make these requests, you can simply not open those cards: the forecast only loads on Home and on an upcoming race, and the typical weather only on circuit pages.</li>
      </ul>

      <h2>If you contact us</h2>
      <p>If you email us, we use your address only to reply. Contact: info@formuladb.co.uk.</p>
    </div>
  );
}
