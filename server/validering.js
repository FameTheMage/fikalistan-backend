// Kontroll av indata för nya inlägg. Alla felmeddelanden är på svenska.
const GRANSER = {
  namn: { etikett: 'Namnet', max: 50 },
  vad: { etikett: 'Fältet "vad du tar med"', max: 100 },
  kommentar: { etikett: 'Kommentaren', max: 200 },
};

// Styrtecken (nolltecken, radbrytning, tabb m.fl.) tillåts inte. Postgres tar inte
// emot \u0000 och radbrytningar förstör layouten.
const STYRTECKEN = /\p{Cc}/u;
// Blanksteg och osynliga formateringstecken (t.ex. zero-width space) räknas inte som innehåll.
const OSYNLIGT = /[\p{White_Space}\p{Cf}]/gu;

// Längd i tecken (kodpunkter), som i databasen – en emoji räknas som 1.
const langd = (text) => [...text].length;

// Kontrollerar ett textfält. Returnerar { fel } eller { text }; text är null för tomt valfritt fält.
function kontrolleraText(falt, varde, { obligatoriskt }) {
  const { etikett, max } = GRANSER[falt];
  if (typeof varde !== 'string') return { fel: `${etikett} måste vara text.` };
  if (!varde.isWellFormed() || STYRTECKEN.test(varde)) {
    return { fel: `${etikett} innehåller tecken som inte är tillåtna.` };
  }
  if (varde.replace(OSYNLIGT, '') === '') {
    return obligatoriskt ? { fel: `${etikett} får inte vara tomt.` } : { text: null };
  }
  const trimmat = varde.trim();
  if (langd(trimmat) > max) return { fel: `${etikett} får vara högst ${max} tecken.` };
  return { text: trimmat };
}

export function valideraInlagg(kropp) {
  const fel = [];
  const data = kropp && typeof kropp === 'object' && !Array.isArray(kropp) ? kropp : {};

  const kontroll = (falt, obligatoriskt) => {
    const resultat = kontrolleraText(falt, data[falt], { obligatoriskt });
    if (resultat.fel) fel.push(resultat.fel);
    return resultat.text ?? null;
  };

  const namn = kontroll('namn', true);
  const vad = kontroll('vad', true);

  let kommentar = null;
  if (data.kommentar !== undefined && data.kommentar !== null) {
    kommentar = kontroll('kommentar', false);
  }

  if (fel.length > 0) return { fel };
  return { varden: { namn, vad, kommentar } };
}
