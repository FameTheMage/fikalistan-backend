# AGENTS.md

Gemensam fikalista för jobbet. Se `PLAN.md` för mål, API, databas och steg.

## Alltid

- **Språk:** allt användarvänt (gränssnitt, felmeddelanden från API:et) är på svenska. Kod och identifierare får följa projektets befintliga namn.
- **Ett steg i taget:** jobba bara på steget du fått från `PLAN.md`. Varje steg görs på en egen branch (t.ex. `steg-3-databas`) och avslutas med en pull request som öppnas med `gh pr create`. Aldrig direkt på `main`.
- **Tester först:** kör `npm test` och se till att allt går igenom *innan* pull requesten öppnas.
- **Bocka av steget** i `PLAN.md` (`- [x]`) i samma pull request, när steget är klart enligt dess "Klart när"-rad.
- **Håll dig till planen.** Behöver något ändras i planen: ändra `PLAN.md` i samma pull request och säg det i beskrivningen.

## Arkitektur

- En enda Express-server på http://localhost:3001 skickar både sidorna och API:et (`/api`). `npm run dev` startar allt. Under utveckling körs Vite i middleware-läge, vid bygge skickar Express ut `dist/`.
- Frontend (React, JavaScript) pratar bara med vårt eget `/api`, aldrig med Supabase.
- Backend använder `@supabase/supabase-js` med den hemliga nyckeln. `createApp({ db })` tar emot databaslagret så att tester kan använda minnesversionen.
- Backenden validerar all indata och svarar `400` med ett tydligt svenskt felmeddelande.
- Alla tabeller har Row Level Security påslaget. Tabeller skapas som migrationer i `supabase/migrations` och skickas med `supabase db push`. Ändra aldrig databasen på annat sätt.

## Tester

- `node --test`, inga extra testbibliotek.
- Testerna använder låtsasdatabasen och får aldrig röra Supabase eller kräva `.env`.

## Hemligheter

- Nyckel och projektadress ligger i `.env` (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`), som aldrig får checkas in. Håll `.env.example` uppdaterad, utan värden.
- Be aldrig användaren klistra in nyckeln i chatten, den lägger in den själv. Läs, skriv ut eller committa aldrig `.env` eller `SECRETS.secret`.
- Ägarnyckeln för inlägg sparas bara som hash i databasen och skickas aldrig ut av `GET`.

## Git

- Små, tydliga commits. Committa inte `node_modules`, `dist`, `.env` eller andra hemliga filer.
- Pull requesten ska beskriva vad som gjorts och hur det kontrollerats.
