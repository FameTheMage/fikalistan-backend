import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { skapaMinnesDb } from '../db/minne.js';

let server;
let bas;

before(async () => {
  const app = createApp({ db: skapaMinnesDb() });
  await new Promise((klar) => {
    server = app.listen(0, klar);
  });
  bas = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const post = (kropp) =>
  fetch(`${bas}/api/fika`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(kropp),
  });

test('POST skapar inlägg: 201, id, tid och ägarnyckel en gång', async () => {
  const svar = await post({ namn: ' Anna ', vad: 'Kanelbullar', kommentar: 'Räcker till 6' });
  assert.equal(svar.status, 201);
  const data = await svar.json();
  assert.equal(data.namn, 'Anna');
  assert.equal(data.vad, 'Kanelbullar');
  assert.equal(data.kommentar, 'Räcker till 6');
  assert.ok(data.id && data.skapad);
  assert.match(data.agarNyckel, /^[0-9a-f]{48}$/);
  assert.equal('agar_hash' in data, false);
});

test('tom kommentar sparas som null och okända fält ignoreras', async () => {
  const data = await (await post({ namn: 'Bo', vad: 'Kaka', kommentar: '  ', extra: 'x' })).json();
  assert.equal(data.kommentar, null);
  assert.equal('extra' in data, false);
});

test('GET listar nyast först och visar aldrig nyckel eller hash', async () => {
  const forsta = await (await post({ namn: 'Först', vad: 'A' })).json();
  const andra = await (await post({ namn: 'Sist', vad: 'B' })).json();
  const svar = await fetch(`${bas}/api/fika`);
  assert.equal(svar.status, 200);
  const lista = await svar.json();
  const ids = lista.map((r) => r.id);
  assert.ok(ids.indexOf(andra.id) < ids.indexOf(forsta.id));
  const text = JSON.stringify(lista);
  assert.equal(text.includes('agar_hash'), false);
  assert.equal(text.includes('agarNyckel'), false);
  assert.equal(text.includes(forsta.agarNyckel), false);
});

const ogiltiga = [
  ['namn saknas', { vad: 'Kaka' }, 'Namnet måste vara text.'],
  ['namn bara blanksteg', { namn: '   ', vad: 'Kaka' }, 'Namnet får inte vara tomt.'],
  ['namn för långt', { namn: 'x'.repeat(51), vad: 'Kaka' }, 'Namnet får vara högst 50 tecken.'],
  ['namn inte text', { namn: 5, vad: 'Kaka' }, 'Namnet måste vara text.'],
  ['vad saknas', { namn: 'Anna' }, 'Fältet "vad du tar med" måste vara text.'],
  ['vad tomt', { namn: 'Anna', vad: '' }, 'Fältet "vad du tar med" får inte vara tomt.'],
  ['vad för långt', { namn: 'Anna', vad: 'x'.repeat(101) }, 'Fältet "vad du tar med" får vara högst 100 tecken.'],
  ['kommentar inte text', { namn: 'Anna', vad: 'Kaka', kommentar: 7 }, 'Kommentaren måste vara text.'],
  ['kommentar för lång', { namn: 'Anna', vad: 'Kaka', kommentar: 'x'.repeat(201) }, 'Kommentaren får vara högst 200 tecken.'],
];

for (const [namn, kropp, forvantat] of ogiltiga) {
  test(`POST med ${namn} ger 400`, async () => {
    const svar = await post(kropp);
    assert.equal(svar.status, 400);
    assert.equal((await svar.json()).fel, forvantat);
  });
}

test('flera fel samtidigt ger detaljer', async () => {
  const svar = await post({});
  assert.equal(svar.status, 400);
  const data = await svar.json();
  assert.equal(data.detaljer.length, 2);
  assert.ok(data.fel);
});

test('gränsvärden 50/100/200 tecken godtas', async () => {
  const svar = await post({ namn: 'x'.repeat(50), vad: 'y'.repeat(100), kommentar: 'z'.repeat(200) });
  assert.equal(svar.status, 201);
});

test('kropp som inte är ett objekt ger 400', async () => {
  const svar = await post([1, 2]);
  assert.equal(svar.status, 400);
});
