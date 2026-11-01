import { useMemo } from "react";
import { Link } from "wouter";
import {
  BadgeCheck,
  ChevronDown,
  CircleHelp,
  FileText,
  Fingerprint,
  LogOut,
  Mail,
  Settings2,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AccountDropdownUser {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  profilePicture?: string | null;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

export interface AccountDropdownProps {
  user: AccountDropdownUser;
  onSignOut: () => void;
}

const accountLinks = [
  { label: "Personal Profile", href: "/account/profile", icon: UserRound },
  { label: "Financial Identity", href: "/account/financial-identity", icon: Fingerprint },
  { label: "My Documents", href: "/account/documents", icon: FileText },
  { label: "Verification Status", href: "/account/verification", icon: BadgeCheck },
];

const settingsLinks = [
  { label: "Connected Accounts", href: "/account/connected-accounts", icon: WalletCards },
  { label: "Security & Privacy", href: "/account/security", icon: ShieldCheck },
  { label: "Notifications & Preferences", href: "/account/preferences", icon: Settings2 },
];

const supportLinks = [
  { label: "Help & Support", href: "/support", icon: CircleHelp },
  { label: "Contact Cush", href: "/contact", icon: Mail },
];

export function AccountDropdown({ user, onSignOut }: AccountDropdownProps) {
  const fullName = [user.firstName?.trim(), user.lastName?.trim()]
    .filter((part): part is string => Boolean(part))
    .join(" ");
  const displayName = fullName && fullName.toLowerCase() !== "user"
    ? fullName
    : user.email.split("@")[0] || "Name not provided";
  const verifiedCount = Number(user.isEmailVerified === true) + Number(user.isPhoneVerified === true);
  const verificationLabel = verifiedCount === 2
    ? "Contact details verified"
    : verifiedCount === 1
      ? "Partially verified"
      : "Verification pending";

  const initials = useMemo(() => {
    const nameInitials = [user.firstName?.trim(), user.lastName?.trim()]
      .filter((part): part is string => Boolean(part))
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
    return (nameInitials || user.email.trim().charAt(0) || "?").slice(0, 2);
  }, [user.email, user.firstName, user.lastName]);

  const renderLink = (item: (typeof accountLinks)[number]) => {
    const Icon = item.icon;
    return (
      <DropdownMenuItem key={item.href} asChild>
        <Link
          href={item.href}
          className="group flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium text-[#34445b] outline-none transition-colors hover:bg-[#edf4fc] hover:text-[#174b8c] focus:bg-[#edf4fc] focus:text-[#174b8c] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4d8fd4]"
        >
          <Icon className="h-4 w-4 shrink-0 text-[#7890aa] transition-colors group-hover:text-[#2468b2]" aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${displayName}`}
          className="group flex max-w-full items-center gap-2 rounded-full border border-transparent p-1 pr-2 text-left transition-colors hover:border-[#d9e5f1] hover:bg-[#f3f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4d8fd4] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <Avatar className="h-9 w-9 border border-[#dce7f2] bg-[#e9f1fa]">
            <AvatarImage src={user.profilePicture || undefined} alt={`${displayName} profile photo`} />
            <AvatarFallback className="bg-[#e9f1fa] text-xs font-semibold tracking-wide text-[#245a94]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-40 truncate text-[13px] font-semibold leading-4 text-[#263b54]">
              {displayName}
            </span>
            <span className="block max-w-40 truncate text-[11px] leading-4 text-[#718198]">
              {user.email}
            </span>
          </span>
          <ChevronDown
            className="hidden h-3.5 w-3.5 shrink-0 text-[#8293a8] transition-transform group-data-[state=open]:rotate-180 sm:block"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={10}
        collisionPadding={12}
        className="z-50 flex w-[min(21rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-[#dce6f0] bg-[#fbfdff] p-0 text-[#263b54] shadow-[0_18px_48px_-20px_rgba(24,55,91,0.32)]"
      >
        <div className="shrink-0 bg-[linear-gradient(135deg,#f2f7fc_0%,#fbfdff_75%)] px-4 pb-3.5 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-11 w-11 shrink-0 border-2 border-white bg-[#e5eef8] shadow-sm">
              <AvatarImage src={user.profilePicture || undefined} alt={`${displayName} profile photo`} />
              <AvatarFallback className="bg-[#e5eef8] text-sm font-semibold text-[#245a94]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-[-0.01em] text-[#1d344f]">
                {displayName}
              </p>
              <p className="mt-0.5 truncate text-xs text-[#6c8098]">{user.email}</p>
            </div>
          </div>
          <div
            className={`mt-3 flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
              verifiedCount === 2
                ? "border-[#cfe4da] bg-[#f1f8f4] text-[#2e6b4d]"
                : verifiedCount === 1
                  ? "border-[#d7e4f2] bg-[#f2f7fc] text-[#395c7d]"
                  : "border-[#e6dfc8] bg-[#faf7ef] text-[#79633b]"
            }`}
            role="status"
          >
            {verifiedCount > 0 ? (
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span className="text-xs font-medium">
              {verificationLabel}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator className="my-0 bg-[#e6edf4]" />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8292a6]">
              Your Cush profile
            </DropdownMenuLabel>
            {accountLinks.map(renderLink)}
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="mx-2 my-2 w-auto bg-[#e8eef4]" />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2.5 pb-1 pt-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8292a6]">
              Account settings
            </DropdownMenuLabel>
            {settingsLinks.map(renderLink)}
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="mx-2 my-2 w-auto bg-[#e8eef4]" />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2.5 pb-1 pt-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8292a6]">
              Support
            </DropdownMenuLabel>
            {supportLinks.map(renderLink)}
          </DropdownMenuGroup>
        </div>

        <DropdownMenuSeparator className="my-0 bg-[#e6edf4]" />
        <div className="shrink-0 border-t border-[#e6edf4] bg-[#fbfdff] p-2">
          <DropdownMenuItem
            onSelect={() => onSignOut()}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-semibold text-[#8c4a4a] outline-none transition-colors hover:bg-[#fbf0ef] hover:text-[#793c3c] focus:bg-[#fbf0ef] focus:text-[#793c3c] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d99b96]"
          >
            <LogOut className="h-4 w-4 text-[#a66a67]" aria-hidden="true" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AccountDropdown;
