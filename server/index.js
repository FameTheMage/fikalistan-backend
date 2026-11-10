import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';
import { skapaSupabaseDb } from './db/supabase.js';

const rot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const produktion = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3001;

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
const app = createApp({ db });

if (produktion) {
  const dist = path.join(rot, 'dist');
  app.use(express.static(dist));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    root: rot,
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, () => {
  console.log(`Fikalistan körs på http://localhost:${port}`);
});
