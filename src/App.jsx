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
      <h1>Fikalistan ☕</h1>
      <p className="under">Skriv upp vad du tar med till fikat – så ser alla vad som redan är på gång.</p>

      <form onSubmit={skicka}>
        <h2>Jag tar med…</h2>
        <label>
          Ditt namn
          <input
            value={namn}
            onChange={(e) => setNamn(e.target.value)}
            maxLength={50}
            required
            autoComplete="name"
          />
        </label>
        <label>
          Vad tar du med?
          <input
            value={vad}
            onChange={(e) => setVad(e.target.value)}
            maxLength={100}
            required
            placeholder="t.ex. kanelbullar"
          />
        </label>
        <label>
          Kommentar (valfritt)
          <input
            value={kommentar}
            onChange={(e) => setKommentar(e.target.value)}
            maxLength={200}
            placeholder="t.ex. räcker till 6 personer"
          />
        </label>
        {formFel.length > 0 && (
          <ul className="fel" role="alert">
            {formFel.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        <button type="submit" disabled={skickar}>
          {skickar ? 'Skickar…' : 'Lägg till'}
        </button>
      </form>

      <h2>På fikabordet</h2>
      {listFel && (
        <div className="listfel" role="alert">
          <p>{listFel}</p>
          <button type="button" onClick={ladda}>
            Försök igen
          </button>
        </div>
      )}
      {laddar ? (
        <p className="status" role="status">
          Hämtar listan…
        </p>
      ) : lista.length === 0 && !listFel ? (
        <p className="tomt">Ingen har anmält något än – bli först!</p>
      ) : (
        <ul className="lista" aria-live="polite">
          {lista.map((i) => (
            <li className="inlagg" key={i.id}>
              <div className="inlagg-text">
                <div className="vad">{i.vad}</div>
                {i.kommentar && <div className="kommentar">{i.kommentar}</div>}
                <div className="vem">
                  {i.namn} · <time dateTime={i.skapad}>{formateraTid(i.skapad)}</time>
                </div>
              </div>
              {nycklar[i.id] && (
                <button
                  type="button"
                  className="ta-bort"
                  aria-label={`Ta bort ${i.namn}s inlägg: ${i.vad}`}
                  onClick={() => taBort(i.id)}
                >
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
