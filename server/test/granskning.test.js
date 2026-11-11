import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../app.js';
import { skapaMinnesDb } from '../db/minne.js';
import { valideraInlagg } from '../validering.js';

const UTVECKLING = ['localhost', '127.0.0.1', '::1'];

// fetch (undici) ignorerar ett eget Host-huvud, så här skickas förfrågan med node:http.
const medHost = (url, host) =>
  new Promise((klar, nej) => {
    const u = new URL(url);
    http
      .get({ hostname: u.hostname, port: u.port, path: u.pathname, headers: { Host: host } }, (svar) => {
        let data = '';
        svar.on('data', (c) => (data += c));
        svar.on('end', () => klar({ status: svar.statusCode, text: data, json: () => JSON.parse(data) }));
      })
      .on('error', nej);
  });

const starta = async (alternativ = {}) => {
  const app = createApp({ db: skapaMinnesDb(), ...alternativ });
  const server = await new Promise((klar) => {
    const s = app.listen(0, '127.0.0.1', () => klar(s));
  });
  return { server, bas: `http://127.0.0.1:${server.address().port}` };
};

// --- Fynd 1: Host-huvudet i utveckling (skydd mot DNS rebinding) ---

test('utveckling: förfrågan med okänt Host-huvud nekas med 403 på svenska', async () => {
  const { server, bas } = await starta({ tillatnaVardar: UTVECKLING });
  try {
    const svar = await medHost(`${bas}/api/fika`, 'evil.example.com');
    assert.equal(svar.status, 403);
    assert.equal((await svar.json()).fel, 'Okänt värdnamn i förfrågan.');
  } finally {
    server.close();
  }
});

test('utveckling: localhost och 127.0.0.1 med port godtas', async () => {
  const { server, bas } = await starta({ tillatnaVardar: UTVECKLING });
  try {
    const port = server.address().port;
    assert.equal((await medHost(`${bas}/api/halsa`, `localhost:${port}`)).status, 200);
    assert.equal((await medHost(`${bas}/api/halsa`, `127.0.0.1:${port}`)).status, 200);
  } finally {
    server.close();
  }
});

test('utveckling: subdomän som bara börjar med localhost nekas', async () => {
  const { server, bas } = await starta({ tillatnaVardar: UTVECKLING });
  try {
    const svar = await medHost(`${bas}/api/halsa`, 'localhost.evil.example.com');
    assert.equal(svar.status, 403);
  } finally {
    server.close();
  }
});

test('utan tillatnaVardar (produktion) kontrolleras inte Host-huvudet', async () => {
  const { server, bas } = await starta();
  try {
    assert.equal((await medHost(`${bas}/api/halsa`, 'vilket-som-helst.se')).status, 200);
  } finally {
    server.close();
  }
});

// --- Fynd 2: osynliga tecken ---

test('osynliga formateringstecken tas bort ur det sparade namnet', () => {
  const { varden } = valideraInlagg({ namn: '​Anna​­', vad: 'Kaka' });
  assert.equal(varden.namn, 'Anna');
});

test('ett namn som bara består av osynliga tecken nekas', () => {
  const { fel } = valideraInlagg({ namn: '​­﻿', vad: 'Kaka' });
  assert.deepEqual(fel, ['Namnet får inte vara tomt.']);
});

test('ZWJ inuti en emoji-sekvens behålls', () => {
  const familj = '👨‍👩‍👧';
  const { varden } = valideraInlagg({ namn: familj, vad: 'Kaka' });
  assert.equal(varden.namn, familj);
});

test('osynliga tecken räknas inte mot maxlängden', () => {
  const { varden } = valideraInlagg({ namn: 'a'.repeat(50) + '​', vad: 'Kaka' });
  assert.equal(varden.namn.length, 50);
});
