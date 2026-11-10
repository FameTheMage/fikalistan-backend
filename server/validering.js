// Kontroll av indata för nya inlägg. Alla felmeddelanden är på svenska.
const GRANSER = {
  namn: { etikett: 'Namnet', max: 50 },
  vad: { etikett: 'Fältet "vad du tar med"', max: 100 },
  kommentar: { etikett: 'Kommentaren', max: 200 },
};

export function valideraInlagg(kropp) {
  const fel = [];
  const data = kropp && typeof kropp === 'object' && !Array.isArray(kropp) ? kropp : {};

  const obligatoriskt = (falt) => {
    const { etikett, max } = GRANSER[falt];
    const varde = data[falt];
    if (typeof varde !== 'string') {
      fel.push(`${etikett} måste vara text.`);
      return null;
    }
    const trimmat = varde.trim();
    if (trimmat.length === 0) {
      fel.push(`${etikett} får inte vara tomt.`);
      return null;
    }
    if (trimmat.length > max) {
      fel.push(`${etikett} får vara högst ${max} tecken.`);
      return null;
    }
    return trimmat;
  };

  const namn = obligatoriskt('namn');
  const vad = obligatoriskt('vad');

  let kommentar = null;
  if (data.kommentar !== undefined && data.kommentar !== null) {
    if (typeof data.kommentar !== 'string') {
      fel.push(`${GRANSER.kommentar.etikett} måste vara text.`);
    } else {
      const trimmat = data.kommentar.trim();
      if (trimmat.length > GRANSER.kommentar.max) {
        fel.push(`${GRANSER.kommentar.etikett} får vara högst ${GRANSER.kommentar.max} tecken.`);
      } else {
        kommentar = trimmat === '' ? null : trimmat;
      }
    }
  }

  if (fel.length > 0) return { fel };
  return { varden: { namn, vad, kommentar } };
}
