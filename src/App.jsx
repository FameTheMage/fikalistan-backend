import { useEffect, useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('Kollar servern…');

  useEffect(() => {
    fetch('/api/halsa')
      .then((svar) => svar.json())
      .then((data) => setStatus(data.status === 'ok' ? 'Servern lever.' : 'Något är fel.'))
      .catch(() => setStatus('Kunde inte nå servern.'));
  }, []);

  return (
    <main>
      <h1>Fikalistan</h1>
      <p>{status}</p>
    </main>
  );
}
