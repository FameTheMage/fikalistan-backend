-- Skyddsnät i databasen som speglar backendens kontroll (server/validering.js).
-- "not valid": nya och ändrade rader kontrolleras, befintliga rader rörs inte.

-- Inga styrtecken, radavskiljare, bidi-tecken, privat användning, icke-tecken eller taggtecken.
alter table public.fikainlagg
  add constraint fikainlagg_namn_tecken check (namn !~ '[\u0001-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069\ue000-\uf8ff\ufdd0-\ufdef\ufffe\uffff\U000e0000-\U000e007f]') not valid,
  add constraint fikainlagg_vad_tecken check (vad !~ '[\u0001-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069\ue000-\uf8ff\ufdd0-\ufdef\ufffe\uffff\U000e0000-\U000e007f]') not valid,
  add constraint fikainlagg_kommentar_tecken check (kommentar is null or kommentar !~ '[\u0001-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069\ue000-\uf8ff\ufdd0-\ufdef\ufffe\uffff\U000e0000-\U000e007f]') not valid;

-- Ägarhashen är alltid en SHA-256 i hex (64 tecken).
alter table public.fikainlagg
  add constraint fikainlagg_agar_hash_format check (agar_hash ~ '^[0-9a-f]{64}$') not valid;
