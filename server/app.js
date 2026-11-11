import express from 'express';
import { fikaRoutes } from './routes/fika.js';
import { skapaBegransare } from './begransning.js';

// Skickas bara i produktion: Vite i utvecklingsläge behöver inline-skript och websocket.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

// Bygger Express-appen utan att starta något. `db` är databaslagret
// (riktiga Supabase eller minnesversionen i tester).
//   begransning – { max, fonsterMs } slår på gräns för antal skrivande anrop per IP
//   produktion  – skickar Content-Security-Policy
//   montera     – (app) => void, lägger till rutter (t.ex. statiska filer) FÖRE felhanteraren
export function createApp({ db, begransning, produktion = false, montera } = {}) {
  const app = express();
  app.locals.db = db;
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
    });
    if (produktion) res.set('Content-Security-Policy', CSP);
    next();
  });

  if (begransning) app.use('/api', skapaBegransare(begransning));

  app.use(express.json({ limit: '10kb', strict: false }));

  app.get('/api/halsa', (_req, res) => {
    res.json({ status: 'ok' });
  });

  if (db) app.use('/api/fika', fikaRoutes(db));

  app.use('/api', (_req, res) => {
    res.status(404).json({ fel: 'Adressen finns inte.' });
  });

  montera?.(app);

  // Ogiltig JSON eller andra oväntade fel. JSON under /api, vanlig text för sidorna.
  app.use((err, req, res, _next) => {
    const iApi = req.path === '/api' || req.path.startsWith('/api/');
    let status = 500;
    let meddelande = 'Något gick fel på servern.';
    if (err.type === 'entity.parse.failed') {
      status = 400;
      meddelande = 'Ogiltig JSON i förfrågan.';
    } else if (err.type === 'entity.too.large') {
      status = 413;
      meddelande = 'Förfrågan är för stor.';
    } else {
      console.error(err);
    }
    if (res.headersSent) return res.end();
    if (iApi) return res.status(status).json({ fel: meddelande });
    res.status(status).type('text/plain; charset=utf-8').send(meddelande);
  });

  return app;
}
