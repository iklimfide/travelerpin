import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./config";

/**
 * Locale routing for the App Router.
 * EN is default (no prefix). Optional locales use `/tr`, `/es`, …
 * `localeDetection: false` keeps EN as the entry default — no Accept-Language redirects.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false,
});
