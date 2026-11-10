import test from 'node:test';
import assert from 'node:assert/strict';
import { hamtaLista, skapaInlagg, taBortInlagg } from './api.js';
import { glomNyckel, hamtaNamn, hamtaNycklar, sparaNamn, sparaNyckel } from './nycklar.js';

const svar = (status, data) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});

function lager() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
}

test('hamtaLista returnerar listan', async () => {
  const lista = await hamtaLista(async () => svar(200, [{ id: '1' }]));
  assert.deepEqual(lista, [{ id: '1' }]);
});

test('skapaInlagg skickar JSON och returnerar svaret', async () => {
  let anrop;
  const ut = await skapaInlagg({ namn: 'Eva', vad: 'Kaka' }, async (url, alt) => {
    anrop = { url, alt };
    return svar(201, { id: '1', agarNyckel: 'abc' });
  });
  assert.equal(anrop.url, '/api/fika');
  assert.equal(anrop.alt.method, 'POST');
  assert.deepEqual(JSON.parse(anrop.alt.body), { namn: 'Eva', vad: 'Kaka' });
  assert.equal(ut.agarNyckel, 'abc');
});

test('API-fel ger svenskt meddelande och detaljer', async () => {
  await assert.rejects(
    skapaInlagg({}, async () => svar(400, { fel: 'Inlägget är inte giltigt.', detaljer: ['Namnet får inte vara tomt.'] })),
    (fel) => fel.message === 'Inlägget är inte giltigt.' && fel.detaljer[0] === 'Namnet får inte vara tomt.',
  );
});

test('nätverksfel ger svenskt meddelande', async () => {
  await assert.rejects(
    hamtaLista(async () => {
      throw new TypeError('fetch failed');
    }),
    /Kunde inte nå servern/,
  );
});

test('taBortInlagg skickar nyckeln i X-Agar-Token', async () => {
  let anrop;
  await taBortInlagg('abc', 'hemlig', async (url, alt) => {
    anrop = { url, alt };
    return { ok: true, status: 204 };
  });
  assert.equal(anrop.url, '/api/fika/abc');
  assert.equal(anrop.alt.method, 'DELETE');
  assert.equal(anrop.alt.headers['X-Agar-Token'], 'hemlig');
});

test('taBortInlagg med fel nyckel ger 403-fel', async () => {
  await assert.rejects(
    taBortInlagg('abc', 'fel', async () => svar(403, { fel: 'Fel ägarnyckel.' })),
    (fel) => fel.status === 403 && fel.message === 'Fel ägarnyckel.',
  );
});

test('nycklar sparas och glöms per id', () => {
  const l = lager();
  sparaNyckel('a', '1', l);
  sparaNyckel('b', '2', l);
  assert.deepEqual(hamtaNycklar(l), { a: '1', b: '2' });
  glomNyckel('a', l);
  assert.deepEqual(hamtaNycklar(l), { b: '2' });
});

test('trasig lagring ger tom karta och namnet kommer ihåg', () => {
  const l = lager();
  l.setItem('fikalistan.agarnycklar', 'inte json');
  assert.deepEqual(hamtaNycklar(l), {});
  assert.equal(hamtaNamn(l), '');
  sparaNamn('Eva', l);
  assert.equal(hamtaNamn(l), 'Eva');
});
