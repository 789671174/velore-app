export default function HomePage() {
  return (
    <main>
      <h1>Start</h1>
      <p>Wähle eine der zwei Seiten:</p>
      <p>
        <a className="btn" href="/client">Zur Client-Seite</a>
        {" "}
        <a className="btn" href="/entrepreneur">Zur Entrepreneur-Seite</a>
      </p>
    </main>
  );
}
