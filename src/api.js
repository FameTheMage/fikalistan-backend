// Pratar bara med vårt eget /api. Kastar Error med svenskt meddelande vid fel.
async function lasFel(svar) {
  try {
    const data = await svar.json();
    const detaljer = Array.isArray(data.detaljer) ? data.detaljer : [];
    const fel = new Error(data.fel ?? 'Något gick fel. Försök igen.');
    fel.detaljer = detaljer;
    fel.status = svar.status;
    return fel;
  } catch {
    const fel = new Error('Något gick fel. Försök igen.');
    fel.detaljer = [];
    fel.status = svar.status;
    return fel;
  }
}

async function anropa(url, alternativ, hamtare) {
  let svar;
  try {
    svar = await hamtare(url, alternativ);
  } catch {
    const fel = new Error('Kunde inte nå servern. Kontrollera anslutningen och försök igen.');
    fel.detaljer = [];
    throw fel;
  }
  if (!svar.ok) throw await lasFel(svar);
  return svar;
}

export async function hamtaLista(hamtare = globalThis.fetch.bind(globalThis)) {
  const svar = await anropa('/api/fika', undefined, hamtare);
  return svar.json();
}

export async function skapaInlagg(inlagg, hamtare = globalThis.fetch.bind(globalThis)) {
  const svar = await anropa(
    '/api/fika',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inlagg),
    },
    hamtare,
  );
  return svar.json();
}

export async function taBortInlagg(id, nyckel, hamtare = globalThis.fetch.bind(globalThis)) {
  await anropa(
    `/api/fika/${encodeURIComponent(id)}`,
    { method: 'DELETE', headers: { 'X-Agar-Token': nyckel } },
    hamtare,
  );
}
