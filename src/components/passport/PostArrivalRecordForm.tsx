import { useEffect, useState } from "react";
import type { PostArrivalRecordInput } from "@shared/schema";

type RecordType = PostArrivalRecordInput["recordType"];
type SavedRecord = {
  id: number;
  recordType: RecordType;
  label: string;
  details: Record<string, unknown>;
  activityDate: string | null;
  countryCode: string;
  currencyCode: string;
  evidenceStatus: string;
};

type Props = {
  initialRecord?: SavedRecord;
  isSaving: boolean;
  onSubmit: (payload: PostArrivalRecordInput, recordId?: number) => void;
  onCancel?: () => void;
};

const RECORD_TYPES: Array<{ value: RecordType; label: string }> = [
  { value: "employment", label: "Employment details" },
  { value: "income", label: "Income received" },
  { value: "accommodation", label: "Accommodation and rent" },
  { value: "banking_savings", label: "Banking and savings" },
  { value: "expense", label: "Regular expenses" },
  { value: "financial_activity", label: "Financial activity" },
  { value: "other_change", label: "Other change" },
];

const EVIDENCE_HINTS: Record<RecordType, string> = {
  employment: "Optional evidence later: an employment letter or contract.",
  income: "Optional evidence later: a payslip or relevant bank statement.",
  accommodation: "Optional evidence later: a rent receipt or tenancy agreement. A formal tenancy is not required.",
  banking_savings: "Optional evidence later: a bank or savings statement.",
  expense: "Optional evidence later: a utility bill or other relevant receipt.",
  financial_activity: "Optional evidence later: a statement or transfer receipt.",
  other_change: "You can add relevant context if it helps explain this change.",
};

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toFormRecord(record?: SavedRecord) {
  const details = record?.details ?? {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(details)) {
    result[key] = value === null || value === undefined ? "" : String(value);
  }
  return result;
}

export default function PostArrivalRecordForm({ initialRecord, isSaving, onSubmit, onCancel }: Props) {
  const [recordType, setRecordType] = useState<RecordType>(initialRecord?.recordType ?? "employment");
  const [label, setLabel] = useState(initialRecord?.label ?? "");
  const [activityDate, setActivityDate] = useState(initialRecord?.activityDate ?? "");
  const [countryCode, setCountryCode] = useState(initialRecord?.countryCode ?? "GB");
  const [currencyCode, setCurrencyCode] = useState(initialRecord?.currencyCode ?? "GBP");
  const [fields, setFields] = useState<Record<string, string>>(() => toFormRecord(initialRecord));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setRecordType(initialRecord?.recordType ?? "employment");
    setLabel(initialRecord?.label ?? "");
    setActivityDate(initialRecord?.activityDate ?? "");
    setCountryCode(initialRecord?.countryCode ?? "GB");
    setCurrencyCode(initialRecord?.currencyCode ?? "GBP");
    setFields(toFormRecord(initialRecord));
    setLocalError(null);
  }, [initialRecord]);

  function setField(key: string, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function buildDetails(): Record<string, unknown> {
    const optional = (key: string) => optionalString(fields[key] ?? "");
    const amount = (key: string) => optional(key);
    switch (recordType) {
      case "employment":
        return {
          employmentType: fields.employmentType || "permanent",
          ...(optional("employer") ? { employer: optional("employer") } : {}),
          ...(optional("jobTitle") ? { jobTitle: optional("jobTitle") } : {}),
          ...(optional("startDate") ? { startDate: optional("startDate") } : {}),
          ...(amount("salaryAmount") ? { salaryAmount: amount("salaryAmount") } : {}),
          ...(optional("salaryFrequency") ? { salaryFrequency: optional("salaryFrequency") } : {}),
          ...(optional("salaryBasis") ? { salaryBasis: optional("salaryBasis") } : {}),
          ...(optional("firstSalaryDate") ? { firstSalaryDate: optional("firstSalaryDate") } : {}),
        };
      case "income":
        return {
          sourceType: fields.sourceType || "salary",
          amount: fields.amount ?? "",
          paymentFrequency: fields.paymentFrequency || "monthly",
          ...(optional("payer") ? { payer: optional("payer") } : {}),
          ...(optional("grossOrNet") ? { grossOrNet: optional("grossOrNet") } : {}),
          ...(optional("note") ? { note: optional("note") } : {}),
        };
      case "accommodation":
        return {
          arrangementType: fields.arrangementType || "private_rent",
          ...(optional("provider") ? { provider: optional("provider") } : {}),
          ...(optional("tenancyStartDate") ? { tenancyStartDate: optional("tenancyStartDate") } : {}),
          ...(amount("rentAmount") ? { rentAmount: amount("rentAmount") } : {}),
          ...(optional("rentFrequency") ? { rentFrequency: optional("rentFrequency") } : {}),
          ...(fields.hasFormalTenancy !== undefined && fields.hasFormalTenancy !== ""
            ? { hasFormalTenancy: fields.hasFormalTenancy === "yes" }
            : {}),
        };
      case "banking_savings":
        return {
          ...(optional("institution") ? { institution: optional("institution") } : {}),
          ...(amount("availableSavings") ? { availableSavings: amount("availableSavings") } : {}),
          ...(optional("balanceDate") ? { balanceDate: optional("balanceDate") } : {}),
          ...(optional("savingsActivity") ? { savingsActivity: optional("savingsActivity") } : {}),
        };
      case "expense":
        return {
          category: fields.category || "other",
          amount: fields.amount ?? "",
          frequency: fields.frequency || "monthly",
          ...(optional("provider") ? { provider: optional("provider") } : {}),
          ...(optional("note") ? { note: optional("note") } : {}),
        };
      case "financial_activity":
        return {
          activityType: fields.activityType || "other",
          amount: fields.amount ?? "",
          ...(optional("counterparty") ? { counterparty: optional("counterparty") } : {}),
          ...(optional("note") ? { note: optional("note") } : {}),
        };
      case "other_change":
        return { description: fields.description ?? "" };
      default:
        return {};
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    if (!label.trim()) {
      setLocalError("Add a short title for this record.");
      return;
    }
    if (recordType === "banking_savings" &&
        !fields.institution?.trim() && !fields.availableSavings?.trim() && !fields.savingsActivity?.trim()) {
      setLocalError("Add an institution, a savings balance, or a savings note.");
      return;
    }
    const payload = {
      recordType,
      label: label.trim(),
      activityDate: activityDate || null,
      countryCode: countryCode.trim().toUpperCase() || "GB",
      currencyCode: currencyCode.trim().toUpperCase() || "GBP",
      details: buildDetails(),
    } as PostArrivalRecordInput;
    onSubmit(payload, initialRecord?.id);
  }

  const selectClass = "mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const inputClass = selectClass;
  const field = (key: string, title: string, type = "text", required = false, hint?: string) => (
    <label className="block text-sm font-medium text-slate-700">
      {title}{required ? " *" : ""}
      <input
        className={inputClass}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        required={required}
        value={fields[key] ?? ""}
        onChange={(event) => setField(key, event.target.value)}
      />
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
  const select = (key: string, title: string, options: Array<[string, string]>) => (
    <label className="block text-sm font-medium text-slate-700">
      {title}
      <select className={selectClass} value={fields[key] ?? options[0][0]} onChange={(event) => setField(key, event.target.value)}>
        {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
      </select>
    </label>
  );
  const textarea = (key: string, title: string, rows = 3) => (
    <label className="block text-sm font-medium text-slate-700">
      {title}
      <textarea className={`${inputClass} min-h-20`} rows={rows} maxLength={1000} value={fields[key] ?? ""} onChange={(event) => setField(key, event.target.value)} />
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Information type
          <select
            className={selectClass}
            value={recordType}
            disabled={Boolean(initialRecord)}
            onChange={(event) => {
              setRecordType(event.target.value as RecordType);
              setFields({});
            }}
          >
            {RECORD_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Title *
          <input className={inputClass} maxLength={120} required value={label} onChange={(event) => setLabel(event.target.value)} placeholder="For example, current job" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Country code
          <input className={inputClass} maxLength={2} value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} placeholder="GB" />
          <span className="mt-1 block text-xs font-normal text-slate-500">Two-letter code, such as GB or NG.</span>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Currency
          <input className={inputClass} maxLength={3} value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value.toUpperCase())} placeholder="GBP" />
          <span className="mt-1 block text-xs font-normal text-slate-500">Three-letter code, such as GBP, USD or NGN.</span>
        </label>
      </div>

      {recordType === "employment" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {select("employmentType", "Employment type", [
            ["permanent", "Permanent"], ["fixed_term", "Fixed term"], ["part_time", "Part time"],
            ["self_employed", "Self-employed"], ["freelance", "Freelance"], ["other", "Other"],
          ])}
          {field("employer", "Employer (optional)")}
          {field("jobTitle", "Job title (optional)")}
          {field("startDate", "Employment start date", "date")}
          {field("salaryAmount", "Agreed salary or earnings (optional)", "number", false, "This describes employment terms, not money received.")}
          {select("salaryFrequency", "Pay frequency", [
            ["monthly", "Monthly"], ["weekly", "Weekly"], ["fortnightly", "Fortnightly"],
            ["annual", "Annual"], ["irregular", "Irregular"],
          ])}
          {select("salaryBasis", "Salary basis", [["unknown", "Not known"], ["gross", "Gross"], ["net", "Net"]])}
          {field("firstSalaryDate", "First salary received (optional)", "date")}
        </div>
      )}

      {recordType === "income" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {select("sourceType", "Income source", [
            ["salary", "Salary"], ["self_employment", "Self-employment"], ["freelance", "Freelance"],
            ["business", "Business"], ["scholarship", "Scholarship"], ["family_support", "Family support"], ["other", "Other"],
          ])}
          {field("amount", "Amount received", "number", true)}
          {field("payer", "Payer or source (optional)")}
          {select("paymentFrequency", "Payment frequency", [
            ["one_off", "One-off"], ["weekly", "Weekly"], ["fortnightly", "Fortnightly"],
            ["monthly", "Monthly"], ["annual", "Annual"], ["irregular", "Irregular"],
          ])}
          {select("grossOrNet", "Gross or net (optional)", [["unknown", "Not known"], ["gross", "Gross"], ["net", "Net"]])}
          {field("note", "Note (optional)")}
        </div>
      )}

      {recordType === "accommodation" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {select("arrangementType", "Accommodation arrangement", [
            ["private_rent", "Private rent"], ["family_or_friends", "With family or friends"],
            ["temporary", "Temporary accommodation"], ["student", "Student accommodation"],
            ["owned", "Owned"], ["other", "Other"],
          ])}
          {field("provider", "Landlord or provider (optional)")}
          {field("tenancyStartDate", "Tenancy start date (optional)", "date")}
          {field("rentAmount", "Rent amount (optional)", "number")}
          {select("rentFrequency", "Rent frequency (optional)", [
            ["monthly", "Monthly"], ["weekly", "Weekly"], ["fortnightly", "Fortnightly"],
            ["annual", "Annual"], ["irregular", "Irregular"],
          ])}
          {select("hasFormalTenancy", "Formal tenancy agreement?", [["", "Not specified"], ["yes", "Yes"], ["no", "No"]])}
        </div>
      )}

      {recordType === "banking_savings" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {field("institution", "Financial institution (optional)")}
          {field("availableSavings", "Savings balance (optional)", "number")}
          {field("balanceDate", "Balance date (optional)", "date")}
          {textarea("savingsActivity", "Savings activity (optional)")}
          <p className="sm:col-span-2 rounded-lg bg-white p-3 text-xs text-slate-600">
            Do not enter a full bank account number, login, password, or card security details.
          </p>
        </div>
      )}

      {recordType === "expense" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {select("category", "Expense category", [
            ["food", "Food and groceries"], ["transport", "Transport"], ["utilities", "Utilities"],
            ["internet_phone", "Internet and phone"], ["insurance", "Insurance"],
            ["subscription", "Subscriptions"], ["loan", "Loan repayments"], ["education", "Education"], ["other", "Other"],
          ])}
          {field("amount", "Amount", "number", true)}
          {select("frequency", "Frequency", [
            ["one_off", "One-off"], ["weekly", "Weekly"], ["fortnightly", "Fortnightly"],
            ["monthly", "Monthly"], ["annual", "Annual"], ["irregular", "Irregular"],
          ])}
          {field("provider", "Provider (optional)")}
          {field("note", "Note (optional)")}
        </div>
      )}

      {recordType === "financial_activity" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {select("activityType", "Activity type", [
            ["salary", "Salary received"], ["freelance_income", "Freelance income"],
            ["rent_payment", "Rent payment"], ["savings_contribution", "Savings contribution"],
            ["international_transfer", "International transfer"], ["remittance", "Remittance"], ["other", "Other"],
          ])}
          {field("amount", "Amount", "number", true)}
          {field("counterparty", "Other party (optional)")}
          {field("note", "Note (optional)")}
        </div>
      )}

      {recordType === "other_change" && textarea("description", "Describe the change", 4)}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          {recordType === "income" ? "Date received *" :
            recordType === "financial_activity" ? "Activity date *" : "Relevant date (optional)"}
          <input
            className={inputClass}
            type="date"
            required={recordType === "income" || recordType === "financial_activity"}
            value={activityDate}
            onChange={(event) => setActivityDate(event.target.value)}
          />
        </label>
      </div>

      <p className="rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
        {EVIDENCE_HINTS[recordType]} Supporting records are optional and do not change your score by themselves. Secure document uploads are not enabled yet.
      </p>
      {localError && <p className="text-sm font-medium text-red-700" role="alert">{localError}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={isSaving} className="min-h-10 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60">
          {isSaving ? "Saving…" : initialRecord ? "Save changes" : "Save information"}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>}
      </div>
    </form>
  );
}

export type { SavedRecord };
