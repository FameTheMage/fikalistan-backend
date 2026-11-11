import { randomUUID } from 'node:crypto';

// Låtsasdatabas för tester. Samma gränssnitt som db/supabase.js.
export function skapaMinnesDb() {
  const rader = [];
  let senaste = 0;

  const utanHash = ({ agar_hash, ...resten }) => resten;

  return {
    // Nyaste först, utan agar_hash.
    async lista(gräns = Infinity) {
      return [...rader].reverse().slice(0, gräns).map(utanHash);
    },

    // Returnerar det skapade inlägget utan agar_hash.
    async skapa({ namn, vad, kommentar = null, agarHash }) {
      // Se till att tidsstämplarna är strikt stigande även inom samma millisekund.
      senaste = Math.max(senaste + 1, Date.now());
      const rad = {
        id: randomUUID(),
        namn,
        vad,
        kommentar,
        agar_hash: agarHash,
        skapad: new Date(senaste).toISOString(),
      };
      rader.push(rad);
      return utanHash(rad);
    },

    // Returnerar inlägget MED agar_hash (behövs för att kontrollera nyckeln), eller null.
    async hamta(id) {
      const rad = rader.find((r) => r.id === id);
      return rad ? { ...rad } : null;
    },

    // Returnerar true om något togs bort.
    async taBort(id) {
      const index = rader.findIndex((r) => r.id === id);
      if (index === -1) return false;
      rader.splice(index, 1);
      return true;
    },
  };
}
