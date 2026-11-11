import { Router } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { valideraInlagg } from '../validering.js';

export const hashaNyckel = (nyckel) => createHash('sha256').update(nyckel).digest('hex');

// Listan visar de nyaste inläggen; äldre döljs så svaret inte växer obegränsat.
export const MAX_LISTA = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function fikaRoutes(db) {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      res.json(await db.lista(MAX_LISTA));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      if (req.body === undefined) {
        return res.status(400).json({ fel: 'Förfrågan måste skickas som JSON (Content-Type: application/json).' });
      }
      if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ fel: 'Förfrågan måste vara ett JSON-objekt.' });
      }
      const { fel, varden } = valideraInlagg(req.body);
      if (fel) {
        return res
          .status(400)
          .json(fel.length === 1 ? { fel: fel[0] } : { fel: 'Inlägget är inte giltigt.', detaljer: fel });
      }
      const agarNyckel = randomBytes(24).toString('hex');
      const inlagg = await db.skapa({ ...varden, agarHash: hashaNyckel(agarNyckel) });
      res.status(201).json({ ...inlagg, agarNyckel });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      if (!UUID.test(req.params.id)) return res.status(400).json({ fel: 'Ogiltigt id.' });
      const id = req.params.id.toLowerCase(); // Postgres ger uuid i gemener
      const nyckel = req.get('X-Agar-Token');
      if (!nyckel) return res.status(400).json({ fel: 'Ägarnyckeln saknas.' });

      const inlagg = await db.hamta(id);
      if (!inlagg) return res.status(404).json({ fel: 'Inlägget finns inte.' });

      const given = Buffer.from(hashaNyckel(nyckel), 'hex');
      const riktig = Buffer.from(inlagg.agar_hash, 'hex');
      if (given.length !== riktig.length || !timingSafeEqual(given, riktig)) {
        return res.status(403).json({ fel: 'Fel ägarnyckel – du kan bara ta bort dina egna inlägg.' });
      }

      await db.taBort(id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
