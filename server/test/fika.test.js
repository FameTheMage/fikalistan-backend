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

const rå = (kropp, rubriker = { 'Content-Type': 'application/json' }) =>
  fetch(`${bas}/api/fika`, { method: 'POST', headers: rubriker, body: kropp });

const otillatna = [
  ['nolltecken i namn', { namn: 'A\u0000B', vad: 'Kaka' }, 'Namnet innehåller tecken som inte är tillåtna.'],
  ['radbrytning i namn', { namn: 'A\nB', vad: 'Kaka' }, 'Namnet innehåller tecken som inte är tillåtna.'],
  ['tabb i vad', { namn: 'Anna', vad: 'A\tB' }, 'Fältet "vad du tar med" innehåller tecken som inte är tillåtna.'],
  ['ensam surrogat i namn', { namn: '\ud800', vad: 'Kaka' }, 'Namnet innehåller tecken som inte är tillåtna.'],
  ['styrtecken i kommentar', { namn: 'Anna', vad: 'Kaka', kommentar: 'a\u0007b' }, 'Kommentaren innehåller tecken som inte är tillåtna.'],
  ['osynligt namn (zero-width space)', { namn: '​', vad: 'Kaka' }, 'Namnet får inte vara tomt.'],
  ['osynligt vad (ordlimmare + nbsp)', { namn: 'Anna', vad: '⁠ ﻿' }, 'Fältet "vad du tar med" får inte vara tomt.'],
];

for (const [namn, kropp, forvantat] of otillatna) {
  test(`POST med ${namn} ger 400`, async () => {
    const svar = await post(kropp);
    assert.equal(svar.status, 400);
    assert.equal((await svar.json()).fel, forvantat);
  });
}

test('osynlig kommentar sparas som null', async () => {
  const data = await (await post({ namn: 'Bo', vad: 'Kaka', kommentar: '​' })).json();
  assert.equal(data.kommentar, null);
});

test('längden räknas i tecken: 50 emojis godtas, 51 nekas', async () => {
  assert.equal((await post({ namn: '😀'.repeat(50), vad: 'Kaka' })).status, 201);
  assert.equal((await post({ namn: '😀'.repeat(51), vad: 'Kaka' })).status, 400);
});

test('vanliga tecken (å, ä, ö, ZWJ-emoji) godtas', async () => {
  const svar = await post({ namn: 'Åsa Öberg', vad: 'Kärleksmums 👩‍🍳' });
  assert.equal(svar.status, 201);
});

const inteObjekt = [
  ['JSON-sträng', '"hej"'],
  ['JSON-null', 'null'],
  ['JSON-tal', '5'],
  ['JSON-lista', '[1,2]'],
];

for (const [namn, kropp] of inteObjekt) {
  test(`${namn} som kropp ger tydligt fel om JSON-objekt`, async () => {
    const svar = await rå(kropp);
    assert.equal(svar.status, 400);
    assert.equal((await svar.json()).fel, 'Förfrågan måste vara ett JSON-objekt.');
  });
}

test('trasig JSON ger fortfarande "Ogiltig JSON"', async () => {
  const svar = await rå('{trasig');
  assert.equal(svar.status, 400);
  assert.equal((await svar.json()).fel, 'Ogiltig JSON i förfrågan.');
});

for (const [namn, rubriker, kropp] of [
  ['fel Content-Type', { 'Content-Type': 'text/plain' }, '{"namn":"A","vad":"B"}'],
  ['ingen Content-Type', {}, '{"namn":"A","vad":"B"}'],
]) {
  test(`${namn} ger fel om att JSON krävs`, async () => {
    const svar = await rå(kropp, rubriker);
    assert.equal(svar.status, 400);
    assert.equal((await svar.json()).fel, 'Förfrågan måste skickas som JSON (Content-Type: application/json).');
  });
}

test('tom kropp med JSON-typ ger fältfel', async () => {
  const svar = await rå('');
  assert.equal(svar.status, 400);
  assert.equal((await svar.json()).detaljer.length, 2);
});

const ta = (id, nyckel) =>
  fetch(`${bas}/api/fika/${id}`, { method: 'DELETE', headers: nyckel ? { 'X-Agar-Token': nyckel } : {} });
const finns = async (id) => (await (await fetch(`${bas}/api/fika`)).json()).some((i) => i.id === id);

test('DELETE med rätt nyckel: 204 och inlägget är borta', async () => {
  const { id, agarNyckel } = await (await post({ namn: 'Cia', vad: 'Frukt' })).json();
  const svar = await ta(id, agarNyckel);
  assert.equal(svar.status, 204);
  assert.equal(await finns(id), false);
});

test('DELETE med fel nyckel: 403 och inlägget finns kvar', async () => {
  const { id } = await (await post({ namn: 'Dan', vad: 'Wienerbröd' })).json();
  const svar = await ta(id, 'fel-nyckel');
  assert.equal(svar.status, 403);
  assert.ok((await svar.json()).fel);
  assert.equal(await finns(id), true);
});

test('DELETE utan nyckel eller med ogiltigt id: 400', async () => {
  const { id, agarNyckel } = await (await post({ namn: 'Eva', vad: 'Kex' })).json();
  assert.equal((await ta(id)).status, 400);
  assert.equal((await ta('inte-ett-uuid', agarNyckel)).status, 400);
  assert.equal(await finns(id), true);
});

test('DELETE av okänt id: 404', async () => {
  const svar = await ta('00000000-0000-4000-8000-000000000000', 'x');
  assert.equal(svar.status, 404);
});

const forbjudna = [
  ['bidi-override (U+202E)', 'Anna‮admin'],
  ['bidi-isolering (U+2066)', '⁦Anna'],
  ['Unicode-tagg (U+E0041)', 'A\u{E0041}'],
  ['privat användning (U+E000)', 'A'],
  ['radavskiljare (U+2028)', 'A B'],
  ['styckeavskiljare (U+2029)', 'A B'],
  ['icke-tecken (U+FFFF)', 'A￿'],
  ['staplade kombinationstecken (zalgo)', 'a' + '̀́̂̃'.repeat(3)],
];

for (const [namn, text] of forbjudna) {
  test(`POST med ${namn} i namnet ger 400`, async () => {
    const svar = await post({ namn: text, vad: 'Kaka' });
    assert.equal(svar.status, 400);
    assert.equal((await svar.json()).fel, 'Namnet innehåller tecken som inte är tillåtna.');
  });
}

test('vanliga kombinationstecken (á, ñ, e + två accenter) och ZWJ godtas', async () => {
  const svar = await post({ namn: 'áñé̂ 👨‍👩‍👧', vad: 'Kaka' });
  assert.equal(svar.status, 201);
});

test('DELETE med versal-UUID hittar inlägget', async () => {
  const { id, agarNyckel } = await (await post({ namn: 'Versal', vad: 'Kaka' })).json();
  const svar = await ta(id.toUpperCase(), agarNyckel);
  assert.equal(svar.status, 204);
  assert.equal(await finns(id), false);
});
