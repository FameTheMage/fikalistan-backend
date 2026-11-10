import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';

const rot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const produktion = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3001;

// Databaslagret kopplas in i steg 3–4.
const app = createApp({ db: null });

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
