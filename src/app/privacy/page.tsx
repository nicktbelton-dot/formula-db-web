export const metadata = { title: 'Privacy · Formula DB' };

export default function Privacy() {
  return (
    <div className="prose">
      <p className="crumb">Privacy</p>
      <h1 style={{ fontSize: 46, fontWeight: 800 }}>Privacy</h1>
      <p style={{ marginTop: 12 }}>Formula DB does not ask you to sign up and does not use cookies.</p>
      <ul>
        <li>Your light or dark choice, your favourite drivers and your list view are saved in this browser only, in its local storage. They never leave your device, and clearing your browser data removes them.</li>
        <li>The questions you ask are answered inside your browser. They are not sent to us.</li>
        <li>If you email us, we use your address only to reply.</li>
        <li>The site has no advertising and no tracking.</li>
      </ul>
      <p>Questions about this page: info@formuladb.co.uk.</p>
    </div>
  );
}
