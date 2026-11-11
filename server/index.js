import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';
import { skapaSupabaseDb } from './db/supabase.js';
import { begransningsgranser, tillatnaVardnamn, tolkaTrustProxy } from './konfig.js';

const rot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const produktion = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3001;
// Utveckling lyssnar bara på den egna datorn (Vite visar annars källkoden för hela nätverket).
// Produktion lyssnar på alla nätverkskort om inte HOST sätts.
const host = process.env.HOST || (produktion ? undefined : '127.0.0.1');

let db;
let trustProxy;
let begransning;
try {
  db = skapaSupabaseDb({
    url: process.env.SUPABASE_URL,
    hemligNyckel: process.env.SUPABASE_SECRET_KEY,
  });
  trustProxy = tolkaTrustProxy(process.env.TRUST_PROXY);
  // Skrivande anrop (POST/DELETE) per IP-adress. Standard: 20 per minut och 300 per timme.
  begransning = begransningsgranser(process.env);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

let montera;
if (produktion) {
  const dist = path.join(rot, 'dist');
  montera = (app) => {
    app.use(express.static(dist));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  };
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    root: rot,
    server: { middlewareMode: true },
    appType: 'spa',
  });
  montera = (app) => app.use(vite.middlewares);
}

// Vid proxy: TRUST_PROXY=1 så används rätt IP-adress för gränsen.
const app = createApp({
  db,
  produktion,
  montera,
  begransning,
  tillatnaVardar: produktion ? undefined : tillatnaVardnamn(process.env.HOST),
});
if (trustProxy !== undefined) app.set('trust proxy', trustProxy);

app.listen(port, host, () => {
  console.log(`Fikalistan körs på http://${host ?? 'localhost'}:${port}`);
});
