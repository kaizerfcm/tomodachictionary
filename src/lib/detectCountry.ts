/** ISO-style code stored on the account (analytics / profile metadata). */
export type AccountCountry = 'BR' | 'INTL';

const BR_TIMEZONES = new Set([
  'America/Sao_Paulo',
  'America/Fortaleza',
  'America/Recife',
  'America/Bahia',
  'America/Belem',
  'America/Manaus',
  'America/Cuiaba',
  'America/Campo_Grande',
  'America/Porto_Velho',
  'America/Boa_Vista',
  'America/Rio_Branco',
  'America/Maceio',
  'America/Araguaina',
  'America/Santarem',
  'America/Noronha',
]);

export function detectAccountCountry(): AccountCountry {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (BR_TIMEZONES.has(tz)) return 'BR';
  } catch {
    /* ignore */
  }
  const lang = navigator.language?.toLowerCase() ?? '';
  if (lang === 'pt-br' || lang.startsWith('pt-br')) return 'BR';
  return 'INTL';
}
