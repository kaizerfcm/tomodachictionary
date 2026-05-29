interface OptionTripletProps {
  label: string;
  options: [string, string, string];
  selectedIndex: number;
  onSelect: (index: number) => void;
  name: string;
}

export function OptionTriplet({
  label,
  options,
  selectedIndex,
  onSelect,
  name,
}: OptionTripletProps) {
  return (
    <fieldset className="option-triplet">
      <legend className="option-triplet-label">{label}</legend>
      <div className="option-triplet-choices">
        {options.map((opt, i) => (
          <label key={i} className="option-choice">
            <input
              type="radio"
              name={name}
              checked={selectedIndex === i}
              onChange={() => onSelect(i)}
            />
            <span>{opt || '(empty)'}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface OptionTripletMultiProps {
  label: string;
  options: [string, string, string];
  selectedIndices: boolean[];
  onToggle: (index: number) => void;
}

export function OptionTripletMulti({
  label,
  options,
  selectedIndices,
  onToggle,
}: OptionTripletMultiProps) {
  return (
    <fieldset className="option-triplet">
      <legend className="option-triplet-label">{label}</legend>
      <div className="option-triplet-choices">
        {options.map((opt, i) =>
          opt.trim() ? (
            <label key={i} className="option-choice">
              <input
                type="checkbox"
                checked={selectedIndices[i]}
                onChange={() => onToggle(i)}
              />
              <span>{opt}</span>
            </label>
          ) : null,
        )}
      </div>
    </fieldset>
  );
}

interface OptionCompareProps {
  label: string;
  name: string;
  currentText: string;
  newText: string;
  choice: 'current' | 'new';
  onChoice: (choice: 'current' | 'new') => void;
}

export function OptionCompare({
  label,
  name,
  currentText,
  newText,
  choice,
  onChoice,
}: OptionCompareProps) {
  return (
    <fieldset className="option-triplet option-compare">
      <legend className="option-triplet-label">{label}</legend>
      <div className="option-triplet-choices">
        <label className="option-choice">
          <input
            type="radio"
            name={name}
            checked={choice === 'current'}
            onChange={() => onChoice('current')}
          />
          <span>
            <strong>Current</strong> {currentText}
          </span>
        </label>
        <label className="option-choice">
          <input
            type="radio"
            name={name}
            checked={choice === 'new'}
            onChange={() => onChoice('new')}
          />
          <span>
            <strong>New</strong> {newText}
          </span>
        </label>
      </div>
    </fieldset>
  );
}
