import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ChevronDown, Clock3, Download, FileText, Loader2, Save, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { accountRequest } from "@/lib/account-api";
import { API_BASE_URL } from "@/lib/api-base";
import { getProductSessionHeaders } from "@/lib/product-session";
import CurrencyCodeField, { type CurrencyOption } from "./CurrencyCodeField";
import CountrySelectField from "./CountrySelectField";
import { extractPassportDocumentFinancialFacts } from "@shared/passport-document-facts";

type FinancialProfile = {
  countryCode: string;
  currencyCode: string;
  employmentStatus: string;
  employer: string;
  jobTitle: string;
  incomeAmount: string;
  incomeFrequency: "weekly" | "monthly" | "annual" | "variable" | "";
  incomeCategory: "salary" | "contract" | "business" | "family_support" | "other";
  housingStatus: string;
  housingCost: string;
  savingsAmount: string;
  savingsLabel: string;
  commitmentsAmount: string;
  completeCashFlow: boolean;
  financialHistorySummary: string;
  financialHistory: FinancialHistoryEntry[];
};

type FinancialHistoryEntry = {
  id: string;
  month: string;
  label: string;
  countryCode: string;
  currencyCode: string;
  incomeAmount: string;
  incomeFrequency: "weekly" | "monthly" | "annual" | "variable" | "";
  incomeCategory: "salary" | "contract" | "business" | "family_support" | "other";
  recurring: boolean;
  variable: boolean;
  savingsAmount: string;
  savingsLabel: string;
  expensesAmount: string;
  completeCashFlow: boolean;
};

type ProfileData = {
  arrivalDate?: string | null;
  profile: FinancialProfile | null;
  draft: FinancialProfile | null;
  draftUpdatedAt: string | null;
  progress: {
    completed: number;
    total: number;
    percent: number;
    steps: Array<{ id: string; label: string; complete: boolean }>;
  };
  updatedAt: string | null;
};

type Submission = {
  id: number;
  period: "pre_arrival" | "post_arrival";
  documentType: string;
  label: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  countryCode: string;
  currencyCode: string;
  reviewStatus: string;
  evidenceClassification: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SubmissionDetail = {
  submission: Submission;
  extractedDraft: string;
  correctedDraft: string | null;
  currencyDetection: {
    detectedCurrencyCodes: string[];
    suggestedCurrencyCode: string | null;
    ambiguousSymbols: Array<{ symbol: string; candidates: string[] }>;
  };
  events: Array<{ eventType: string; createdAt: string }>;
};

const EMPTY_PROFILE: FinancialProfile = {
  countryCode: "",
  currencyCode: "",
  employmentStatus: "",
  employer: "",
  jobTitle: "",
  incomeAmount: "",
  incomeFrequency: "",
  incomeCategory: "other",
  housingStatus: "",
  housingCost: "",
  savingsAmount: "",
  savingsLabel: "",
  commitmentsAmount: "",
  completeCashFlow: false,
  financialHistorySummary: "",
  financialHistory: [],
};

const EMPLOYMENT_STATUS_OPTIONS = ["Employed", "Self-employed", "Business owner", "Not currently employed", "Student", "Other"];
const HOUSING_STATUS_OPTIONS = ["Renting", "Owner-occupied", "Living with family or friends", "Temporary accommodation", "Other"];

function emptyProfileFor(period: "pre_arrival" | "post_arrival"): FinancialProfile {
  return period === "post_arrival"
    ? { ...EMPTY_PROFILE, countryCode: "GB", currencyCode: "GBP" }
    : EMPTY_PROFILE;
}

type ProfileSection = "income" | "housing" | "savings" | "history";
type OpenProfileSections = Record<ProfileSection, boolean>;

function hasProfileSectionContent(profile: FinancialProfile, section: ProfileSection) {
  const hasText = (...values: Array<string | null | undefined>) =>
    values.some((value) => Boolean(value?.trim()));
  if (section === "income") {
    return hasText(profile.employmentStatus, profile.employer, profile.jobTitle, profile.incomeAmount, profile.incomeFrequency);
  }
  if (section === "housing") {
    return hasText(profile.housingStatus, profile.housingCost);
  }
  if (section === "savings") {
    return hasText(profile.savingsAmount, profile.savingsLabel, profile.commitmentsAmount) || profile.completeCashFlow;
  }
  return hasText(profile.financialHistorySummary) || profile.financialHistory.length > 0;
}

function initialOpenProfileSections(profile: FinancialProfile): OpenProfileSections {
  const firstIncomplete = (["income", "housing", "savings", "history"] as const)
    .find((section) => !hasProfileSectionContent(profile, section));
  return {
    income: firstIncomplete === "income",
    housing: firstIncomplete === "housing",
    savings: firstIncomplete === "savings",
    history: firstIncomplete === "history",
  };
}

const DOCUMENT_TYPES = [
  ["payslip", "Payslip"],
  ["bank_statement", "Bank statement"],
  ["rent_receipt", "Rent or housing record"],
  ["savings_statement", "Savings statement"],
  ["commitment_statement", "Financial commitment"],
  ["proof_of_residency", "Proof of residency"],
  ["tax_return", "Tax return"],
  ["employment_contract", "Employment contract"],
  ["transfer_receipt", "Transfer receipt"],
  ["other", "Other document"],
];

function readableStatus(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not submitted";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function profileRequest<T>(method: string, path: string, body?: unknown) {
  return accountRequest<T>(method, path, body);
}

async function uploadDocument(file: File, metadata: {
  documentType: string;
  label: string;
  countryCode: string;
  currencyCode: string;
  period: "pre_arrival" | "post_arrival";
}) {
  const contentType = file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/csv";
  const response = await fetch(`${API_BASE_URL}/api/passport/evidence-submissions`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...getProductSessionHeaders(),
      "Content-Type": contentType,
      "X-Evidence-Type": metadata.documentType,
      "X-Evidence-Label": metadata.label,
      "X-Country-Code": metadata.countryCode,
      "X-Currency-Code": metadata.currencyCode,
      "X-Evidence-Period": metadata.period,
      "X-Evidence-Filename": encodeURIComponent(file.name),
    },
    body: file,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "The file could not be uploaded.");
  }
  return payload as {
    submission: Submission;
    extractedDraft: string;
    extractionStatus: string;
    currencyDetection: SubmissionDetail["currencyDetection"];
  };
}

function statusTone(status: string) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "submitted" || status === "under_review") return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "additional_information_required") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function PassportEvidenceIntake({
  period = "pre_arrival",
  view = "all",
  onSaved,
  onApplyExtractedFacts,
}: {
  period?: "pre_arrival" | "post_arrival";
  view?: "all" | "profile" | "documents";
  onSaved?: () => void;
  onApplyExtractedFacts?: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [profile, setProfile] = useState(() => emptyProfileFor(period));
  const [profileDraftStatus, setProfileDraftStatus] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [hasSavedProfileDraft, setHasSavedProfileDraft] = useState(false);
  const [openProfileSections, setOpenProfileSections] = useState<OpenProfileSections>(() => initialOpenProfileSections(emptyProfileFor(period)));
  const [documentUploadOpen, setDocumentUploadOpen] = useState(false);
  const [documentType, setDocumentType] = useState("bank_statement");
  const [documentLabel, setDocumentLabel] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentCountryCode, setDocumentCountryCode] = useState(() => emptyProfileFor(period).countryCode);
  const [documentCurrencyCode, setDocumentCurrencyCode] = useState(() => emptyProfileFor(period).currencyCode);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [correctedDraft, setCorrectedDraft] = useState("");
  const [correctedCurrencyCode, setCorrectedCurrencyCode] = useState("GBP");
  const [candidateMonths, setCandidateMonths] = useState<Record<string, string>>({});
  const hydratedProfilePeriod = useRef<string | null>(null);
  const hydratedDocumentDisclosure = useRef(false);
  const profileDraftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileDraftSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const profileDraftSaveVersion = useRef(0);
  const suspendProfileDraftSave = useRef(false);
  const discardProfileDraftAction = useRef<() => void>(() => undefined);
  const employmentStatusIsCustom = profile.employmentStatus !== "" && !EMPLOYMENT_STATUS_OPTIONS.includes(profile.employmentStatus);
  const housingStatusIsCustom = profile.housingStatus !== "" && !HOUSING_STATUS_OPTIONS.includes(profile.housingStatus);

  const profileQuery = useQuery<ProfileData>({
    queryKey: ["/api/passport/financial-profile", period],
    queryFn: () => profileRequest("GET", `/api/passport/financial-profile?period=${period}`),
    retry: false,
  });
  const documentsQuery = useQuery<{ submissions: Submission[] }>({
    queryKey: ["/api/passport/evidence-submissions", period],
    queryFn: () => profileRequest("GET", `/api/passport/evidence-submissions?period=${period}`),
    retry: false,
  });
  const currencyOptionsQuery = useQuery<{ currencies: CurrencyOption[] }>({
    queryKey: ["/api/passport/currencies"],
    queryFn: () => profileRequest("GET", "/api/passport/currencies"),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const detailQuery = useQuery<SubmissionDetail>({
    queryKey: ["/api/passport/evidence-submissions", selectedId],
    queryFn: () => profileRequest("GET", `/api/passport/evidence-submissions/${selectedId}`),
    enabled: selectedId !== null,
    retry: false,
  });
  const historyQuery = useQuery<{ events: Array<{ id: number; eventType: string; createdAt: string }> }>({
    queryKey: ["/api/passport/evidence-history"],
    queryFn: () => profileRequest("GET", "/api/passport/evidence-history"),
    retry: false,
  });

  useEffect(() => {
    if (profileQuery.data && hydratedProfilePeriod.current !== period) {
      const restoredProfile = profileQuery.data.draft ?? profileQuery.data.profile ?? emptyProfileFor(period);
      hydratedProfilePeriod.current = period;
      setProfile(restoredProfile);
      setProfileDraftStatus(profileQuery.data.draft ? "saved" : "idle");
      setHasSavedProfileDraft(Boolean(profileQuery.data.draft));
      setOpenProfileSections(initialOpenProfileSections(restoredProfile));
    }
  }, [profileQuery.data, period]);
  useEffect(() => {
    if (documentsQuery.data && !hydratedDocumentDisclosure.current) {
      hydratedDocumentDisclosure.current = true;
      setDocumentUploadOpen(documentsQuery.data.submissions.length === 0);
    }
  }, [documentsQuery.data]);
  useEffect(() => {
    const currentProfile = profileQuery.data?.draft ?? profileQuery.data?.profile;
    if (period === "pre_arrival" && currentProfile) {
      setDocumentCountryCode(currentProfile.countryCode);
      setDocumentCurrencyCode(currentProfile.currencyCode);
    }
  }, [profileQuery.data, period]);
  useEffect(() => {
    if (detailQuery.data) {
      setCorrectedDraft(detailQuery.data.correctedDraft ?? detailQuery.data.extractedDraft);
      setCandidateMonths({});
      setCorrectedCurrencyCode(
        detailQuery.data.currencyDetection.suggestedCurrencyCode ??
        detailQuery.data.submission.currencyCode,
      );
    }
  }, [detailQuery.data]);

  const invalidateIntake = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/passport/financial-profile", period] }),
      queryClient.invalidateQueries({ queryKey: ["/api/passport/evidence-submissions", period] }),
      queryClient.invalidateQueries({ queryKey: ["/api/passport/evidence-history"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/passport/v2"] }),
      ...(selectedId === null ? [] : [queryClient.invalidateQueries({ queryKey: ["/api/passport/evidence-submissions", selectedId] })]),
    ]);
    await queryClient.invalidateQueries(
      { queryKey: ["/api/passport/me"] },
      { throwOnError: true },
    );
  };

  const saveProfileDraft = useMutation({
    mutationFn: (snapshot: FinancialProfile) =>
      profileRequest<{ updatedAt: string }>("PUT", `/api/passport/financial-profile/draft?period=${period}`, snapshot),
    onSuccess: (result, snapshot) => {
      setProfileDraftStatus("saved");
      setHasSavedProfileDraft(true);
      queryClient.setQueryData<ProfileData>(["/api/passport/financial-profile", period], (current) =>
        current ? { ...current, draft: snapshot, draftUpdatedAt: result.updatedAt } : current,
      );
    },
    onError: () => setProfileDraftStatus("error"),
  });

  const queueProfileDraft = useCallback((snapshot: FinancialProfile) => {
    const version = ++profileDraftSaveVersion.current;
    profileDraftSaveQueue.current = profileDraftSaveQueue.current
      .catch(() => undefined)
      .then(async () => {
        if (version !== profileDraftSaveVersion.current || suspendProfileDraftSave.current) return;
        setProfileDraftStatus("saving");
        try {
          await saveProfileDraft.mutateAsync(snapshot);
        } catch {
          // The mutation exposes a visible retry state; keep the queue usable.
        }
      });
    return profileDraftSaveQueue.current;
  }, [saveProfileDraft.mutateAsync]);

  const pauseProfileDraftSaves = useCallback(async () => {
    suspendProfileDraftSave.current = true;
    profileDraftSaveVersion.current += 1;
    if (profileDraftTimer.current) {
      clearTimeout(profileDraftTimer.current);
      profileDraftTimer.current = null;
    }
    await profileDraftSaveQueue.current.catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!profileQuery.data || hydratedProfilePeriod.current !== period || suspendProfileDraftSave.current) return;
    const confirmedSnapshot = profileQuery.data.profile ?? emptyProfileFor(period);
    const savedSnapshot = profileQuery.data.draft ?? confirmedSnapshot;
    if (JSON.stringify(profile) === JSON.stringify(savedSnapshot)) {
      setProfileDraftStatus(hasSavedProfileDraft ? "saved" : "idle");
      return;
    }
    setProfileDraftStatus("pending");
    if (profileDraftTimer.current) clearTimeout(profileDraftTimer.current);
    const isRevertingToConfirmed = hasSavedProfileDraft &&
      JSON.stringify(profile) === JSON.stringify(confirmedSnapshot);
    profileDraftTimer.current = setTimeout(() => {
      profileDraftTimer.current = null;
      if (isRevertingToConfirmed) {
        discardProfileDraftAction.current();
      } else {
        void queueProfileDraft(structuredClone(profile));
      }
    }, 650);
    return () => {
      if (profileDraftTimer.current) {
        clearTimeout(profileDraftTimer.current);
        profileDraftTimer.current = null;
      }
    };
  }, [profile, profileQuery.data, period, queueProfileDraft, hasSavedProfileDraft]);

  useEffect(() => () => {
    if (profileDraftTimer.current) clearTimeout(profileDraftTimer.current);
  }, []);

  const discardProfileDraft = useMutation({
    mutationFn: async () => {
      await pauseProfileDraftSaves();
      return profileRequest("DELETE", `/api/passport/financial-profile/draft?period=${period}`);
    },
    onSuccess: async () => {
      setProfile(profileQuery.data?.profile ?? emptyProfileFor(period));
      setProfileDraftStatus("idle");
      setHasSavedProfileDraft(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/passport/financial-profile", period] });
      suspendProfileDraftSave.current = false;
    },
    onError: () => {
      suspendProfileDraftSave.current = false;
      setProfileDraftStatus("error");
    },
  });
  discardProfileDraftAction.current = () => discardProfileDraft.mutate();

  const saveProfile = useMutation({
    mutationFn: async () => {
      await pauseProfileDraftSaves();
      return profileRequest("PUT", `/api/passport/financial-profile?period=${period}`, profile);
    },
    onSuccess: async () => {
      setOpenProfileSections({ income: false, housing: false, savings: false, history: false });
      setProfileDraftStatus("idle");
      setHasSavedProfileDraft(false);
      let scoreRefreshFailed = false;
      try {
        await invalidateIntake();
      } catch {
        scoreRefreshFailed = true;
      }
      suspendProfileDraftSave.current = false;
      toast({
        title: scoreRefreshFailed ? "Profile saved; Score not refreshed" : "Financial profile saved",
        description: scoreRefreshFailed
          ? "Your details are saved, but the assessment could not be refreshed. Your saved information is safe; please try again shortly."
          : "Your confirmed financial details can contribute to your provisional assessment. Uploaded files remain separate; their review status affects Confidence, not Score by itself.",
        ...(scoreRefreshFailed ? { variant: "destructive" as const } : {}),
      });
      if (!scoreRefreshFailed) onSaved?.();
    },
    onError: (error: Error) => {
      suspendProfileDraftSave.current = false;
      toast({ title: "Could not save profile", description: error.message, variant: "destructive" });
    },
  });
  const clearProfile = useMutation({
    mutationFn: async () => {
      await pauseProfileDraftSaves();
      return profileRequest("DELETE", `/api/passport/financial-profile?period=${period}`);
    },
    onSuccess: async () => {
      setProfile(emptyProfileFor(period));
      setOpenProfileSections(initialOpenProfileSections(emptyProfileFor(period)));
      setProfileDraftStatus("idle");
      setHasSavedProfileDraft(false);
      await invalidateIntake();
      suspendProfileDraftSave.current = false;
      toast({ title: "Financial profile removed" });
    },
    onError: (error: Error) => {
      suspendProfileDraftSave.current = false;
      toast({ title: "Could not remove profile", description: error.message, variant: "destructive" });
    },
  });
  const upload = useMutation({
    mutationFn: () => {
      if (!documentFile) throw new Error("Choose a PDF or CSV first.");
      return uploadDocument(documentFile, {
        documentType,
        label: documentLabel.trim() || documentFile.name,
        countryCode: documentCountryCode,
        currencyCode: documentCurrencyCode,
        period,
      });
    },
    onSuccess: (result) => {
      setSelectedId(result.submission.id);
      setCorrectedDraft(result.extractedDraft);
      setDocumentFile(null);
      setDocumentLabel("");
      setDocumentUploadOpen(false);
      invalidateIntake();
      toast({
        title: "Private document uploaded",
        description: result.extractionStatus === "text_extracted"
          ? "Review the extracted draft, correct it if needed, then submit for Cush review."
          : "No text could be extracted. Add a summary or correction before submitting.",
      });
    },
    onError: (error: Error) => toast({ title: "Upload failed", description: error.message, variant: "destructive" }),
  });
  const saveCorrection = useMutation({
    mutationFn: () => profileRequest("PUT", `/api/passport/evidence-submissions/${selectedId}/draft`, {
      correctedDraft,
      currencyCode: correctedCurrencyCode,
    }),
    onSuccess: () => {
      invalidateIntake();
      toast({ title: "Draft corrections saved" });
    },
    onError: (error: Error) => toast({ title: "Could not save corrections", description: error.message, variant: "destructive" }),
  });
  const submitDocument = useMutation({
    mutationFn: async () => {
      if (selectedId === null) throw new Error("Choose a document first.");
      await profileRequest("PUT", `/api/passport/evidence-submissions/${selectedId}/draft`, {
        correctedDraft,
        currencyCode: correctedCurrencyCode,
      });
      return profileRequest("POST", `/api/passport/evidence-submissions/${selectedId}/submit`);
    },
    onSuccess: () => {
      invalidateIntake();
      toast({ title: "Document submitted for review" });
    },
    onError: (error: Error) => toast({ title: "Could not submit document", description: error.message, variant: "destructive" }),
  });
  const deleteDocument = useMutation({
    mutationFn: (id: number) => profileRequest("DELETE", `/api/passport/evidence-submissions/${id}`),
    onSuccess: (_result, id) => {
      if (selectedId === id) setSelectedId(null);
      if ((documentsQuery.data?.submissions.length ?? 0) <= 1) setDocumentUploadOpen(true);
      invalidateIntake();
      toast({ title: "Document removed" });
    },
    onError: (error: Error) => toast({ title: "Could not remove document", description: error.message, variant: "destructive" }),
  });

  const progress = profileQuery.data?.progress;
  const selected = useMemo(
    () => documentsQuery.data?.submissions.find((item) => item.id === selectedId) ?? detailQuery.data?.submission,
    [documentsQuery.data?.submissions, detailQuery.data?.submission, selectedId],
  );
  const extractedFacts = useMemo(() => {
    const submission = detailQuery.data?.submission;
    if (!submission) return [];
    return extractPassportDocumentFinancialFacts(
      correctedDraft,
      submission.documentType,
      submission.mimeType,
    );
  }, [correctedDraft, detailQuery.data?.submission]);
  const canEditDraft = selected && ["draft", "additional_information_required"].includes(selected.reviewStatus);

  function addExtractedFactsToProfile() {
    const submission = detailQuery.data?.submission;
    if (!submission || extractedFacts.length === 0) return;
    const additions: FinancialHistoryEntry[] = [];
    const existingKeys = new Set(profile.financialHistory.map((entry) =>
      `${entry.month}:${entry.countryCode}:${entry.currencyCode}:${entry.label.toLowerCase()}`,
    ));
    for (const fact of extractedFacts) {
      const month = fact.month ?? candidateMonths[fact.id] ?? "";
      if (!month) {
        toast({ title: "Choose the statement month", description: "Confirm the period for each extracted amount before adding it to your financial profile.", variant: "destructive" });
        return;
      }
      const label = `${submission.label}: ${fact.label}`.slice(0, 100);
      const key = `${month}:${submission.countryCode}:${correctedCurrencyCode}:${label.toLowerCase()}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      additions.push({
        id: crypto.randomUUID(),
        month,
        label,
        countryCode: submission.countryCode,
        currencyCode: correctedCurrencyCode,
        incomeAmount: fact.incomeAmount,
        incomeFrequency: fact.incomeFrequency,
        incomeCategory: fact.incomeCategory,
        recurring: fact.recurring,
        variable: fact.variable,
        savingsAmount: fact.savingsAmount,
        savingsLabel: fact.savingsAmount ? fact.label : "",
        expensesAmount: fact.expensesAmount,
        completeCashFlow: false,
      });
    }
    if (profile.financialHistory.length + additions.length > 72) {
      toast({ title: "History limit reached", description: "Remove an older monthly row before adding these details.", variant: "destructive" });
      return;
    }
    if (additions.length === 0) {
      toast({ title: "These figures are already in your profile" });
      return;
    }
    setProfile((current) => ({
      ...current,
      financialHistory: [...current.financialHistory, ...additions],
    }));
    setSelectedId(null);
    onApplyExtractedFacts?.();
    toast({
      title: "Review the extracted details",
      description: "Check the amounts and currency, then save your financial profile to include them in your assessment.",
    });
  }

  function addHistoryEntry() {
    if (profile.financialHistory.length >= 72) {
      toast({ title: "History limit reached", description: "You can save up to 72 monthly history records.", variant: "destructive" });
      return;
    }
    setProfile({
      ...profile,
      financialHistory: [...profile.financialHistory, {
        id: crypto.randomUUID(),
        month: new Date().toISOString().slice(0, 7),
        label: "Main income and spending",
        countryCode: profile.countryCode,
        currencyCode: profile.currencyCode,
        incomeAmount: "",
        incomeFrequency: "monthly",
        incomeCategory: profile.incomeCategory,
        recurring: true,
        variable: false,
        savingsAmount: "",
        savingsLabel: "",
        expensesAmount: "",
        completeCashFlow: false,
      }],
    });
  }

  function updateHistoryEntry(id: string, patch: Partial<FinancialHistoryEntry>) {
    setProfile({
      ...profile,
      financialHistory: profile.financialHistory.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    });
  }

  function removeHistoryEntry(id: string) {
    setProfile({
      ...profile,
      financialHistory: profile.financialHistory.filter((entry) => entry.id !== id),
    });
  }

  async function downloadFile(id: number, name: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/passport/evidence-submissions/${id}/file`, {
        credentials: "include",
        headers: getProductSessionHeaders(),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === "string" ? payload.error : "Download failed.");
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = name;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast({ title: "Could not download document", description: error instanceof Error ? error.message : "Download failed.", variant: "destructive" });
    }
  }

  return (
    <section
      className="space-y-5"
      aria-label={`${period === "post_arrival" ? "Post-arrival" : "Pre-arrival"} financial profile and evidence`}
    >
      {view !== "documents" && (
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id={`passport-evidence-heading-${period}`} className="text-base font-bold text-slate-900">
              {period === "post_arrival" ? "Post-arrival financial profile and evidence" : "Pre-arrival financial profile and evidence"}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              {period === "post_arrival"
                ? "Add your own financial details from your confirmed arrival month onward. Self-declared amounts can affect provisional Score and Confidence as self-reported. You can review extracted document figures and add them to your profile before they are scored."
                : "Add your own financial details alongside connected data. Self-declared amounts can affect provisional Score and Confidence as self-reported. You can review extracted document figures and add them to your profile before they are scored."}
            </p>
          </div>
        </div>
        {profileQuery.isLoading ? (
          <p className="mt-5 text-sm text-slate-500">Loading your profile…</p>
        ) : profileQuery.error ? (
          <p className="mt-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">
            {profileQuery.error instanceof Error ? profileQuery.error.message : "Your financial profile could not be loaded."}
          </p>
        ) : (
          <>
            <div className="mt-5 rounded-xl border border-blue-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Profile completeness</p>
                  <p className="mt-0.5 text-xs text-slate-500">{progress?.completed ?? 0} of {progress?.total ?? 6} areas added</p>
                </div>
                <span className="text-sm font-bold text-blue-800">{progress?.percent ?? 0}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress?.percent ?? 0}%` }} />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {progress?.steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 text-xs text-slate-600">
                    {step.complete
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      : <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />}
                    {step.label}{step.complete ? "" : " — add details"}
                  </div>
                ))}
              </div>
            </div>

            <form
              className="mt-5 space-y-5"
              onBlurCapture={(event) => {
                const nextTarget = event.relatedTarget;
                if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
                if (profileDraftTimer.current) {
                  clearTimeout(profileDraftTimer.current);
                  profileDraftTimer.current = null;
                }
                const baseline = profileQuery.data?.draft ?? profileQuery.data?.profile ?? emptyProfileFor(period);
                if (JSON.stringify(profile) !== JSON.stringify(baseline)) {
                  void queueProfileDraft(structuredClone(profile));
                }
              }}
              onSubmit={(event) => {
                event.preventDefault();
                saveProfile.mutate();
              }}
            >
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Your financial details</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Keep each amount in its original currency. GBP is scored directly; USD and NGN use the existing dated CBN rate. Other valid currencies are saved but remain outside the GBP-based Score until an approved conversion rate is available.
                </p>
              </div>
              <div className="space-y-2.5">
                <details
                  open={openProfileSections.income}
                  onToggle={(event) => {
                    const open = event.currentTarget.open;
                    setOpenProfileSections((current) => ({ ...current, income: open }));
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                    <span>Income and employment</span>
                    <span className="flex items-center gap-2">
                      {hasProfileSectionContent(profileQuery.data?.profile ?? emptyProfileFor(period), "income") && (
                        <span className="text-[10px] font-medium text-emerald-700">On file</span>
                      )}
                      <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </span>
                  </summary>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <CountrySelectField
                      id={`passport-profile-country-${period}`}
                      label="Country"
                      value={profile.countryCode}
                      onChange={(countryCode) => setProfile({ ...profile, countryCode })}
                      required
                      selectClassName="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                    />
                    <CurrencyCodeField
                      id={`passport-profile-currency-${period}`}
                      label="Currency code"
                      value={profile.currencyCode}
                      options={currencyOptionsQuery.data?.currencies ?? []}
                      onChange={(currencyCode) => setProfile({ ...profile, currencyCode })}
                      required
                    />
                    <label className="space-y-1 text-xs font-medium text-slate-700">
                      Employment status
                      <select value={employmentStatusIsCustom ? "Other" : profile.employmentStatus} onChange={(event) => setProfile({ ...profile, employmentStatus: event.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                        <option value="">Choose a status</option>
                        {EMPLOYMENT_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      {(employmentStatusIsCustom || profile.employmentStatus === "Other") && (
                        <input maxLength={80} value={employmentStatusIsCustom ? profile.employmentStatus : ""} onChange={(event) => setProfile({ ...profile, employmentStatus: event.target.value })} placeholder="Add your employment details" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                      )}
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-700">
                      Employer
                      <input maxLength={160} value={profile.employer} onChange={(event) => setProfile({ ...profile, employer: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-700">
                      Job title
                      <input maxLength={120} value={profile.jobTitle} onChange={(event) => setProfile({ ...profile, jobTitle: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-700">
                      Income amount
                      <input inputMode="decimal" value={profile.incomeAmount} onChange={(event) => setProfile({ ...profile, incomeAmount: event.target.value })} placeholder="e.g. 2500.00" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-700">
                      Income frequency
                      <select value={profile.incomeFrequency} onChange={(event) => setProfile({ ...profile, incomeFrequency: event.target.value as FinancialProfile["incomeFrequency"] })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                        <option value="">Select frequency</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="annual">Annual</option><option value="variable">Variable</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-700">
                      Income type
                      <select value={profile.incomeCategory} onChange={(event) => setProfile({ ...profile, incomeCategory: event.target.value as FinancialProfile["incomeCategory"] })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                        <option value="salary">Salary</option><option value="contract">Contract</option><option value="business">Business</option><option value="family_support">Family support</option><option value="other">Other</option>
                      </select>
                    </label>
                  </div>
                </details>
                <details
                  open={openProfileSections.housing}
                  onToggle={(event) => {
                    const open = event.currentTarget.open;
                    setOpenProfileSections((current) => ({ ...current, housing: open }));
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                    <span>Housing and rent</span>
                    <span className="flex items-center gap-2">
                      {hasProfileSectionContent(profileQuery.data?.profile ?? emptyProfileFor(period), "housing") && (
                        <span className="text-[10px] font-medium text-emerald-700">On file</span>
                      )}
                      <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </span>
                  </summary>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-medium text-slate-700">
                      Housing arrangement
                      <select value={housingStatusIsCustom ? "Other" : profile.housingStatus} onChange={(event) => setProfile({ ...profile, housingStatus: event.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                        <option value="">Choose an arrangement</option>
                        {HOUSING_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      {(housingStatusIsCustom || profile.housingStatus === "Other") && (
                        <input maxLength={100} value={housingStatusIsCustom ? profile.housingStatus : ""} onChange={(event) => setProfile({ ...profile, housingStatus: event.target.value })} placeholder="Add your housing details" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                      )}
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-700">
                      Monthly housing cost
                      <input inputMode="decimal" value={profile.housingCost} onChange={(event) => setProfile({ ...profile, housingCost: event.target.value })} placeholder="Amount in selected currency" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                    </label>
                  </div>
                </details>
                <details
                  open={openProfileSections.savings}
                  onToggle={(event) => {
                    const open = event.currentTarget.open;
                    setOpenProfileSections((current) => ({ ...current, savings: open }));
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                    <span>Savings and commitments</span>
                    <span className="flex items-center gap-2">
                      {hasProfileSectionContent(profileQuery.data?.profile ?? emptyProfileFor(period), "savings") && (
                        <span className="text-[10px] font-medium text-emerald-700">On file</span>
                      )}
                      <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </span>
                  </summary>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-medium text-slate-700">
                      Savings amount
                      <input inputMode="decimal" value={profile.savingsAmount} onChange={(event) => setProfile({ ...profile, savingsAmount: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-700">
                      Savings source label
                      <input maxLength={100} value={profile.savingsLabel} onChange={(event) => setProfile({ ...profile, savingsLabel: event.target.value })} placeholder="e.g. Savings account" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-700">
                      Monthly regular commitments
                      <input inputMode="decimal" value={profile.commitmentsAmount} onChange={(event) => setProfile({ ...profile, commitmentsAmount: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                    </label>
                  </div>
                  <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-600">
                    <input type="checkbox" checked={profile.completeCashFlow} onChange={(event) => setProfile({ ...profile, completeCashFlow: event.target.checked })} className="mt-0.5" />
                    <span>For this month, these income and cost amounts cover all my regular spending. Only mark complete if the information is comprehensive.</span>
                  </label>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    To avoid double counting, enter only savings sources that are not already included in a connected bank account. Use the history rows for separate sources and past months.
                  </p>
                </details>
              </div>
              <details
                open={openProfileSections.history}
                onToggle={(event) => {
                  const open = event.currentTarget.open;
                  setOpenProfileSections((current) => ({ ...current, history: open }));
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                  <span>Monthly history across countries</span>
                  <span className="flex items-center gap-2">
                    {hasProfileSectionContent(profileQuery.data?.profile ?? emptyProfileFor(period), "history") && (
                      <span className="text-[10px] font-medium text-emerald-700">On file</span>
                    )}
                    <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  </span>
                </summary>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Add one row per month and source. Keep the original country and ISO currency code; GBP, USD and NGN can be converted with the existing approved rate rules.</p>
                  </div>
                  <button type="button" onClick={addHistoryEntry} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50">Add a month</button>
                </div>
                {profile.financialHistory.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">No monthly history entries yet. Your current profile amounts can still contribute as self-declared data.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {profile.financialHistory.map((entry, index) => (
                      <fieldset key={entry.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <legend className="px-1 text-xs font-semibold text-slate-700">History entry {index + 1}</legend>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                           <label className="space-y-1 text-xs font-medium text-slate-700">Month<input type="month" min={period === "post_arrival" ? profileQuery.data?.arrivalDate?.slice(0, 7) : undefined} value={entry.month} onChange={(event) => updateHistoryEntry(entry.id, { month: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm" /></label>
                          <label className="space-y-1 text-xs font-medium text-slate-700">Source label<input maxLength={100} value={entry.label} onChange={(event) => updateHistoryEntry(entry.id, { label: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm" /></label>
                            <CountrySelectField
                              id={`passport-history-country-${period}-${entry.id}`}
                              label="Country"
                              value={entry.countryCode}
                              onChange={(countryCode) => updateHistoryEntry(entry.id, { countryCode })}
                              required
                              className="block text-xs font-medium text-slate-700"
                              selectClassName="mt-1 block min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800"
                              hint=""
                            />
                           <CurrencyCodeField
                             id={`passport-history-currency-${period}-${entry.id}`}
                             label="Currency"
                             value={entry.currencyCode}
                             options={currencyOptionsQuery.data?.currencies ?? []}
                             onChange={(currencyCode) => updateHistoryEntry(entry.id, { currencyCode })}
                             required
                             className="block text-xs font-medium text-slate-700"
                             inputClassName="mt-1 block min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800"
                           />
                          <label className="space-y-1 text-xs font-medium text-slate-700">Income amount<input inputMode="decimal" value={entry.incomeAmount} onChange={(event) => updateHistoryEntry(entry.id, { incomeAmount: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm" /></label>
                          <label className="space-y-1 text-xs font-medium text-slate-700">Frequency<select value={entry.incomeFrequency} onChange={(event) => updateHistoryEntry(entry.id, { incomeFrequency: event.target.value as FinancialHistoryEntry["incomeFrequency"] })} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm"><option value="">Not supplied</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="annual">Annual</option><option value="variable">Variable monthly</option></select></label>
                          <label className="space-y-1 text-xs font-medium text-slate-700">Savings balance<input inputMode="decimal" value={entry.savingsAmount} onChange={(event) => updateHistoryEntry(entry.id, { savingsAmount: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm" /></label>
                          <label className="space-y-1 text-xs font-medium text-slate-700">Savings source<input maxLength={100} value={entry.savingsLabel} onChange={(event) => updateHistoryEntry(entry.id, { savingsLabel: event.target.value })} placeholder="Optional" className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm" /></label>
                          <label className="space-y-1 text-xs font-medium text-slate-700">Total monthly expenses<input inputMode="decimal" value={entry.expensesAmount} onChange={(event) => updateHistoryEntry(entry.id, { expensesAmount: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm" /></label>
                          <label className="space-y-1 text-xs font-medium text-slate-700">Income category<select value={entry.incomeCategory} onChange={(event) => updateHistoryEntry(entry.id, { incomeCategory: event.target.value as FinancialHistoryEntry["incomeCategory"] })} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm"><option value="salary">Salary</option><option value="contract">Contract</option><option value="business">Business</option><option value="family_support">Family support</option><option value="other">Other</option></select></label>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                            <label className="flex items-center gap-2"><input type="checkbox" checked={entry.recurring} onChange={(event) => updateHistoryEntry(entry.id, { recurring: event.target.checked })} />Recurring income</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={entry.variable} onChange={(event) => updateHistoryEntry(entry.id, { variable: event.target.checked })} />Variable income</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={entry.completeCashFlow} onChange={(event) => updateHistoryEntry(entry.id, { completeCashFlow: event.target.checked })} />All monthly spending included</label>
                          </div>
                          <button type="button" onClick={() => removeHistoryEntry(entry.id)} className="rounded-md px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50">Remove row</button>
                        </div>
                      </fieldset>
                    ))}
                  </div>
                )}
              </details>
              <details className="rounded-xl border border-slate-200 bg-white p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                  <span>Financial history or context <span className="font-normal text-slate-500">Optional</span></span>
                  <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </summary>
                <textarea maxLength={2000} rows={3} value={profile.financialHistorySummary} onChange={(event) => setProfile({ ...profile, financialHistorySummary: event.target.value })} placeholder="Add relevant context about your financial history. Do not include passwords, PINs, or full account numbers." className="mt-3 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
              </details>
              {profileDraftStatus !== "idle" && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                    profileDraftStatus === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : "border-indigo-100 bg-indigo-50 text-indigo-800"
                  }`}
                >
                  {profileDraftStatus === "pending" && <>Saving your unfinished changes shortly…</>}
                  {profileDraftStatus === "saving" && <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving a private draft…</>}
                  {profileDraftStatus === "saved" && <><CheckCircle2 className="h-3.5 w-3.5" />Draft saved privately. It will not affect your Score until you save these details.</>}
                  {profileDraftStatus === "error" && <>
                    <AlertCircle className="h-3.5 w-3.5" />
                    Draft could not be saved. Your confirmed profile is unchanged.
                    <button type="button" onClick={() => void queueProfileDraft(structuredClone(profile))} className="font-semibold underline underline-offset-2">Retry</button>
                  </>}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saveProfile.isPending || clearProfile.isPending} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                  {saveProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {onSaved ? "Save and close" : "Save details"}
                </button>
                {hasSavedProfileDraft && (
                  <button type="button" disabled={discardProfileDraft.isPending || saveProfile.isPending || clearProfile.isPending} onClick={() => {
                    if (window.confirm("Discard your unfinished draft? Your saved profile will not be changed.")) discardProfileDraft.mutate();
                  }} className="rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-medium text-indigo-800 hover:bg-indigo-50 disabled:opacity-50">
                    {discardProfileDraft.isPending ? "Discarding…" : "Discard draft"}
                  </button>
                )}
                {profileQuery.data?.profile && (
                  <button type="button" disabled={clearProfile.isPending || saveProfile.isPending || discardProfileDraft.isPending} onClick={() => {
                    const draftCopy = hasSavedProfileDraft ? " and unfinished draft" : "";
                    if (window.confirm(`Remove your saved financial profile details${draftCopy}? This does not remove uploaded documents.`)) clearProfile.mutate();
                  }} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50">
                    Clear profile
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </div>
      )}

      {view !== "profile" && (
      <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <details
          open={documentUploadOpen}
          onToggle={(event) => setDocumentUploadOpen(event.currentTarget.open)}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          aria-labelledby={`evidence-upload-heading-${period}`}
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <span>
              <span id={`evidence-upload-heading-${period}`} className="block text-sm font-bold text-slate-900">Add a supporting document</span>
              <span className="mt-1 block text-sm leading-6 text-slate-500">PDF and CSV only, up to 5 MB. Files and extracted text are encrypted before they are saved.</span>
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-indigo-700">
              {(documentsQuery.data?.submissions.length ?? 0) > 0
                ? `${documentsQuery.data!.submissions.length} on file`
                : "Start here"}
              <ChevronDown className={`h-4 w-4 transition-transform ${documentUploadOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </span>
          </summary>
          <div className="mt-4 space-y-3">
            <label className="block space-y-1 text-xs font-medium text-slate-700">
              Document type
              <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                {DOCUMENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-medium text-slate-700">
              Label
              <input maxLength={120} value={documentLabel} onChange={(event) => setDocumentLabel(event.target.value)} placeholder="e.g. October payslip" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <CountrySelectField
                id={`passport-document-country-${period}`}
                label="Country"
                value={documentCountryCode}
                onChange={setDocumentCountryCode}
                required
                className="block space-y-1 text-xs font-medium text-slate-700"
                selectClassName="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              />
              <CurrencyCodeField
                id={`passport-document-currency-${period}`}
                label="Document currency"
                value={documentCurrencyCode}
                options={currencyOptionsQuery.data?.currencies ?? []}
                onChange={setDocumentCurrencyCode}
                required
                className="block text-xs font-medium text-slate-700"
                inputClassName="mt-1 block min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800"
              />
            </div>
            <p className="text-xs leading-5 text-slate-500">The document currency is metadata you confirm. The system detects explicit currency codes and names in readable text; ambiguous symbols such as “$” are shown as candidates, not guessed.</p>
            <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center hover:bg-blue-50">
              <Upload className="h-5 w-5 text-blue-700" aria-hidden="true" />
              <span className="mt-2 text-sm font-semibold text-slate-700">{documentFile?.name || "Choose a PDF or CSV"}</span>
              <span className="mt-1 text-xs text-slate-500">{documentFile ? `${(documentFile.size / 1024 / 1024).toFixed(2)} MB` : "Maximum 5 MB"}</span>
              <input
                type="file"
                accept=".pdf,.csv,application/pdf,text/csv"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file && file.size > 5 * 1024 * 1024) {
                    toast({ title: "File too large", description: "Choose a PDF or CSV file no larger than 5 MB.", variant: "destructive" });
                    event.target.value = "";
                    return;
                  }
                  setDocumentFile(file);
                }}
              />
            </label>
            <button type="button" disabled={!documentFile || upload.isPending} onClick={() => upload.mutate()} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload privately
            </button>
            <p className="text-xs leading-5 text-slate-500">Only upload records relevant to your financial profile. Never upload passwords, PINs, or full payment-card details.</p>
          </div>
        </details>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby={`evidence-history-heading-${period}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 id={`evidence-history-heading-${period}`} className="text-sm font-bold text-slate-900">Documents and review history</h3>
              <p className="mt-1 text-xs text-slate-500">An upload is not verification. Cush will update the status after review.</p>
            </div>
            <span className="text-xs text-slate-500">{documentsQuery.data?.submissions.length ?? 0} document(s)</span>
          </div>
          {documentsQuery.isLoading ? <p className="mt-4 text-sm text-slate-500">Loading documents…</p> :
            documentsQuery.error ? <p className="mt-4 text-sm text-rose-700">Documents could not be loaded.</p> :
              !documentsQuery.data?.submissions.length ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                  <FileText className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium text-slate-700">No documents yet</p>
                  <p className="mt-1 text-xs text-slate-500">Your uploads and review updates will appear here.</p>
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {documentsQuery.data.submissions.map((item) => (
                    <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button type="button" onClick={() => setSelectedId(item.id)} className="min-w-0 text-left">
                          <span className="block truncate text-sm font-semibold text-slate-800">{item.label}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{item.fileName} · {item.countryCode} / {item.currencyCode}</span>
                        </button>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(item.reviewStatus)}`}>{readableStatus(item.reviewStatus)}</span>
                          <button type="button" aria-label={`Download ${item.fileName}`} onClick={() => void downloadFile(item.id, item.fileName)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                            <Download className="h-4 w-4" />
                          </button>
                          {["draft", "additional_information_required", "rejected"].includes(item.reviewStatus) && (
                            <button type="button" aria-label={`Delete ${item.fileName}`} disabled={deleteDocument.isPending} onClick={() => {
                              if (window.confirm(`Permanently remove ${item.fileName}?`)) deleteDocument.mutate(item.id);
                            }} className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          {selectedId !== null && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              {detailQuery.isLoading ? <p className="text-sm text-slate-500">Loading extracted draft…</p> :
                detailQuery.error ? <p className="text-sm text-rose-700">The draft could not be opened.</p> :
                  detailQuery.data && (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{detailQuery.data.submission.label}</p>
                          <p className="mt-1 text-xs text-slate-500">Extracted text is a draft; check it against your document before submitting.</p>
                        </div>
                        <button type="button" onClick={() => setSelectedId(null)} className="text-xs font-medium text-slate-500 hover:text-slate-900">Close</button>
                      </div>
                      {!detailQuery.data.extractedDraft && (
                        <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                          <AlertCircle className="h-4 w-4 shrink-0" /> No text was extracted. This can happen with scanned PDFs; add a concise summary or correction below.
                        </p>
                      )}
                      <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <p className="font-semibold text-slate-800">
                          Detected currency codes: {detailQuery.data.currencyDetection.detectedCurrencyCodes.length
                            ? detailQuery.data.currencyDetection.detectedCurrencyCodes.join(", ")
                            : "none"}
                        </p>
                        {detailQuery.data.currencyDetection.ambiguousSymbols.map(({ symbol, candidates }) => (
                          <p key={symbol} className="text-amber-800">
                            The symbol “{symbol}” could mean {candidates.join(", ")}. Confirm the document’s currency below.
                          </p>
                        ))}
                        <CurrencyCodeField
                          id={`passport-confirm-document-currency-${selectedId}`}
                          label="Confirm this document’s currency"
                          value={correctedCurrencyCode}
                          options={currencyOptionsQuery.data?.currencies ?? []}
                          onChange={setCorrectedCurrencyCode}
                          required
                          disabled={!canEditDraft}
                          className="block text-xs font-medium text-slate-700"
                          inputClassName="mt-1 block min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 disabled:bg-slate-50"
                        />
                      </div>
                      <label className="mt-3 block space-y-1 text-xs font-medium text-slate-700">
                        Review or correct the extracted draft
                        <textarea
                          maxLength={25_000}
                          rows={7}
                          value={correctedDraft}
                          onChange={(event) => setCorrectedDraft(event.target.value)}
                          readOnly={!canEditDraft}
                          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs leading-5 read-only:bg-slate-50"
                        />
                      </label>
                      {extractedFacts.length > 0 ? (
                        <section className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/70 p-3" aria-label="Extracted financial details">
                          <h4 className="text-xs font-semibold text-indigo-950">Financial details found to review</h4>
                          <p className="mt-1 text-[11px] leading-5 text-indigo-900">
                            These are suggestions, not verified facts. Check that the amounts are not already included in a connected account or another saved row, then add and save them before they can affect Score.
                          </p>
                          <ul className="mt-2 space-y-2">
                            {extractedFacts.map((fact) => (
                              <li key={fact.id} className="rounded-md border border-indigo-100 bg-white/80 p-2 text-xs text-slate-700">
                                <div className="font-medium">{fact.label}</div>
                                <div className="mt-1 text-slate-600">
                                  {[
                                    fact.incomeAmount ? `Income ${correctedCurrencyCode} ${fact.incomeAmount}` : "",
                                    fact.savingsAmount ? `Savings ${correctedCurrencyCode} ${fact.savingsAmount}` : "",
                                    fact.expensesAmount ? `Expenses ${correctedCurrencyCode} ${fact.expensesAmount}` : "",
                                  ].filter(Boolean).join(" · ")}
                                </div>
                                {fact.month ? (
                                  <div className="mt-1 text-[11px] text-slate-500">Period: {fact.month}</div>
                                ) : (
                                  <label className="mt-2 block text-[11px] font-medium text-slate-600">
                                    Confirm the statement month
                                    <input
                                      type="month"
                                      value={candidateMonths[fact.id] ?? ""}
                                      onChange={(event) => setCandidateMonths((current) => ({
                                        ...current,
                                        [fact.id]: event.target.value,
                                      }))}
                                      className="mt-1 block rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
                                    />
                                  </label>
                                )}
                              </li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            onClick={addExtractedFactsToProfile}
                            className="mt-3 rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-800"
                          >
                            Add to financial details
                          </button>
                        </section>
                      ) : correctedDraft.trim() ? (
                        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-600">
                          No clear score-related figures were found. You can enter amounts in your financial profile; ambiguous or unsupported text is never scored automatically.
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={!canEditDraft || saveCorrection.isPending} onClick={() => saveCorrection.mutate()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
                          {saveCorrection.isPending ? "Saving…" : "Save corrections"}
                        </button>
                        {canEditDraft && (
                          <button type="button" disabled={submitDocument.isPending} onClick={() => submitDocument.mutate()} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                            {submitDocument.isPending ? "Submitting…" : "Submit for review"}
                          </button>
                        )}
                      </div>
                      {detailQuery.data.events.length > 0 && (
                        <div className="mt-4 border-t border-blue-100 pt-3">
                          <p className="text-xs font-semibold text-slate-700">Activity</p>
                          <ul className="mt-2 space-y-2">
                            {detailQuery.data.events.map((event, index) => (
                              <li key={`${event.eventType}-${event.createdAt}-${index}`} className="flex items-center gap-2 text-xs text-slate-600">
                                <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                                {readableStatus(event.eventType)} · {formatDate(event.createdAt)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
            </div>
          )}
          {historyQuery.data?.events.length ? (
            <details className="mt-4 rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-700">Recent account activity</summary>
              <ul className="mt-3 space-y-2">
                {historyQuery.data.events.slice(0, 8).map((event) => (
                  <li key={event.id} className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" /> {readableStatus(event.eventType)} · {formatDate(event.createdAt)}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      </div>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        Self-declared income, savings, and complete monthly cash flow may affect provisional Score components. Financial figures extracted from a document affect Score only after you add and save them in your profile. Document approval or classification can affect Confidence, but does not award Score points by itself. The new 5-point self-declared Confidence rule applies after an administrator activates it.
      </p>
      </>
      )}
    </section>
  );
}
