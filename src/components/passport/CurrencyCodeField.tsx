export type CurrencyOption = {
  code: string;
  name: string;
};

type Props = {
  id: string;
  label: string;
  value: string;
  options: CurrencyOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
};

export default function CurrencyCodeField({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  required = false,
  className = "block text-sm font-medium text-slate-700",
  inputClassName = "mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800",
}: Props) {
  const selected = options.find((option) => option.code === value.toUpperCase());
  return (
    <label className={className} htmlFor={id}>
      {label}
      <input
        id={id}
        className={inputClassName}
        list={`${id}-options`}
        maxLength={3}
        required={required}
        autoCapitalize="characters"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        placeholder="GBP"
        autoComplete="off"
      />
      <datalist id={`${id}-options`}>
        {options.map((option) => (
          <option key={option.code} value={option.code}>{option.name}</option>
        ))}
      </datalist>
      <span className="mt-1 block text-xs font-normal text-slate-500">
        {selected?.name ?? "Enter the three-letter ISO currency code printed on your record."}
      </span>
    </label>
  );
}
