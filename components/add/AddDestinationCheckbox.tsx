type AddDestinationCheckboxProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
};

export function AddDestinationCheckbox({
  checked,
  disabled = false,
  onChange,
  label,
}: AddDestinationCheckboxProps) {
  return (
    <span className="add-destination-checkbox">
      <input
        type="checkbox"
        className="add-destination-checkbox__input"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={label}
      />
      <span className="add-destination-checkbox__box" aria-hidden>
        {checked ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6.2 4.8 8.5 9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
    </span>
  );
}
