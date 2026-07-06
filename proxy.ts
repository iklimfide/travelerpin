import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip session refresh for static assets, OG image routes, and public
     * media proxies — they never need auth cookies and are high-traffic.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/og-asset|api/hub-photo|api/instagram/preview|api/cities/tourist|api/parks/tourist|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
