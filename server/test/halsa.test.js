import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

let server;
let bas;

before(async () => {
  const app = createApp({ db: null });
  await new Promise((klar) => {
    server = app.listen(0, klar);
  });
  bas = `http://localhost:${server.address().port}`;
});

after(() => {
  server.close();
});

test('GET /api/halsa svarar 200 med status ok', async () => {
  const svar = await fetch(`${bas}/api/halsa`);
  assert.equal(svar.status, 200);
  assert.deepEqual(await svar.json(), { status: 'ok' });
});

test('okänd /api-adress svarar 404 med svenskt fel', async () => {
  const svar = await fetch(`${bas}/api/finns-inte`);
  assert.equal(svar.status, 404);
  const data = await svar.json();
  assert.equal(data.fel, 'Adressen finns inte.');
});

test('ogiltig JSON svarar 400 med svenskt fel', async () => {
  const svar = await fetch(`${bas}/api/halsa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{trasig',
  });
  assert.equal(svar.status, 400);
  const data = await svar.json();
  assert.equal(data.fel, 'Ogiltig JSON i förfrågan.');
});
