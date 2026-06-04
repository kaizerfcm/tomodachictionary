import {
  GIFT_FIELD_META,
  QUIRK_SUBTYPE_KEYS,
  QUIRK_SUBTYPE_META,
  quirksBySubtypeToString,
  quirksStringToBySubtype,
  type QuirkSubtypeKey,
} from '../lib/livingTheDreamGifts';
import type { LevelUpRewards } from '../types';

interface GiftsFieldsEditorProps {
  gifts: LevelUpRewards;
  onChange: (gifts: LevelUpRewards) => void;
  idPrefix?: string;
  className?: string;
}

export function GiftsFieldsEditor({
  gifts,
  onChange,
  idPrefix = 'gift',
  className = 'rewards-grid',
}: GiftsFieldsEditorProps) {
  const quirksBySubtype = quirksStringToBySubtype(gifts.quirks ?? '');

  const handleGoodsChange = (val: string) => {
    onChange({ ...gifts, goods: val });
  };

  const handleQuirkChange = (subtype: QuirkSubtypeKey, val: string) => {
    onChange({
      ...gifts,
      quirks: quirksBySubtypeToString({ ...quirksBySubtype, [subtype]: val }),
    });
  };

  const goodsMeta = GIFT_FIELD_META.goods;
  const goodsListId = `${idPrefix}-goods-options`;

  return (
    <div className={className}>
      <div className="reward-field">
        <label htmlFor={`${idPrefix}-goods`}>{goodsMeta.label}</label>
        <input
          id={`${idPrefix}-goods`}
          type="text"
          list={goodsListId}
          value={gifts.goods ?? ''}
          onChange={(e) => handleGoodsChange(e.target.value)}
        />
        <datalist id={goodsListId}>
          {goodsMeta.options.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      </div>
      {QUIRK_SUBTYPE_KEYS.map((subtype) => {
        const meta = QUIRK_SUBTYPE_META[subtype];
        const listId = `${idPrefix}-quirk-${subtype}-options`;
        return (
          <div key={subtype} className="reward-field">
            <label htmlFor={`${idPrefix}-quirk-${subtype}`}>
              Little quirk — {meta.label}
            </label>
            <input
              id={`${idPrefix}-quirk-${subtype}`}
              type="text"
              list={listId}
              value={quirksBySubtype[subtype] ?? ''}
              onChange={(e) => handleQuirkChange(subtype, e.target.value)}
            />
            <datalist id={listId}>
              {meta.options.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </div>
        );
      })}
    </div>
  );
}
