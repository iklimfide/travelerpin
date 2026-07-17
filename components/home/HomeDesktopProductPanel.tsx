"use client";

import { Link } from "@/lib/i18n/navigation";
import { HomeBelowFoldSections } from "@/components/home/HomeBelowFoldSections";
import { BRAND } from "@/lib/constants";
import { DEMO_PERSONA } from "@/lib/data/demo-persona";
import { getDemoLatestPinned } from "@/lib/data/demo-latest-pinned";
import { useTranslateHome } from "@/lib/i18n/client-messages";
import { profileAllPath, profilePath } from "@/lib/seo/site";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";

type HomeDesktopProductPanelProps = {
  countries: number;
  cities: number;
  worldPercent: number;
};

function DashboardStat({
  label,
  value,
  accent = false,
  href,
}: {
  label: string;
  value: string;
  accent?: boolean;
  href?: string;
}) {
  const className =
    "block rounded-[20px] border border-[#e8eef5] bg-white/90 p-5 text-center shadow-[0_8px_24px_rgba(15,23,42,0.04)] no-underline transition hover:-translate-y-px hover:border-[#bfdbfe] hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]";

  const content = (
    <>
      <p
        className={`text-[28px] font-bold leading-none tracking-tight ${
          accent ? "text-[#2563eb]" : "text-[#0f172a]"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-[14px] font-semibold leading-snug text-[#64748b]">{label}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export function HomeDesktopProductPanel({
  countries,
  cities,
  worldPercent,
}: HomeDesktopProductPanelProps) {
  const t = useTranslateHome();
  const latestPinned = getDemoLatestPinned();
  const demoAllHref = profileAllPath(DEMO_PERSONA.username);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-[#e2e8f0]/90 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.10)]">
        <div className="flex items-center gap-3 border-b border-[#eef2f7] bg-[linear-gradient(180deg,#fafbfd_0%,#f4f7fb_100%)] px-5 py-3.5">
          <div className="flex shrink-0 gap-2" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="mx-auto flex min-w-0 max-w-[280px] flex-1 items-center justify-center rounded-[10px] bg-white px-4 py-2 text-[13px] font-medium text-[#64748b] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-[#e2e8f0]">
            {BRAND.domain}
          </div>
          <div className="w-[52px] shrink-0" aria-hidden />
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_42%)] px-8 pb-8 pt-8 text-center xl:px-10 xl:pb-10 xl:pt-10">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#bfdbfe] bg-[#dbeafe] px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#2563eb]">
            {BRAND.name}
          </p>

          <h2 className="w-full max-w-none text-[clamp(26px,3.2vw,44px)] font-bold leading-[1.05] tracking-[-0.04em] text-[#071126]">
            {t("desktopPanelTitle")}
          </h2>

          <p className="mt-4 w-full max-w-none text-[18px] leading-relaxed text-[#64748b]">
            {t("desktopPanelSubtitle")}
          </p>

          <div className="mx-auto mt-8 grid max-w-[520px] grid-cols-2 gap-4">
            <DashboardStat
              href={demoAllHref}
              value={String(countries)}
              label={t("desktopPanelCountriesPinned")}
            />
            <DashboardStat
              href={demoAllHref}
              value={String(cities)}
              label={t("desktopPanelCitiesPinned")}
            />
            <DashboardStat
              value={`${worldPercent}%`}
              label={t("desktopPanelWorldExplored")}
              accent
            />
            <div className="rounded-[20px] border border-[#e8eef5] bg-white/90 p-5 text-center shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#94a3b8]">
                {t("desktopPanelLatestLabel")}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2.5">
                {latestPinned.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#dbeafe] bg-[#f8fbff] px-3 py-1.5 text-[13px] font-semibold text-[#334155] no-underline"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={countryCodeToFlagUrl(item.countryCode)}
                      alt=""
                      width={18}
                      height={14}
                      className="h-[14px] w-[18px] rounded-sm object-cover"
                    />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/register"
              className="home-cta-primary inline-flex items-center justify-center rounded-full px-[22px] py-[13px] text-[15px] font-extrabold shadow-[0_12px_26px_rgba(37,99,235,0.28)] transition hover:-translate-y-px"
            >
              {t("heroCtaPrimary")}
            </Link>
            <Link
              href={profilePath(DEMO_PERSONA.username)}
              className="inline-flex items-center justify-center rounded-full border border-[#d8e1ef] bg-white px-[22px] py-[13px] text-[15px] font-extrabold text-[#2563eb] transition hover:-translate-y-px hover:shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
            >
              {t("heroCtaSecondary")}
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-[#64748b]">
            <span className="inline-flex items-center gap-1.5">
              <b className="text-[15px] text-[#10b981]">✓</b> {t("heroPointFree")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <b className="text-[15px] text-[#10b981]">✓</b> {t("heroPointPlaces")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <b className="text-[15px] text-[#10b981]">✓</b> {t("heroPointShare")}
            </span>
          </div>

          <div className="mt-8 flex flex-col items-center gap-5 border-t border-[#eef2f7] pt-8">
            <HomeBelowFoldSections
              compact
              name={DEMO_PERSONA.name}
              countries={countries}
              cities={cities}
              profileHref={profilePath(DEMO_PERSONA.username)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
