import type { Character, LevelUpRewards } from '../types';
import { AiSparkButton } from './AiSparkButton';
import { EditorSectionHeader } from './EditorSectionHeader';
import { GiftsFieldsEditor } from './GiftsFieldsEditor';

interface GiftsPanelProps {
  subject: Character;
  onUpdateLevelUpRewards: (rewards: LevelUpRewards) => void;
  onRegenerateAll: () => Promise<void>;
  generatingKey: string | null;
  hasLlmHost: boolean;
}

export function GiftsPanel({
  subject,
  onUpdateLevelUpRewards,
  onRegenerateAll,
  generatingKey,
  hasLlmHost,
}: GiftsPanelProps) {
  const rewards = subject.levelUpRewards || {
    song: '',
    interior: '',
    clothing: '',
    hat: '',
    goods: '',
    quirks: '',
  };

  return (
    <section className="gifts-panel editor-section">
      <EditorSectionHeader title="Gifts">
        {hasLlmHost && (
          <AiSparkButton
            onClick={onRegenerateAll}
            disabled={generatingKey === 'gifts:all' || !hasLlmHost}
            busy={generatingKey === 'gifts:all'}
            title="Suggest all gifts from canon"
          />
        )}
      </EditorSectionHeader>
      <GiftsFieldsEditor
        gifts={rewards}
        onChange={onUpdateLevelUpRewards}
        idPrefix={`gifts-${subject.id}`}
      />
    </section>
  );
}
