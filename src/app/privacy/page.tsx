import ClearSettingsButton from '@/components/ClearSettingsButton';
import { ANALYTICS_TOKEN, LAUNCHED } from '@/lib/siteConfig';
import { pageMeta } from '@/lib/seo';
export const metadata = pageMeta({ title: 'Privacy', description: 'What Formula DB keeps in your browser, and the weather requests that leave it.', path: '/privacy' });

export default function Privacy() {
  return (
    <div className="prose">
      <p className="crumb">Privacy</p>
      <h1 style={{ fontSize: 46, fontWeight: 800 }}>Privacy</h1>
      <p style={{ marginTop: 12 }}>Formula DB does not ask you to sign up, does not use cookies of its own, and has no advertising.</p>

      <h2>What stays in your browser</h2>
      <p>The site saves a few things on your device, in this browser&apos;s local storage, only when you use the feature that needs them:</p>
      <ul>
        <li><b>fdb:theme</b>: your light or dark choice.</li>
        <li><b>fdb:driversView</b>, <b>fdb:teamsView</b> and <b>fdb:circuitsView</b>: whether you last chose cards or a table, or the globe or the list.</li>
        <li><b>fdb:favourites</b>: the drivers, teams and circuits you save with the heart.</li>
      </ul>
      <p>
        These never leave your device and are used for nothing else. The questions you ask and the comparisons you make are worked out
        inside your browser from the site&apos;s own data, and are not sent to us or to anyone else. You can remove everything the site
        has saved at any time:
      </p>
      <ClearSettingsButton />

      <h2>Weather: what is sent from your browser</h2>
      <p>
        Two parts of the site show weather: the forecast for the next race weekend, and the typical weather on each circuit page. To show
        them, your browser asks a free weather service, <a className="link" href="https://open-meteo.com/" rel="noopener">Open-Meteo.com</a>,
        for the forecast or the past weather records at the circuit&apos;s coordinates.
      </p>
      <ul>
        <li>What is sent is the circuit&apos;s latitude and longitude, not anything about you.</li>
        <li>As with any request on the internet, your device&apos;s internet address is visible to the service that receives it, so Open-Meteo can see that a request came from that address. We do not receive or store it. Open-Meteo&apos;s own privacy information applies to what it does with requests.</li>
        <li>Weather answers are kept in your browser&apos;s memory only while the page is open, to avoid asking twice. Nothing about the weather is saved on your device.</li>
        <li>If you would rather not make these requests, you can simply not open those cards: the forecast only loads on Home and on an upcoming race, and the typical weather only on circuit pages.</li>
      </ul>

      {LAUNCHED && ANALYTICS_TOKEN ? (
        <>
          <h2>Visitor counts</h2>
          <p>
            To see how many people visit and which pages are used, the site counts visits with Cloudflare Web Analytics. Cloudflare
            states that this uses no cookies or local storage and does not fingerprint visitors or follow them around the web. It
            records page views and general details such as the country and the kind of device and browser, not who you are. Because
            a small script is loaded from Cloudflare to do this, your device&apos;s internet address is visible to Cloudflare when
            that happens. Cloudflare&apos;s own privacy information applies to what it does with the data.
          </p>
        </>
      ) : null}

      <h2>Hosting</h2>
      <p>
        The site is hosted by Cloudflare. As with any web host, Cloudflare receives each request to the site, including your device&apos;s
        internet address and the page you ask for, so that it can deliver pages and protect against abuse. If you type the address without
        www, it is forwarded to the main address by the domain&apos;s registrar, IONOS, which also handles the site&apos;s email. We do not use
        that information ourselves.
      </p>

      <h2>If you contact us</h2>
      <p>If you email us, we use your address only to reply. Contact: info@formuladb.co.uk.</p>
    </div>
  );
}
