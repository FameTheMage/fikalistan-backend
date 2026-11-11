# Fikalistan

Gemensam fikalista för jobbet: alla ser samma lista över vad som tas med till fikat. Man skriver sitt namn och vad man tar med, och kan ta bort sina egna inlägg. Listan sparas i Supabase (Postgres). Se `PLAN.md` för mål, API och databas.

## Kom igång

Kräver Node.js 22.9 eller senare.

```bash
npm install
```

Kopiera `.env.example` till `.env` och fyll i värdena:

| Variabel | Betydelse |
|---|---|
| `SUPABASE_URL` | Adressen till ditt Supabase-projekt |
| `SUPABASE_SECRET_KEY` | Projektets hemliga nyckel. Checka aldrig in `.env` |
| `PORT` | Valfritt, standard 3001 |
| `HOST` | Valfritt. Standard `127.0.0.1` i utveckling, alla nätverkskort i produktion |
| `TRUST_PROXY` | Valfritt. Heltal, antalet proxyer framför servern. Sätt till `1` bakom en proxy så att rätt IP-adress används. Andra värden (t.ex. `true`) ger fel vid start |
| `MAX_SKRIV_PER_MINUT` | Valfritt. Max skrivande anrop per minut och IP-adress (standard 20) |
| `MAX_SKRIV_PER_TIMME` | Valfritt. Max skrivande anrop per timme och IP-adress (standard 300) |

## Utveckling

```bash
npm run dev
```

Sidan och API:et körs från samma server på http://localhost:3001 (Vite körs inuti Express).

## Produktion

```bash
npm run build
npm start
```

`npm run build` bygger frontenden till `dist/`. `npm start` skickar sedan ut de färdiga filerna och API:et från samma Express-server på http://localhost:3001, utan Vite.

## Databas

Tabellen skapas av migrationerna i `supabase/migrations`. Länka projektet och skicka dem med:

```bash
supabase link
supabase db push
```

Ändra aldrig databasen på annat sätt. Alla tabeller har Row Level Security påslaget.

## Tester

```bash
npm test
```

Testerna använder en minnesbaserad låtsasdatabas, så varken `.env` eller nätverk behövs.
