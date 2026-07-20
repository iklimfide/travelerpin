"use client";

import { Link } from "@/lib/i18n/navigation";
import { useAppMessages } from "@/lib/i18n/client-messages";
import {
  HOME_BEST_CITIES_LINKED,
  HOME_BEST_COUNTRIES_LINKED,
  HOME_BEST_PLACES_LINKED,
  type LinkedDestination,
} from "@/lib/data/home-best-destination-hrefs";

function TopTenCard({
  title,
  items,
  compact = false,
}: {
  title: string;
  items: readonly LinkedDestination[];
  compact?: boolean;
}) {
  const { home: homeMessages } = useAppMessages();
  return (
    <article
      className={
        compact
          ? "rounded-[18px] border border-[#e8eef5] bg-white px-4 py-4 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
          : "rounded-[26px] border border-[#d8e1ef] bg-white px-6 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
      }
    >
      <h3 className={`font-bold tracking-tight text-[#071126] ${compact ? "mb-3 text-[15px]" : "mb-5 text-xl"}`}>
        {title}
      </h3>
      <ol className={`m-0 flex flex-col p-0 ${compact ? "gap-2" : "gap-3.5"}`}>
        {items.map((item, index) => (
          <li
            key={item.name}
            className={`flex items-center gap-3 text-[#0f172a] ${compact ? "text-[13px]" : "text-[15px]"}`}
          >
            <span
              className={`flex shrink-0 items-center justify-center rounded-full bg-[#dbeafe] font-bold text-[#2563eb] ${
                compact ? "h-6 w-6 text-xs" : "h-7 w-7 text-sm"
              }`}
            >
              {index + 1}
            </span>
            {item.href ? (
              <Link
                href={item.href}
                prefetch={false}
                className="font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8] hover:underline"
              >
                {item.name}
              </Link>
            ) : (
              <span className="font-semibold">{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </article>
  );
}

export function HomeBestDestinations({
  compact = false,
  desktop = false,
}: {
  compact?: boolean;
  desktop?: boolean;
}) {
  const { home: homeMessages } = useAppMessages();
  const t = homeMessages.bestDestinations;

  if (desktop) {
    return (
      <section
        className="w-full rounded-[32px] bg-gradient-to-b from-[#eff6ff] to-[#dbeafe] px-8 py-10 text-center xl:px-10 xl:py-12"
        aria-labelledby="home-best-destinations-title"
      >
        <p className="mb-2 text-sm font-extrabold text-[#2563eb]">
          <span aria-hidden>✨ </span>
          {t.eyebrow}
        </p>
        <h2
          id="home-best-destinations-title"
          className="mb-3 text-[clamp(28px,3vw,40px)] font-extrabold tracking-tight text-[#071126]"
        >
          {t.title}
        </h2>
        <p className="mx-auto m-0 max-w-[720px] text-base leading-relaxed text-[#64748b]">
          {t.subtitle}
        </p>

        <div className="mt-8 grid grid-cols-3 gap-5 text-left xl:gap-6">
          <TopTenCard compact title={t.topCountries} items={HOME_BEST_COUNTRIES_LINKED} />
          <TopTenCard compact title={t.topCities} items={HOME_BEST_CITIES_LINKED} />
          <TopTenCard compact title={t.topPlaces} items={HOME_BEST_PLACES_LINKED} />
        </div>
      </section>
    );
  }

  return (
    <section
      className={
        compact
          ? "rounded-[20px] bg-gradient-to-b from-[#eff6ff] to-[#dbeafe] px-4 py-5"
          : "rounded-[32px] bg-gradient-to-b from-[#eff6ff] to-[#dbeafe] px-5 py-10 sm:px-8 sm:py-12"
      }
      aria-labelledby="home-best-destinations-title"
    >
      <div
        className={
          compact
            ? "flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,220px)_1fr] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,240px)_1fr]"
            : "flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,320px)_1fr]"
        }
      >
        <div className={compact ? "text-left" : "text-left lg:pt-1"}>
          <p className={`font-extrabold text-[#2563eb] ${compact ? "mb-1 text-xs" : "mb-2 text-sm"}`}>
            <span aria-hidden>✨ </span>
            {t.eyebrow}
          </p>
          <h2
            id="home-best-destinations-title"
            className={
              compact
                ? "mb-2 text-[20px] font-extrabold tracking-tight text-[#071126]"
                : "mb-3 text-[clamp(28px,4vw,40px)] font-extrabold tracking-tight text-[#071126]"
            }
          >
            {t.title}
          </h2>
          <p className={`m-0 leading-relaxed text-[#64748b] ${compact ? "text-[14px]" : "text-base"}`}>
            {t.subtitle}
          </p>
        </div>

        <div className={compact ? "grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-3" : "grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5"}>
          <TopTenCard compact={compact} title={t.topCountries} items={HOME_BEST_COUNTRIES_LINKED} />
          <TopTenCard compact={compact} title={t.topCities} items={HOME_BEST_CITIES_LINKED} />
          <TopTenCard compact={compact} title={t.topPlaces} items={HOME_BEST_PLACES_LINKED} />
        </div>
      </div>
    </section>
  );
}
