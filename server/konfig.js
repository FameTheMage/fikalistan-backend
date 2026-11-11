// Läser inställningar från miljövariablerna. Fel kastas med ett svenskt meddelande.
const HELTAL = /^[1-9]\d*$/;

function heltal(varde, standard, namn) {
  if (varde === undefined || varde === '') return standard;
  if (!HELTAL.test(varde)) throw new Error(`${namn} måste vara ett positivt heltal.`);
  return Number(varde);
}

// TRUST_PROXY är antalet proxyer framför servern. Bara heltal godtas: värden som "true"
// skulle få Express att lita på vilken X-Forwarded-For som helst, och då kan gränsen kringgås.
export function tolkaTrustProxy(varde) {
  if (varde === undefined || varde === '') return undefined;
  if (!HELTAL.test(varde)) {
    throw new Error('TRUST_PROXY måste vara ett heltal, t.ex. 1 (antal proxyer framför servern).');
  }
  return Number(varde);
}

// Gränser för skrivande anrop per IP-adress: en per minut och en per timme.
export function begransningsgranser(env = {}) {
  return [
    { max: heltal(env.MAX_SKRIV_PER_MINUT, 20, 'MAX_SKRIV_PER_MINUT'), fonsterMs: 60_000 },
    { max: heltal(env.MAX_SKRIV_PER_TIMME, 300, 'MAX_SKRIV_PER_TIMME'), fonsterMs: 3_600_000 },
  ];
}

// Värdnamn som utvecklingsservern godtar i Host-huvudet. Skyddar mot DNS rebinding,
// där en webbsida på ett annat domännamn annars kan läsa svar från localhost.
export function tillatnaVardnamn(host) {
  const namn = ['localhost', '127.0.0.1', '::1'];
  if (host) namn.push(host);
  return namn;
}
