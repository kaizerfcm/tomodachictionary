/** Living the Dream level-up gift catalogs (Switch) — not original Tomodachi Life. */

import type { LevelUpRewards } from '../types';

export type GiftFields = LevelUpRewards;
export type GiftFieldKey = keyof GiftFields;

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

export const LTD_POCKET_MONEY = [
  '$5',
  '$10',
  '$20',
  '$50',
  '$100',
] as const;

export const LTD_AGE_GADGETS = ['Kid-O-Matic', 'Age-O-Matic'] as const;

export const LTD_INTERIOR_SETS = [
  'Moving in Set',
  'Cuddly Kingdom Set',
  'Birthday Blowout Set',
  'Teahouse Set',
  'Humble Herder Set',
  'Eureka Set',
  'Flower Meadow Set',
  'In the Doghouse Set',
  'Minimalist Set',
  'Desert Oasis Set',
  'Playroom Set',
  'Ornate Set',
  'Feline Friend Set',
  'Sweet Treat Set',
  'Camo Campsite Set',
  'Bookworm Set',
  "Pots 'n' Pans Set",
  'Gym Rat Set',
  "Emperor's Chambers Set",
  'Outside the Lines Set',
  'Spooky Cemetery Set',
  'Shabby Set',
  'Aristocrat Set',
  'Haunted House Set',
  'Hospital Set',
  'Jailbird Set',
  'Top Floor Set',
  'Office Set',
  'Bathhouse Set',
  'Raining Buckets Set',
  'Urban Underground Set',
  'Sushi Set',
  'All Aboard Set',
  'Cherry Blossom Set',
] as const;

/** Generic clothing gift styles (Where & Wear level-up clothing gift). */
export const LTD_CLOTHING_GIFTS = [
  'Casual outfit',
  'Formal outfit',
  'Sporty outfit',
  'Cute outfit',
  'Gothic outfit',
  'Traditional outfit',
  'Costume outfit',
  'Seasonal outfit',
] as const;

/** Hat pieces available as part of clothing gifts. */
export const LTD_HAT_GIFTS = [
  'Crown',
  'Ribbon',
  'Baseball cap',
  'Witch hat',
  'Cowboy hat',
  'Beret',
  'Headband',
  'No hat',
] as const;

export const GIFT_FIELD_META: Record<
  GiftFieldKey,
  { label: string; options: readonly string[]; hint: string }
> = {
  goods: {
    label: 'Prezzie',
    options: LTD_PREZZIES,
    hint: 'Interactive good from the Living the Dream catalog',
  },
  quirks: {
    label: 'Little quirk',
    options: LTD_LITTLE_QUIRKS,
    hint: 'Personality animation quirk',
  },
  clothing: {
    label: 'Clothing gift',
    options: LTD_CLOTHING_GIFTS,
    hint: 'Outfit gift at level-up',
  },
  interior: {
    label: 'Interior set',
    options: LTD_INTERIOR_SETS,
    hint: 'Room theme from T&C Reno',
  },
  song: {
    label: 'Expression',
    options: LTD_EXPRESSIONS,
    hint: 'Expression gift (Living the Dream)',
  },
  hat: {
    label: 'Pocket money / gadget',
    options: [...LTD_POCKET_MONEY, ...LTD_AGE_GADGETS],
    hint: 'Pocket money amount or Kid-O-Matic / Age-O-Matic',
  },
};

export function formatGiftCatalogForPrompt(): string {
  return Object.entries(GIFT_FIELD_META)
    .map(
      ([key, meta]) =>
        `- ${key} (${meta.label}): pick EXACTLY one from — ${meta.options.join('; ')}`,
    )
    .join('\n');
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

export function normalizeGifts(raw: Partial<GiftFields>): GiftFields {
  const base = emptyGifts();
  for (const key of Object.keys(base) as GiftFieldKey[]) {
    base[key] = normalizeGiftValue(key, raw[key] ?? '');
  }
  return base;
}

export function formatGiftsPreview(gifts: GiftFields): string {
  return (Object.keys(GIFT_FIELD_META) as GiftFieldKey[])
    .map((key) => {
      const val = gifts[key]?.trim();
      return `${GIFT_FIELD_META[key].label}: ${val || '(empty)'}`;
    })
    .join(' · ');
}
