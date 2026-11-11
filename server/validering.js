// Kontroll av indata för nya inlägg. Alla felmeddelanden är på svenska.
const GRANSER = {
  namn: { etikett: 'Namnet', max: 50 },
  vad: { etikett: 'Fältet "vad du tar med"', max: 100 },
  kommentar: { etikett: 'Kommentaren', max: 200 },
};

// Följande tillåts inte:
//  - styrtecken (nolltecken, radbrytning, tabb m.fl.): Postgres tar inte emot \u0000
//    och radbrytningar förstör layouten
//  - radavskiljare U+2028/2029
//  - bidi-override och -isolering (U+202A–202E, U+2066–2069): kan vända text och utge sig för någon annan
//  - Unicode-taggtecken (U+E0000–E007F), privat användning och icke-tecken: osynliga eller rutor
//  - fler än 3 kombinationstecken i rad ("zalgo"): ger orimligt höga rader
// ZWJ (U+200D) tillåts, den behövs för sammansatta emojis.
const STYRTECKEN =
  /[\p{Cc}\p{Co}\u2028\u2029\u202A-\u202E\u2066-\u2069\u{E0000}-\u{E007F}\uFDD0-\uFDEF\uFFFE\uFFFF]|\p{M}{4}/u;
// Blanksteg och osynliga formateringstecken (t.ex. zero-width space) räknas inte som innehåll.
const OSYNLIGT = /[\p{White_Space}\p{Cf}]/gu;
// Osynliga formateringstecken tas bort ur det sparade värdet, utom ZWJ som sammansatta emojis behöver.
const OSYNLIG_FORMATERING = /(?!‍)\p{Cf}/gu;
// ZWJ i början och slutet räknas inte heller som innehåll.
const KANTER = /^[\s‍]+|[\s‍]+$/gu;

// Längd i tecken (kodpunkter), som i databasen – en emoji räknas som 1.
const langd = (text) => [...text].length;

// Kontrollerar ett textfält. Returnerar { fel } eller { text }; text är null för tomt valfritt fält.
function kontrolleraText(falt, varde, { obligatoriskt }) {
  const { etikett, max } = GRANSER[falt];
  if (typeof varde !== 'string') return { fel: `${etikett} måste vara text.` };
  if (!varde.isWellFormed() || STYRTECKEN.test(varde)) {
    return { fel: `${etikett} innehåller tecken som inte är tillåtna.` };
  }
  const rensad = varde.replace(OSYNLIG_FORMATERING, '');
  if (rensad.replace(OSYNLIGT, '') === '') {
    return obligatoriskt ? { fel: `${etikett} får inte vara tomt.` } : { text: null };
  }
  const trimmat = rensad.replace(KANTER, '');
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
