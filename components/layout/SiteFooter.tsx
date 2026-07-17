"use client";

import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { footerMessages } from "@/lib/i18n/client-messages";

const FOOTER_LINKS = [
  { href: "/terms", label: footerMessages.terms },
  { href: "/policy", label: footerMessages.privacy },
  { href: "/imprint", label: footerMessages.imprint },
  { href: "/contact", label: footerMessages.contact },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer border-t border-[#e2e8f0] bg-[#f8fafc] px-3 sm:px-6 dark:border-[#1e293b] dark:bg-[#020617]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-4 text-center lg:max-w-[1400px] xl:max-w-[1520px]">
        <nav aria-label="Legal and contact">
          <ul className="flex flex-nowrap items-center justify-center gap-x-2.5 sm:gap-x-5">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  className="whitespace-nowrap text-[0.6875rem] font-medium text-[#64748b] transition-colors hover:text-[#2563eb] sm:text-sm dark:text-[#94a3b8] dark:hover:text-[#60a5fa]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-xs text-[#94a3b8]">
          © {year} {BRAND.name}
        </p>
      </div>
    </footer>
  );
}
