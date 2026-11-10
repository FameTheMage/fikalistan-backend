// Sparar ägarnycklar (id -> nyckel) och senaste namnet i webbläsaren.
const NYCKEL_LAGER = 'fikalistan.agarnycklar';
const NAMN_LAGER = 'fikalistan.namn';

const standardLager = () => globalThis.localStorage;

export function hamtaNycklar(lager = standardLager()) {
  try {
    const data = JSON.parse(lager.getItem(NYCKEL_LAGER) ?? '{}');
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

export function sparaNyckel(id, nyckel, lager = standardLager()) {
  try {
    lager.setItem(NYCKEL_LAGER, JSON.stringify({ ...hamtaNycklar(lager), [id]: nyckel }));
  } catch {
    // Lagringen kan vara blockerad – då saknas bara "Ta bort"-knappen.
  }
}

export function glomNyckel(id, lager = standardLager()) {
  const { [id]: _borttagen, ...rest } = hamtaNycklar(lager);
  try {
    lager.setItem(NYCKEL_LAGER, JSON.stringify(rest));
  } catch {
    // ignoreras
  }
}

export function hamtaNamn(lager = standardLager()) {
  try {
    return lager.getItem(NAMN_LAGER) ?? '';
  } catch {
    return '';
  }
}

export function sparaNamn(namn, lager = standardLager()) {
  try {
    lager.setItem(NAMN_LAGER, namn);
  } catch {
    // ignoreras
  }
}
