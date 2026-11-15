import { Link } from "wouter";

type CurrentPage = "home" | "pricing" | "how-it-works";

const desktopLinkClass = "text-[13px] font-medium text-blue-100/75 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300";

function BetaBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/20 bg-blue-200/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-blue-100">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
      Beta
    </span>
  );
}

export default function CushVerifyPublicNav({ currentPage }: { currentPage: CurrentPage }) {
  return (
    <header className="relative z-10 border-b border-white/10 bg-[#0c1830] text-white">
      <div className="mx-auto flex min-h-[68px] max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-12">
        <Link href="/verify" className="group flex min-w-0 items-center gap-3" aria-label="Cush Verify home">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#3475e7] font-serif text-[22px] leading-none text-white transition-transform group-hover:-rotate-6">c</span>
          <span className="truncate text-[15px] font-semibold tracking-[-0.03em] text-white">Cush Verify</span>
        </Link>
        <nav aria-label="Cush Verify navigation" className="hidden items-center gap-7 md:flex">
          {currentPage === "home" && <a href="/verify#approach" className={desktopLinkClass}>The approach</a>}
          <Link href="/verify/how-it-works" aria-current={currentPage === "how-it-works" ? "page" : undefined} className={desktopLinkClass}>How it works</Link>
          <Link href="/verify/pricing" aria-current={currentPage === "pricing" ? "page" : undefined} className={desktopLinkClass}>Pricing</Link>
          <a href="/verify#use-cases" className={desktopLinkClass}>For institutions</a>
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline-flex"><BetaBadge /></span>
          <Link href="/verify/login" className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/20 px-3 text-xs font-semibold text-blue-50 transition hover:border-blue-200 hover:bg-white/5 sm:px-4">
            Institutional sign in
          </Link>
        </div>
      </div>
      <nav aria-label="Cush Verify mobile navigation" className={`grid border-t border-white/10 px-2 py-1.5 md:hidden ${currentPage === "home" ? "grid-cols-4" : "grid-cols-3"}`}>
        {currentPage === "home" && <a href="/verify#approach" className="rounded-md px-1 py-2 text-center text-xs font-semibold text-blue-100/80 hover:bg-white/5 hover:text-white">Approach</a>}
        <Link href="/verify/how-it-works" aria-current={currentPage === "how-it-works" ? "page" : undefined} className="rounded-md px-1 py-2 text-center text-xs font-semibold text-blue-100/80 hover:bg-white/5 hover:text-white">How it works</Link>
        <Link href="/verify/pricing" aria-current={currentPage === "pricing" ? "page" : undefined} className="rounded-md px-1 py-2 text-center text-xs font-semibold text-blue-100/80 hover:bg-white/5 hover:text-white">Pricing</Link>
        <a href="/verify#use-cases" className="rounded-md px-1 py-2 text-center text-xs font-semibold text-blue-100/80 hover:bg-white/5 hover:text-white">Institutions</a>
      </nav>
    </header>
  );
}
