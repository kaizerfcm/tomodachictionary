import { INTERACTION_TOPIC_KINDS } from '../lib/interactionTopics';
import type { InteractionTopic, InteractionTopicKind } from '../types';

interface InteractionTopicEditorProps {
  topic: InteractionTopic | undefined;
  onChange: (text: string, kind: InteractionTopicKind) => void;
  inputClassName?: string;
}

export function InteractionTopicEditor({
  topic,
  onChange,
  inputClassName = 'topic-input',
}: InteractionTopicEditorProps) {
  const text = topic?.text ?? '';
  const kind = topic?.kind ?? 'other';

  return (
    <div className="topic-editor">
      <select
        className="topic-kind-select"
        value={kind}
        onChange={(e) =>
          onChange(text, e.target.value as InteractionTopicKind)
        }
        aria-label="Topic type"
      >
        {INTERACTION_TOPIC_KINDS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input
        type="text"
        className={inputClassName}
        value={text}
        onChange={(e) => onChange(e.target.value, kind)}
        aria-label="Topic"
      />
    </div>
  );
}
