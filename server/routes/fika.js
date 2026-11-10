import { Router } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { valideraInlagg } from '../validering.js';

export const hashaNyckel = (nyckel) => createHash('sha256').update(nyckel).digest('hex');

export function fikaRoutes(db) {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      res.json(await db.lista());
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
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

  return router;
}
