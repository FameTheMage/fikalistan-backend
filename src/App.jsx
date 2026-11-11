import { useCallback, useEffect, useState } from 'react';
import { hamtaLista, skapaInlagg, taBortInlagg } from './api.js';
import { glomNyckel, hamtaNamn, hamtaNycklar, sparaNamn, sparaNyckel } from './nycklar.js';

const formateraTid = (iso) =>
  new Date(iso).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });

export default function App() {
  const [lista, setLista] = useState([]);
  const [laddar, setLaddar] = useState(true);
  const [listFel, setListFel] = useState('');
  const [nycklar, setNycklar] = useState(() => hamtaNycklar());
  const [namn, setNamn] = useState(() => hamtaNamn());
  const [vad, setVad] = useState('');
  const [kommentar, setKommentar] = useState('');
  const [formFel, setFormFel] = useState([]);
  const [skickar, setSkickar] = useState(false);

  const ladda = useCallback(async () => {
    try {
      setLista(await hamtaLista());
      setListFel('');
    } catch (fel) {
      setListFel(fel.message);
    } finally {
      setLaddar(false);
    }
  }, []);

  useEffect(() => {
    ladda();
  }, [ladda]);

  async function skicka(e) {
    e.preventDefault();
    setSkickar(true);
    setFormFel([]);
    try {
      const { agarNyckel, ...inlagg } = await skapaInlagg({ namn, vad, kommentar });
      sparaNyckel(inlagg.id, agarNyckel);
      sparaNamn(namn.trim());
      setNycklar(hamtaNycklar());
      setLista((nu) => [inlagg, ...nu]);
      setVad('');
      setKommentar('');
    } catch (fel) {
      setFormFel(fel.detaljer?.length ? fel.detaljer : [fel.message]);
    } finally {
      setSkickar(false);
    }
  }

  async function taBort(id) {
    try {
      await taBortInlagg(id, nycklar[id]);
      glomNyckel(id);
      setNycklar(hamtaNycklar());
      setLista((nu) => nu.filter((i) => i.id !== id));
      setListFel('');
    } catch (fel) {
      setListFel(fel.message);
      ladda();
    }
  }

  return (
    <main>
      <h1>Fikalistan</h1>

      <form onSubmit={skicka}>
        <label>
          Ditt namn
          <input value={namn} onChange={(e) => setNamn(e.target.value)} maxLength={50} />
        </label>
        <label>
          Vad tar du med?
          <input value={vad} onChange={(e) => setVad(e.target.value)} maxLength={100} />
        </label>
        <label>
          Kommentar (valfritt)
          <input value={kommentar} onChange={(e) => setKommentar(e.target.value)} maxLength={200} />
        </label>
        {formFel.length > 0 && (
          <ul role="alert">
            {formFel.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        <button type="submit" disabled={skickar}>
          {skickar ? 'Skickar…' : 'Lägg till'}
        </button>
      </form>

      {listFel && <p role="alert">{listFel}</p>}
      {laddar ? (
        <p>Hämtar listan…</p>
      ) : (
        <ul>
          {lista.map((i) => (
            <li key={i.id}>
              <strong>{i.namn}</strong> tar med {i.vad}
              {i.kommentar ? ` (${i.kommentar})` : ''} <small>{formateraTid(i.skapad)}</small>
              {nycklar[i.id] && (
                <button type="button" onClick={() => taBort(i.id)}>
                  Ta bort
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
