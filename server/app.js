import express from 'express';
import { fikaRoutes } from './routes/fika.js';

// Bygger Express-appen utan att starta något. `db` är databaslagret
// (riktiga Supabase eller minnesversionen i tester).
export function createApp({ db } = {}) {
  const app = express();
  app.locals.db = db;

  app.use(express.json({ limit: '10kb', strict: false }));

  app.get('/api/halsa', (_req, res) => {
    res.json({ status: 'ok' });
  });

  if (db) app.use('/api/fika', fikaRoutes(db));

  app.use('/api', (_req, res) => {
    res.status(404).json({ fel: 'Adressen finns inte.' });
  });

  // Ogiltig JSON eller andra oväntade fel under /api
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ fel: 'Ogiltig JSON i förfrågan.' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ fel: 'Förfrågan är för stor.' });
    }
    console.error(err);
    res.status(500).json({ fel: 'Något gick fel på servern.' });
  });

  return app;
}
