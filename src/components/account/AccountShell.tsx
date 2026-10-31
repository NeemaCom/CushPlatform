import type { ReactNode } from "react";
import { Link } from "wouter";
import {
  BadgeCheck,
  FileText,
  Fingerprint,
  HelpCircle,
  Mail,
  Settings2,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { User } from "@/hooks/useAuth";
import AccountDropdown from "@/components/AccountDropdown";

export type AccountSection =
  | "profile"
  | "financial-identity"
  | "documents"
  | "verification"
  | "connected-accounts"
  | "security"
  | "preferences"
  | "support"
  | "contact";

const navGroups = [
  {
    label: "Your profile",
    items: [
      { id: "profile", label: "Personal Profile", icon: UserRound },
      { id: "financial-identity", label: "Financial Identity", icon: Fingerprint },
      { id: "documents", label: "My Documents", icon: FileText },
      { id: "verification", label: "Verification Status", icon: BadgeCheck },
    ],
  },
  {
    label: "Settings",
    items: [
      { id: "connected-accounts", label: "Connected Accounts", icon: WalletCards },
      { id: "security", label: "Security & Privacy", icon: ShieldCheck },
      { id: "preferences", label: "Notifications & Preferences", icon: Settings2 },
    ],
  },
  {
    label: "Support",
    items: [
      { id: "support", label: "Help & Support", icon: HelpCircle },
      { id: "contact", label: "Contact Cush", icon: Mail },
    ],
  },
] as const;

const sectionTitles: Record<AccountSection, string> = {
  profile: "Personal Profile",
  "financial-identity": "Financial Identity",
  documents: "My Documents",
  verification: "Verification Status",
  "connected-accounts": "Connected Accounts",
  security: "Security & Privacy",
  preferences: "Notifications & Preferences",
  support: "Help & Support",
  contact: "Contact Cush",
};

interface AccountShellProps {
  user: User;
  section: AccountSection;
  description: string;
  onSignOut: () => void;
  children: ReactNode;
}

export default function AccountShell({
  user,
  section,
  description,
  onSignOut,
  children,
}: AccountShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">C</span>
            <span className="text-sm font-bold tracking-tight text-slate-900">Cush Passport</span>
          </Link>
          <AccountDropdown user={user} onSignOut={onSignOut} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Account</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{sectionTitles[section]}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav aria-label="Account sections" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-3 last:mb-0">
                <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(({ id, label, icon: Icon }) => {
                    const active = section === id;
                    return <Link
                      key={id}
                      href={id === "support" || id === "contact" ? `/${id}` : `/account/${id}`}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        active
                          ? "bg-blue-50 text-blue-800"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-blue-700" : "text-slate-400"}`} aria-hidden="true" />
                      <span>{label}</span>
                    </Link>;
                  })}
                </div>
              </div>
            ))}
          </nav>

          <section aria-label={sectionTitles[section]} className="min-w-0">
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}
