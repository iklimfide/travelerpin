import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code && request.nextUrl.pathname !== "/auth/callback") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip session refresh for static assets, OG image routes, and public
     * media proxies — they never need auth cookies and are high-traffic.
     */
    "/((?!_next/static|_next/image|favicon.ico|login|register|api/og-asset|api/hub-photo|api/instagram/preview|api/cities/tourist|api/parks/tourist|api/public/cities/search|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
