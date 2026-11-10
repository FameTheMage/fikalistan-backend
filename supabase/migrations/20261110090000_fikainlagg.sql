-- Gemensam fikalista: ett inlägg per rad.
create table public.fikainlagg (
  id uuid primary key default gen_random_uuid(),
  namn text not null check (char_length(btrim(namn)) between 1 and 50),
  vad text not null check (char_length(btrim(vad)) between 1 and 100),
  kommentar text check (kommentar is null or char_length(kommentar) <= 200),
  agar_hash text not null,
  skapad timestamptz not null default now()
);

create index fikainlagg_skapad_idx on public.fikainlagg (skapad desc);

-- RLS utan policies: anon/authenticated nekas allt.
-- Backenden använder den hemliga nyckeln och går förbi RLS.
alter table public.fikainlagg enable row level security;
