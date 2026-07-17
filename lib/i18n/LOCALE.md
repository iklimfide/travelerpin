# Adding a locale (e.g. Spanish `es`)

EN is the default (no URL prefix). Optional locales use `/tr`, `/es`, …

## Checklist

1. **Config** — Add the code to `locales` in `lib/i18n/config.ts`, map it in `getIntlLocale` / `getLocaleLabel`, and move it from `upcomingLocales` to `activeLocales` when shipping.
2. **Messages** — Add `messages/{locale}.json` (copy from `en.json`, then translate). Keep key parity with `en`.
3. **Reserved usernames** — Ensure the locale code is in `lib/constants/reserved-usernames.ts`.
4. **Legal** — Add localized legal copy (`content/legal/{locale}/` or message namespaces).
5. **SEO** — Extend hreflang / `alternates.languages` / `og:locale` alternates for the new locale.
6. **Place names** — Register `i18n-iso-countries` lang JSON; add display overrides; extend city/park display catalog.
7. **Smoke** — Visit `/`, `/{locale}`, switcher in footer + settings, auth redirects keep the prefix.

## Routing

Defined in `lib/i18n/routing.ts` (`localePrefix: "as-needed"`, `localeDetection: false`).
Navigation helpers: `lib/i18n/navigation.ts` (`Link`, `useRouter`, …).
