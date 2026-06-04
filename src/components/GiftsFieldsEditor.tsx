import {
  GIFT_FIELD_META,
  type GiftFieldKey,
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
  const handleChange = (key: GiftFieldKey, val: string) => {
    onChange({ ...gifts, [key]: val });
  };

  return (
    <div className={className}>
      {(Object.keys(GIFT_FIELD_META) as GiftFieldKey[]).map((key) => {
        const meta = GIFT_FIELD_META[key];
        const listId = `${idPrefix}-${key}-options`;
        return (
          <div key={key} className="reward-field">
            <label htmlFor={`${idPrefix}-${key}`}>{meta.label}</label>
            <input
              id={`${idPrefix}-${key}`}
              type="text"
              list={listId}
              value={gifts[key]}
              onChange={(e) => handleChange(key, e.target.value)}
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
