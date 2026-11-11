# PLAN – Gemensam fikalista

En webbapp där alla på jobbet ser samma lista över vad som tas med till fikat. Man skriver sitt namn och vad man tar med, och kan ta bort sina egna inlägg. Listan sparas i en databas och finns kvar när servern startas om.

## Beslut från förarbetet

- **En enda löpande lista**, nyaste inlägget först (ingen indelning per datum).
- **Inlägg har:** namn, vad man tar med, en valfri kommentar (t.ex. "räcker till 6 personer") och en tidsstämpel som sätts automatiskt.
- **Borttagning bara av egna inlägg**, utan inloggning:
  - När ett inlägg skapas skapar servern en slumpad *ägarnyckel* och skickar tillbaka den **en enda gång** i svaret.
  - Webbläsaren sparar nyckeln i `localStorage`, och visar bara "Ta bort" på inlägg den har nyckeln till.
  - Databasen sparar bara en **hash** (SHA-256) av nyckeln. `GET` returnerar aldrig nyckeln eller hashen.
  - `DELETE` kräver rätt nyckel i headern `X-Agar-Token`. Skyddet gäller alltså på servern, inte bara i gränssnittet. Nyckeln går förlorad om man rensar webbläsarens data, och det är okej för den här appen.
- Ingen inloggning och inga användarkonton.

## Teknik i korthet

| Del | Val |
|---|---|
| Server | En enda Node.js-server (Express) på `http://localhost:3001` som skickar både sidorna och API:et under `/api` |
| Frontend | React med JavaScript, byggd med Vite. Under utveckling körs Vite i middleware-läge inuti Express. Vid bygge skickar Express ut `dist/` |
| Databas | Postgres hos Supabase, tabeller som migrationer i `supabase/migrations`, skickas med `supabase db push`. RLS på alla tabeller |
| Databasåtkomst | Bara backenden, med `@supabase/supabase-js` och den hemliga nyckeln. Frontenden pratar bara med vårt eget `/api` |
| Miljövariabler | `.env` (aldrig i Git): `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, valfritt `PORT` (standard 3001). `.env.example` checkas in utan värden |
| Tester | `node --test`, databasen ersätts av en minnesbaserad låtsasversion. Inga nycklar och inget nätverk behövs |
| CI | GitHub Actions kör testerna på varje pull request |
| Språk och design | Svenska i hela gränssnittet och i alla felmeddelanden. Mobilanpassat, **modern och futuristisk mörk design** (rymdnavy, cyan och bärnstensfärgade accenter, glöd, glaspaneler, Space Grotesk). Tas fram med skillsen Frontend Design och UI/UX Pro Max |

### Mappstruktur (mål)

```
server/
  index.js          # startar servern (Vite-middleware i dev, statiska filer i prod)
  app.js            # createApp({ db }) – Express-appen, utan att starta något
  routes/fika.js    # API-rutter
  validering.js     # kontroll av indata
  db/supabase.js    # riktig databas (supabase-js)
  db/minne.js       # låtsasdatabas för tester
  test/             # *.test.js
src/                # React-frontend
supabase/migrations/
.github/workflows/test.yml
```

`createApp({ db })` tar emot databaslagret som argument. Det är det som gör att testerna kan byta ut Supabase mot `db/minne.js`.

## Databas

### Tabell `public.fikainlagg`

| Kolumn | Typ | Regler |
|---|---|---|
| `id` | `uuid` | Primärnyckel, `default gen_random_uuid()` |
| `namn` | `text` | `not null`, 1–50 tecken (efter trim) |
| `vad` | `text` | `not null`, 1–100 tecken |
| `kommentar` | `text` | Kan vara `null`, högst 200 tecken |
| `agar_hash` | `text` | `not null`, SHA-256 av ägarnyckeln (hex). Skickas aldrig ut |
| `skapad` | `timestamptz` | `not null default now()` |

- Index på `skapad desc` för sorteringen.
- `check`-villkor i databasen speglar valideringen i backenden (extra skyddsnät), bland annat tillåtna tecken och format på `agar_hash` (migrationen `strangare_kontroller`).
- `alter table ... enable row level security;` och **inga policies**. Då nekas `anon`/`authenticated` allt, medan backenden med den hemliga nyckeln går förbi RLS.

## API

Alla svar är JSON (utom `204`). Fel ser ut så här: `{ "fel": "Namnet får inte vara tomt." }` (och för flera fel samtidigt `{ "fel": "…", "detaljer": ["…"] }`). Felmeddelanden är alltid på svenska.

| Metod | Adress | Vad den gör | Statuskoder |
|---|---|---|---|
| GET | `/api/halsa` | Visar att servern lever | 200 |
| GET | `/api/fika` | Hämtar hela listan, nyaste först. Utan `agar_hash` | 200, 500 |
| POST | `/api/fika` | Skapar ett inlägg från `{ namn, vad, kommentar? }`. Svarar med inlägget plus `agarNyckel` (visas bara denna gång) | 201, 400, 500 |
| DELETE | `/api/fika/:id` | Tar bort ett inlägg. Kräver headern `X-Agar-Token` | 204, 400 (id är inget giltigt uuid, eller headern saknas), 403 (fel nyckel), 404 (finns inte), 500 |
| * | `/api/*` (övrigt) | Okänd adress under `/api` | 404 |

Skydd: `GET /api/fika` returnerar högst de 200 nyaste inläggen. Skrivande anrop (`POST`/`DELETE`) begränsas till 20 per minut (`MAX_SKRIV_PER_MINUT`) och 100 per timme per IP-adress, därefter `429` med svenskt fel och `Retry-After`. Alla `/api`-svar har `Cache-Control: no-store`, och trasig %-kodning i adressen ger 400. Id i versaler godtas. Alla svar har säkerhetshuvuden (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, och `Content-Security-Policy` i produktion) och avslöjar inte Express. I utveckling lyssnar servern bara på `127.0.0.1` (styrs av `HOST`).

Regler för `400` på `POST`: `namn` och `vad` måste vara text, får inte vara tomma eller bara blanksteg, och får inte överstiga maxlängden. `kommentar` är valfri men måste vara text och högst 200 tecken. Text får inte innehålla styrtecken (nolltecken, radbrytning, tabb), bidi-override, osynliga taggtecken, privat användning, icke-tecken, mer än 3 kombinationstecken i rad eller ogiltiga Unicode-tecken, och osynliga tecken (t.ex. zero-width space) räknas som tomt. Längden räknas i tecken, så en emoji är 1. Kroppen måste vara ett JSON-objekt skickat som `application/json`. Okända fält ignoreras. Ogiltig JSON ger också 400 med svenskt meddelande. Förfrågningskroppen begränsas i storlek.

## Steg

Varje steg görs i en egen session på en egen branch och blir en egen pull request. Stegen görs i ordning. Bocka av steget här i `PLAN.md` i samma pull request.

- [x] **Steg 0 – Planering och repo.** `PLAN.md`, `AGENTS.md`, `.gitignore`, Git-repo och publikt GitHub-repo `fikalistan-backend`.
  *Klart när:* repot finns på GitHub och innehåller planen.

- [x] **Steg 1 – Projektgrund och en server.** `package.json` (ESM, skript `dev`, `build`, `start`, `test`), Express som serverar ett minimalt React-gränssnitt via Vite i middleware-läge, `/api/halsa`, `.env.example`, `createApp({ db })`.
  *Klart när:* `npm run dev` visar en sida på http://localhost:3001 och `GET /api/halsa` svarar 200 från samma server.

- [x] **Steg 2 – Tester och CI.** `node --test` med första testet (`/api/halsa` och okänd `/api`-adress → 404 med svenskt fel), samt `.github/workflows/test.yml` som kör `npm ci` och `npm test` på varje pull request.
  *Klart när:* `npm test` är grönt lokalt utan `.env`, och workflow-körningen är grön på pull requesten.

- [x] **Steg 3 – Databas.** Migration för `fikainlagg` med RLS i `supabase/migrations`, `supabase link` och `supabase db push`, samt `db/supabase.js` och `db/minne.js` med samma gränssnitt (`lista`, `skapa`, `hamta`, `ta bort`). Användaren klistrar själv in nyckeln i `.env`.
  *Klart när:* tabellen syns i Supabase med RLS påslaget, och ett test mot `db/minne.js` visar att lagret fungerar. Ett manuellt röktest mot Supabase går bra.

- [x] **Steg 4 – API: lista och skapa.** `GET /api/fika` och `POST /api/fika` med validering och svenska 400-fel, `server/index.js` kopplar in riktiga databasen.
  *Klart när:* tester täcker lyckat flöde, sortering (nyast först), alla valideringsfel (400) och att `agar_hash` aldrig syns i svar. Allt är grönt.

- [x] **Steg 5 – API: ta bort.** `DELETE /api/fika/:id` med kontroll av ägarnyckel.
  *Klart när:* tester visar 204 med rätt nyckel, 403 med fel nyckel, 400 utan nyckel eller med ogiltigt id, 404 för okänt id, och att inlägget finns kvar efter ett nekat försök.

- [x] **Steg 6 – Frontend: lista och formulär.** React-sidor som hämtar listan, formulär för namn, vad och kommentar, felmeddelanden från API:et visas, nyckeln sparas i `localStorage`, "Ta bort" visas bara på egna inlägg. Namnet kommer ihåg i webbläsaren.
  *Klart när:* man kan lägga till och ta bort ett eget inlägg i webbläsaren mot den riktiga backenden, ett inlägg från en annan webbläsare syns men saknar "Ta bort", och listan finns kvar efter omstart av servern.

- [x] **Steg 7 – Design och mobil.** Modern och futuristisk mörk design (ändrad från "glad design med varma färger"; gjord med skillsen Frontend Design och UI/UX Pro Max), tydlig typografi, fungerande vid ca 375 px bredd, tomt läge ("Ingen har anmält något än – bli först!"), laddnings- och felstatus, tillgängliga etiketter och fokus.
  *Klart när:* sidan är genomgången i mobilbredd och datorbredd utan sidled-scroll, och all text i gränssnittet är på svenska.

- [ ] **Steg 8 – Produktionsbygge och avslut.** `npm run build` + `npm start` skickar ut färdiga filer från samma Express-server, kort `README.md` (hur man startar, `.env`, `supabase db push`, tester).
  *Klart när:* `npm run build && npm start` visar hela appen på http://localhost:3001 utan Vite-servern, och testerna är gröna.
