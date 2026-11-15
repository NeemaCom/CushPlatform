import { Link } from "wouter";

export default function CushVerifyPublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0c1830] px-4 py-7 text-blue-100/65 sm:px-8">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4 text-xs sm:flex-row sm:items-center sm:justify-between">
        <Link href="/verify" className="font-semibold text-white" aria-label="Cush Verify home">Cush Verify</Link>
        <nav aria-label="Legal and support links" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/privacy-policy" className="transition hover:text-white">Privacy Policy</Link>
          <Link href="/terms-of-service" className="transition hover:text-white">Terms of Use</Link>
          <a href="mailto:support@we-cush.com" className="transition hover:text-white">support@we-cush.com</a>
        </nav>
        <span>© 2026 Cush Verify</span>
      </div>
    </footer>
  );
}
