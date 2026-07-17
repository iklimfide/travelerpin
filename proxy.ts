import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const handleI18nRouting = createMiddleware(routing);

function stripLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1) || "/";
    }
  }
  return pathname;
}

function shouldSkipI18n(pathname: string): boolean {
  const bare = stripLocalePrefix(pathname);
  return (
    bare.startsWith("/api") ||
    bare.startsWith("/auth") ||
    bare.startsWith("/kamikaze")
  );
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const barePath = stripLocalePrefix(pathname);
  const code = request.nextUrl.searchParams.get("code");
  if (code && barePath !== "/auth/callback") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  // Admin panel lives outside [locale] — /tr/kamikaze would 404 without this.
  if (barePath.startsWith("/kamikaze") && pathname !== barePath) {
    const url = request.nextUrl.clone();
    url.pathname = barePath;
    return NextResponse.redirect(url, 301);
  }

  if (shouldSkipI18n(pathname)) {
    return updateSession(request);
  }

  // Isolate: return next-intl response directly (preserve rewrite + locale header).
  const i18nResponse = handleI18nRouting(request);

  // Still refresh auth cookies onto the same response object when needed.
  return updateSession(request, i18nResponse);
}

export const config = {
  matcher: [
    "/",
    "/(tr|en)/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
