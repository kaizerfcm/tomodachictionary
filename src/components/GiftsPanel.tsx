import type { Character, LevelUpRewards } from '../types';
import { AiSparkButton } from './AiSparkButton';
import { EditorSectionHeader } from './EditorSectionHeader';
import { GiftsFieldsEditor } from './GiftsFieldsEditor';

interface GiftsPanelProps {
  subject: Character;
  onUpdateLevelUpRewards: (rewards: LevelUpRewards) => void;
  onRegenerateAll: () => Promise<void>;
  generatingKey: string | null;
  hasApiKey: boolean;
}

export function GiftsPanel({
  subject,
  onUpdateLevelUpRewards,
  onRegenerateAll,
  generatingKey,
  hasApiKey,
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
        {hasApiKey && (
          <AiSparkButton
            onClick={onRegenerateAll}
            disabled={generatingKey === 'gifts:all' || !hasApiKey}
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
