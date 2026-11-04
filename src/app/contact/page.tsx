export const metadata = { title: 'Contact · Formula DB' };

export default function Contact() {
  return (
    <div className="prose">
      <p className="crumb">Contact</p>
      <h1 style={{ fontSize: 46, fontWeight: 800 }}>Contact us</h1>
      <p style={{ marginTop: 12 }}>
        A question, a number that looks wrong, or an idea? Write to{' '}
        <a className="link" href="mailto:info@formuladb.co.uk?subject=Formula DB feedback">info@formuladb.co.uk</a>. If it is about a
        mistake, please include the address of the page and what you expected to see.
      </p>
    </div>
  );
}
