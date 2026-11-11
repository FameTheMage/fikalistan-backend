import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skapaMinnesDb } from '../db/minne.js';

const inlagg = (namn) => ({ namn, vad: 'Kanelbullar', kommentar: null, agarHash: `hash-${namn}` });

test('skapa returnerar inlägget med id och tid, utan agar_hash', async () => {
  const db = skapaMinnesDb();
  const nytt = await db.skapa({ namn: 'Anna', vad: 'Kaka', kommentar: 'Räcker till 6', agarHash: 'h' });
  assert.equal(nytt.namn, 'Anna');
  assert.equal(nytt.kommentar, 'Räcker till 6');
  assert.ok(nytt.id && nytt.skapad);
  assert.equal('agar_hash' in nytt, false);
});

test('lista ger nyaste först och aldrig agar_hash', async () => {
  const db = skapaMinnesDb();
  await db.skapa(inlagg('Anna'));
  await db.skapa(inlagg('Bo'));
  await db.skapa(inlagg('Cia'));
  const lista = await db.lista();
  assert.deepEqual(lista.map((r) => r.namn), ['Cia', 'Bo', 'Anna']);
  assert.ok(lista.every((r) => !('agar_hash' in r)));
});

test('hamta ger inlägget med agar_hash, eller null om det saknas', async () => {
  const db = skapaMinnesDb();
  const nytt = await db.skapa(inlagg('Anna'));
  assert.equal((await db.hamta(nytt.id)).agar_hash, 'hash-Anna');
  assert.equal(await db.hamta('00000000-0000-0000-0000-000000000000'), null);
});

test('taBort tar bort inlägget och ger false för okänt id', async () => {
  const db = skapaMinnesDb();
  const nytt = await db.skapa(inlagg('Anna'));
  assert.equal(await db.taBort(nytt.id), true);
  assert.equal(await db.hamta(nytt.id), null);
  assert.deepEqual(await db.lista(), []);
  assert.equal(await db.taBort(nytt.id), false);
});

test('lista(gräns) ger bara de nyaste inläggen', async () => {
  const db = skapaMinnesDb();
  for (const namn of ['Anna', 'Bo', 'Cia']) await db.skapa(inlagg(namn));
  assert.deepEqual((await db.lista(2)).map((r) => r.namn), ['Cia', 'Bo']);
});
