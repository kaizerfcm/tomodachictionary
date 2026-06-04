/** Living the Dream level-up gift catalogs (Switch) — not original Tomodachi Life. */

import type { LevelUpRewards } from '../types';

export type GiftFields = LevelUpRewards;
export type GiftFieldKey = 'goods' | 'quirks';

export const GIFT_LIST_SEPARATOR = ' | ';

export const LTD_PREZZIES = [
  'Football',
  'Baseball',
  'Breaking into Breaking DVD',
  'Guitar',
  'Camera',
  'Yoga: A Balanced View DVD',
  'Bulk Your Bod DVD',
  'Ballet for the Bumbling DVD',
  'Sensei-Tional Karate DVD',
  'Toy Sword',
  'Set of Paints',
  'Sewing Machine',
  'Smartphone',
  'Kaleidoscope',
  'Swing Set',
  'Switch Console',
] as const;

/** Individual Little Quirks assignable at level-up (Living the Dream). */
export const LTD_LITTLE_QUIRKS = [
  'Floats Instead of Walking',
  'Walks by Bounding',
  'Walks Leaning Forward',
  'Walks Cutely',
  'Walks like a Model',
  'Walks like a Robot',
  'Walks like a Rodeo Rider',
  'Walks Nervously',
  'Walks with a Rhythm',
  'Walks with a Swagger',
  'Walks with Tiny Steps',
  'Walks without Swinging Arms',
  'Stands at Attention',
  'Stands Cutely',
  'Stands Leading Forward',
  'Stands Like a Rodeo Rider',
  'Stands Moving to the Rhythm',
  'Stands Proudly',
  'Stands Restlessly',
  'Stands Shyly',
  'Stands Smugly',
  'Stands While Shaking Hips',
  'Stands While Adjusting Glasses',
  'Stands While Arms Crossed',
  'Stands With Hands Folded',
  'Stands While Wiping Sweat',
  'Greets Eagerly',
  'Greets Energetically',
  'Greets Flirtatiously',
  'Greets in a Hyped-Up Style',
  'Greets Karate-Style',
  'Greets Listlessly',
  'Greets Proudly',
  'Greets Shyly',
  'Greets with a Curtsy',
  'Greets with a Forward Bow',
  'Greets with a Nod',
  'Greets with a Sweeping Bow',
  "Won't Greet Others",
  'Blissful',
  'Closed Eyes',
  'Nonchalant',
  'Raised Eyebrows',
  'Smiley',
  'Smug',
  'Unimpressed',
  'Wide-Eyed',
  'Winking',
  'Eats Cautiously',
  'Eats Cutely',
  'Eats Gracefully',
  'Eats Quickly',
  'Eats Shyly',
  'Eats Voraciously',
  'Eats while Savoring',
  'Eats with Gusto',
  'Big Eater',
  'Light Eater',
  'Cries when Angry',
  'Flips out when Angry',
  'Smiles when Angry',
  'Creepy Voice',
  'Loud Voice',
  'Quiet Voice',
  'Radiant Voice',
  'Fashionista',
  'Night Owl',
  'Public Farter',
  'Scaredy-Cat',
  'Sleeps Restlessly',
  'Snores Loudly',
  'Throws Tantrums',
] as const;

export type QuirkSubtypeKey =
  | 'walking'
  | 'standing'
  | 'greeting'
  | 'face'
  | 'eating'
  | 'anger'
  | 'voice'
  | 'lifestyle';

export const QUIRK_SUBTYPE_META: Record<
  QuirkSubtypeKey,
  { label: string; options: readonly string[] }
> = {
  walking: {
    label: 'Walking',
    options: [
      'Floats Instead of Walking',
      'Walks by Bounding',
      'Walks Leaning Forward',
      'Walks Cutely',
      'Walks like a Model',
      'Walks like a Robot',
      'Walks like a Rodeo Rider',
      'Walks Nervously',
      'Walks with a Rhythm',
      'Walks with a Swagger',
      'Walks with Tiny Steps',
      'Walks without Swinging Arms',
    ],
  },
  standing: {
    label: 'Standing',
    options: [
      'Stands at Attention',
      'Stands Cutely',
      'Stands Leading Forward',
      'Stands Like a Rodeo Rider',
      'Stands Moving to the Rhythm',
      'Stands Proudly',
      'Stands Restlessly',
      'Stands Shyly',
      'Stands Smugly',
      'Stands While Shaking Hips',
      'Stands While Adjusting Glasses',
      'Stands While Arms Crossed',
      'Stands With Hands Folded',
      'Stands While Wiping Sweat',
    ],
  },
  greeting: {
    label: 'Greeting',
    options: [
      'Greets Eagerly',
      'Greets Energetically',
      'Greets Flirtatiously',
      'Greets in a Hyped-Up Style',
      'Greets Karate-Style',
      'Greets Listlessly',
      'Greets Proudly',
      'Greets Shyly',
      'Greets with a Curtsy',
      'Greets with a Forward Bow',
      'Greets with a Nod',
      'Greets with a Sweeping Bow',
      "Won't Greet Others",
    ],
  },
  face: {
    label: 'Face',
    options: [
      'Blissful',
      'Closed Eyes',
      'Nonchalant',
      'Raised Eyebrows',
      'Smiley',
      'Smug',
      'Unimpressed',
      'Wide-Eyed',
      'Winking',
    ],
  },
  eating: {
    label: 'Eating',
    options: [
      'Eats Cautiously',
      'Eats Cutely',
      'Eats Gracefully',
      'Eats Quickly',
      'Eats Shyly',
      'Eats Voraciously',
      'Eats while Savoring',
      'Eats with Gusto',
      'Big Eater',
      'Light Eater',
    ],
  },
  anger: {
    label: 'Anger',
    options: ['Cries when Angry', 'Flips out when Angry', 'Smiles when Angry'],
  },
  voice: {
    label: 'Voice',
    options: ['Creepy Voice', 'Loud Voice', 'Quiet Voice', 'Radiant Voice'],
  },
  lifestyle: {
    label: 'Lifestyle',
    options: [
      'Fashionista',
      'Night Owl',
      'Public Farter',
      'Scaredy-Cat',
      'Sleeps Restlessly',
      'Snores Loudly',
      'Throws Tantrums',
    ],
  },
};

export const QUIRK_SUBTYPE_KEYS = Object.keys(
  QUIRK_SUBTYPE_META,
) as QuirkSubtypeKey[];

/** Legacy catalogs kept for import/export compatibility — not AI-suggested. */
export const LTD_EXPRESSIONS = [
  'Happy',
  'Cool',
  'Angry',
  'Sad',
  'Surprised',
  'Sleepy',
  'Lovestruck',
  'Confused',
] as const;

export const GIFT_FIELD_META: Record<
  GiftFieldKey,
  { label: string; options: readonly string[]; hint: string }
> = {
  goods: {
    label: 'Prezzies',
    options: LTD_PREZZIES,
    hint: 'Multiple prezzies — separate with |',
  },
  quirks: {
    label: 'Little quirks',
    options: LTD_LITTLE_QUIRKS,
    hint: 'One quirk per subtype below',
  },
};

function formatQuirkSubtypesForPrompt(): string {
  return QUIRK_SUBTYPE_KEYS.map((key) => {
    const meta = QUIRK_SUBTYPE_META[key];
    return `- ${key} (${meta.label}): ${meta.options.join('; ')}`;
  }).join('\n');
}

export function formatAiGiftsRulesForPrompt(): string {
  return `LEVEL-UP GIFTS (Tomodachi Life: Living the Dream):
- Suggest ONLY Prezzies and Little Quirks. Do NOT suggest Expression, Interior, Clothing, or Pocket money/gadget.
- goods: suggest 2–4 Prezzies that fit the character. Return a JSON array of EXACT catalog names.
- quirks: suggest EXACTLY ONE Little Quirk per subtype key below. Return a JSON object with every subtype key filled.
- Each name MUST match the catalog exactly (spelling and punctuation).

Prezzie catalog:
${LTD_PREZZIES.join('; ')}

Little quirk subtypes (one EXACT pick per key):
${formatQuirkSubtypesForPrompt()}`;
}

export function parseGiftList(value: string): string[] {
  return value
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function joinGiftList(items: string[]): string {
  return items.filter(Boolean).join(GIFT_LIST_SEPARATOR);
}

export function emptyGifts(): GiftFields {
  return {
    song: '',
    interior: '',
    clothing: '',
    hat: '',
    goods: '',
    quirks: '',
  };
}

export function normalizeGiftValue(
  field: GiftFieldKey,
  value: string,
): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const options = GIFT_FIELD_META[field].options;
  const exact = options.find((o) => o.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;
  const partial = options.find((o) =>
    o.toLowerCase().includes(trimmed.toLowerCase()),
  );
  return partial ?? trimmed;
}

export function normalizeQuirkValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const exact = LTD_LITTLE_QUIRKS.find(
    (o) => o.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exact) return exact;
  const partial = LTD_LITTLE_QUIRKS.find((o) =>
    o.toLowerCase().includes(trimmed.toLowerCase()),
  );
  return partial ?? trimmed;
}

export function normalizeGoodsList(raw: unknown): string {
  if (Array.isArray(raw)) {
    return joinGiftList(
      raw
        .map(String)
        .map((item) => normalizeGiftValue('goods', item))
        .filter(Boolean),
    );
  }
  const str = String(raw ?? '').trim();
  if (!str) return '';
  return joinGiftList(
    parseGiftList(str).map((item) => normalizeGiftValue('goods', item)),
  );
}

export function normalizeQuirksFromAi(raw: unknown): string {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const items: string[] = [];
    for (const key of QUIRK_SUBTYPE_KEYS) {
      const val = (raw as Record<string, unknown>)[key];
      if (val != null && String(val).trim()) {
        items.push(normalizeQuirkValue(String(val)));
      }
    }
    return joinGiftList(items);
  }
  if (Array.isArray(raw)) {
    return joinGiftList(raw.map(String).map(normalizeQuirkValue).filter(Boolean));
  }
  const str = String(raw ?? '').trim();
  if (!str) return '';
  return joinGiftList(parseGiftList(str).map(normalizeQuirkValue));
}

export function parseGeneratedLevelUpRewards(
  raw: Record<string, unknown> | undefined,
): LevelUpRewards {
  return {
    song: '',
    interior: '',
    clothing: '',
    hat: '',
    goods: normalizeGoodsList(raw?.goods ?? raw?.prezzie ?? raw?.prezzies),
    quirks: normalizeQuirksFromAi(raw?.quirks ?? raw?.quirk),
  };
}

export function quirksStringToBySubtype(
  value: string,
): Partial<Record<QuirkSubtypeKey, string>> {
  const out: Partial<Record<QuirkSubtypeKey, string>> = {};
  for (const item of parseGiftList(value)) {
    const normalized = normalizeQuirkValue(item);
    for (const key of QUIRK_SUBTYPE_KEYS) {
      if (QUIRK_SUBTYPE_META[key].options.includes(normalized)) {
        out[key] = normalized;
        break;
      }
    }
  }
  return out;
}

export function quirksBySubtypeToString(
  bySubtype: Partial<Record<QuirkSubtypeKey, string>>,
): string {
  return joinGiftList(
    QUIRK_SUBTYPE_KEYS.map((key) => bySubtype[key]?.trim() ?? '').filter(
      Boolean,
    ),
  );
}

export function normalizeGifts(raw: Partial<GiftFields>): GiftFields {
  const base = emptyGifts();
  base.goods = normalizeGoodsList(raw.goods);
  base.quirks = normalizeQuirksFromAi(raw.quirks);
  return base;
}

export function formatGiftsPreview(gifts: GiftFields): string {
  const parts: string[] = [];
  const goods = parseGiftList(gifts.goods ?? '');
  parts.push(
    `${GIFT_FIELD_META.goods.label}: ${goods.length ? goods.join(', ') : '(empty)'}`,
  );
  const quirks = parseGiftList(gifts.quirks ?? '');
  parts.push(
    `${GIFT_FIELD_META.quirks.label}: ${quirks.length ? quirks.join(', ') : '(empty)'}`,
  );
  return parts.join(' · ');
}
