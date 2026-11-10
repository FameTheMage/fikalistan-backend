import { createClient } from '@supabase/supabase-js';

const TABELL = 'fikainlagg';
const FALT_UTAN_HASH = 'id, namn, vad, kommentar, skapad';

function kasta(fel) {
  if (fel) throw new Error(`Databasfel: ${fel.message}`);
}

// Riktig databas hos Supabase. Samma gränssnitt som db/minne.js.
export function skapaSupabaseDb({ url, hemligNyckel }) {
  if (!url || !hemligNyckel) {
    throw new Error('SUPABASE_URL och SUPABASE_SECRET_KEY måste finnas i .env.');
  }
  const supabase = createClient(url, hemligNyckel, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async lista() {
      const { data, error } = await supabase
        .from(TABELL)
        .select(FALT_UTAN_HASH)
        .order('skapad', { ascending: false });
      kasta(error);
      return data;
    },

    async skapa({ namn, vad, kommentar = null, agarHash }) {
      const { data, error } = await supabase
        .from(TABELL)
        .insert({ namn, vad, kommentar, agar_hash: agarHash })
        .select(FALT_UTAN_HASH)
        .single();
      kasta(error);
      return data;
    },

    async hamta(id) {
      const { data, error } = await supabase
        .from(TABELL)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      kasta(error);
      return data;
    },

    async taBort(id) {
      const { data, error } = await supabase.from(TABELL).delete().eq('id', id).select('id');
      kasta(error);
      return data.length > 0;
    },
  };
}
