import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicProfilePath, isProfileShapedPath, stripLocalePrefix } from "@/lib/i18n/pathname";
import { isPlausibleProfileUsername } from "@/lib/utils/username";
import { routing } from "@/lib/i18n/routing";
import { fetchWithTimeout } from "@/lib/supabase/fetch";
import { updateSession } from "@/lib/supabase/middleware";
import { hasSupabaseAuthCookie } from "@/lib/supabase/session-cookie";

const handleI18nRouting = createMiddleware(routing);

/**
 * Resolve the logged-in user's profile path for home requests.
 *
 * The home page's server-side `redirect()` fires after the loading shell has
 * been flushed (because of `app/[locale]/loading.tsx`), so Next.js falls back
 * to a 200 + `<meta http-equiv="refresh" content="1;url=…">` page. In dev this
 * caused visible reload loops on `/tr`. Redirecting here produces a real 307
 * before anything streams.
 */
async function getLoggedInHomeRedirectPath(
  request: NextRequest
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  if (!hasSupabaseAuthCookie(request.cookies)) return null;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Read-only here; updateSession handles cookie refresh.
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, banned_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.username || profile.banned_at) return null;
    return `/${profile.username.toLowerCase()}`;
  } catch {
    // Supabase slow/unreachable — fall through to the normal home render.
    return null;
  }
}

function getLocalePrefixedPath(pathname: string): {
  locale: (typeof routing.locales)[number] | null;
  barePath: string;
} {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return {
        locale,
        barePath: pathname.slice(locale.length + 1) || "/",
      };
    }
  }
  return { locale: null, barePath: pathname };
}

function getPreferredLocale(
  request: NextRequest
): (typeof routing.locales)[number] {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (
    cookieLocale &&
    routing.locales.includes(cookieLocale as (typeof routing.locales)[number])
  ) {
    return cookieLocale as (typeof routing.locales)[number];
  }

  const acceptedLocales = (request.headers.get("accept-language") ?? "")
    .split(",")
    .map((entry, index) => {
      const [tag, ...parameters] = entry.trim().toLowerCase().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().startsWith("q=")
      );
      const quality = qualityParameter
        ? Number.parseFloat(qualityParameter.trim().slice(2))
        : 1;
      return {
        locale: tag.split("-")[0],
        quality: Number.isFinite(quality) ? quality : 0,
        index,
      };
    })
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  const acceptedLocale = acceptedLocales.find((entry) =>
    routing.locales.includes(entry.locale as (typeof routing.locales)[number])
  )?.locale;

  return acceptedLocale
    ? (acceptedLocale as (typeof routing.locales)[number])
    : routing.defaultLocale;
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
  const profilePath = getLocalePrefixedPath(pathname);
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

  // Old blog slugs, bots, and malformed usernames — 404 before RSC + Supabase.
  if (isProfileShapedPath(barePath)) {
    const username = barePath.split("/").filter(Boolean)[0] ?? "";
    if (!isPlausibleProfileUsername(username)) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  if (profilePath.locale && isPublicProfilePath(profilePath.barePath)) {
    const url = request.nextUrl.clone();
    url.pathname = profilePath.barePath;
    const response = NextResponse.redirect(url, 301);
    response.cookies.set("NEXT_LOCALE", profilePath.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return updateSession(request, response);
  }

  if (!profilePath.locale && isPublicProfilePath(pathname)) {
    const locale = getPreferredLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-next-intl-locale", locale);
    const response = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
    return updateSession(request, response);
  }

  // Logged-in users never see the marketing home — send them straight to
  // their profile with a real 307 (avoids the streamed meta-refresh redirect).
  if (barePath === "/" && (request.method === "GET" || request.method === "HEAD")) {
    const profileRedirectPath = await getLoggedInHomeRedirectPath(request);
    if (profileRedirectPath) {
      const url = request.nextUrl.clone();
      url.pathname = profileRedirectPath;
      url.search = "";
      return updateSession(request, NextResponse.redirect(url));
    }
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
