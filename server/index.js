import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';
import { skapaSupabaseDb } from './db/supabase.js';

const rot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const produktion = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3001;
// Utveckling lyssnar bara på den egna datorn (Vite visar annars källkoden för hela nätverket).
// Produktion lyssnar på alla nätverkskort om inte HOST sätts.
const host = process.env.HOST || (produktion ? undefined : '127.0.0.1');

let db;
try {
  db = skapaSupabaseDb({
    url: process.env.SUPABASE_URL,
    hemligNyckel: process.env.SUPABASE_SECRET_KEY,
  });
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

// Skrivande anrop (POST/DELETE) per IP-adress: max 20 per minut och 100 per timme.
// MAX_SKRIV_PER_MINUT ändrar minutgränsen, t.ex. för ett kontor bakom en gemensam IP.
const begransning = [
  { max: Number(process.env.MAX_SKRIV_PER_MINUT) || 20, fonsterMs: 60_000 },
  { max: 100, fonsterMs: 3_600_000 },
];
// Står servern bakom en proxy: sätt TRUST_PROXY=1 så att rätt IP-adress används.
const app = createApp({ db, produktion, montera, begransning });
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

app.listen(port, host, () => {
  console.log(`Fikalistan körs på http://${host ?? 'localhost'}:${port}`);
});
