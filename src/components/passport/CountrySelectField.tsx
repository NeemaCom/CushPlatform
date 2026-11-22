type CountryOption = {
  code: string;
  name: string;
};

type CountrySelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (countryCode: string) => void;
  required?: boolean;
  className?: string;
  selectClassName?: string;
  hint?: string;
};

const NON_COUNTRY_REGION_CODES = new Set(
  "AC AN BU CP CQ CS DD DG DY EA EU EZ FX HV IC NH QO RH SU TA TP UK UN VD XA XB XK YD YU ZR".split(" "),
);

function getCountryOptions(): CountryOption[] {
  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const countries: CountryOption[] = [];

  for (const first of letters) {
    for (const second of letters) {
      const code = `${first}${second}`;
      if (NON_COUNTRY_REGION_CODES.has(code)) continue;
      const name = displayNames.of(code);
      if (name && name !== code && name !== "Unknown Region") {
        countries.push({ code, name });
      }
    }
  }

  return countries.sort((left, right) => left.name.localeCompare(right.name, "en"));
}

const COUNTRY_OPTIONS = getCountryOptions();

export default function CountrySelectField({
  id,
  label,
  value,
  onChange,
  required = false,
  className = "block text-xs font-medium text-slate-700",
  selectClassName = "mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800",
  hint = "Choose the country this information relates to.",
}: CountrySelectFieldProps) {
  const countryCode = value.trim().toUpperCase();
  const hasUnsupportedCode = countryCode !== "" && !COUNTRY_OPTIONS.some((country) => country.code === countryCode);

  return (
    <label htmlFor={id} className={className}>
      {label}
      <select
        id={id}
        required={required}
        value={countryCode}
        onChange={(event) => onChange(event.target.value)}
        className={selectClassName}
      >
        <option value="">Choose a country</option>
        {hasUnsupportedCode && <option value={countryCode}>Existing country code ({countryCode})</option>}
        {COUNTRY_OPTIONS.map(({ code, name }) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-[11px] font-normal text-slate-500">{hint}</span>}
    </label>
  );
}
