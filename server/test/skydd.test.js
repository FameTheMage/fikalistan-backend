import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { skapaMinnesDb } from '../db/minne.js';
import { MAX_LISTA } from '../routes/fika.js';

const starta = async (alternativ) => {
  const app = createApp({ db: skapaMinnesDb(), ...alternativ });
  const server = await new Promise((klar) => {
    const s = app.listen(0, '127.0.0.1', () => klar(s));
  });
  return { server, bas: `http://127.0.0.1:${server.address().port}` };
};

const post = (bas, namn = 'Anna') =>
  fetch(`${bas}/api/fika`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ namn, vad: 'Kaka' }),
  });

// --- Fynd 6: begränsning av antal anrop och listans storlek ---

test('för många POST i rad ger 429 med svenskt fel och Retry-After', async () => {
  const { server, bas } = await starta({ begransning: { max: 3, fonsterMs: 60_000 } });
  try {
    for (let i = 0; i < 3; i++) assert.equal((await post(bas)).status, 201);
    const svar = await post(bas);
    assert.equal(svar.status, 429);
    assert.equal((await svar.json()).fel, 'För många förfrågningar. Vänta en stund och försök igen.');
    assert.ok(Number(svar.headers.get('retry-after')) > 0);
  } finally {
    server.close();
  }
});

test('begränsningen gäller bara skrivande anrop: GET påverkas inte', async () => {
  const { server, bas } = await starta({ begransning: { max: 1, fonsterMs: 60_000 } });
  try {
    await post(bas);
    for (let i = 0; i < 5; i++) assert.equal((await fetch(`${bas}/api/fika`)).status, 200);
  } finally {
    server.close();
  }
});

test('begränsningen släpper igenom igen när tidsfönstret gått ut', async () => {
  const { server, bas } = await starta({ begransning: { max: 1, fonsterMs: 100 } });
  try {
    assert.equal((await post(bas)).status, 201);
    assert.equal((await post(bas)).status, 429);
    await new Promise((klar) => setTimeout(klar, 150));
    assert.equal((await post(bas)).status, 201);
  } finally {
    server.close();
  }
});

test('GET listar högst MAX_LISTA inlägg, de nyaste', async () => {
  const db = skapaMinnesDb();
  for (let i = 0; i < MAX_LISTA + 5; i++) {
    await db.skapa({ namn: `N${i}`, vad: 'x', agarHash: 'h' });
  }
  const app = createApp({ db });
  const server = await new Promise((klar) => {
    const s = app.listen(0, '127.0.0.1', () => klar(s));
  });
  try {
    const lista = await (await fetch(`http://127.0.0.1:${server.address().port}/api/fika`)).json();
    assert.equal(lista.length, MAX_LISTA);
    assert.equal(lista[0].namn, `N${MAX_LISTA + 4}`);
  } finally {
    server.close();
  }
});

// --- Fynd 7: säkerhetshuvuden ---

test('svar har säkerhetshuvuden och avslöjar inte Express', async () => {
  const { server, bas } = await starta();
  try {
    const svar = await fetch(`${bas}/api/halsa`);
    assert.equal(svar.headers.get('x-powered-by'), null);
    assert.equal(svar.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(svar.headers.get('x-frame-options'), 'DENY');
    assert.equal(svar.headers.get('referrer-policy'), 'no-referrer');
  } finally {
    server.close();
  }
});

test('i produktion skickas en Content-Security-Policy', async () => {
  const { server, bas } = await starta({ produktion: true });
  try {
    const csp = (await fetch(`${bas}/api/halsa`)).headers.get('content-security-policy');
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /script-src 'self'(;|$)/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /font-src https:\/\/fonts\.gstatic\.com/);
  } finally {
    server.close();
  }
});

// --- Fynd 9: fel utanför /api fångas av felhanteraren ---

test('fel i monterade rutter utanför /api ger svensk text, inte Expresss HTML', async () => {
  const { server, bas } = await starta({
    montera: (app) =>
      app.get('/kraschar', () => {
        throw new Error('hemlig stacktrace');
      }),
  });
  try {
    const svar = await fetch(`${bas}/kraschar`);
    assert.equal(svar.status, 500);
    const text = await svar.text();
    assert.equal(text, 'Något gick fel på servern.');
    assert.equal(text.includes('hemlig'), false);
  } finally {
    server.close();
  }
});
