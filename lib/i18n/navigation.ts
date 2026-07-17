import { createNavigation } from "next-intl/navigation";
import { getLocale } from "next-intl/server";
import { routing } from "./routing";

/** Locale-aware Next.js navigation (Link, redirect, useRouter, …). */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

/**
 * Server-side redirect that keeps the current locale prefix (`/tr/...`).
 * Prefer this over next/navigation `redirect` inside `app/[locale]`.
 */
export async function redirectTo(href: string): Promise<never> {
  const locale = await getLocale();
  return redirect({ href, locale });
}
