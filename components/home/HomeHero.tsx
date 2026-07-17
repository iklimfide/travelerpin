"use client";

import { Link } from "@/lib/i18n/navigation";
import { DEMO_PERSONA } from "@/lib/data/demo-persona";
import { useTranslateHome } from "@/lib/i18n/client-messages";
import { profilePath } from "@/lib/seo/site";

export function HomeHero() {
  const t = useTranslateHome();

  return (
    <div className="min-w-0 max-sm:flex max-sm:flex-col max-sm:items-center max-sm:pt-3 max-sm:text-center">
      <div className="mb-[18px] inline-flex items-center gap-2 rounded-full border border-[#bfdbfe] bg-[#dbeafe] px-[13px] py-2 text-sm font-extrabold text-[#2563eb] max-sm:hidden">
        <span aria-hidden>🌍</span>
        {t("eyebrow")}
      </div>

      <h1 className="mb-5 w-full max-w-none text-[clamp(26px,5.2vw,52px)] leading-[1.05] font-extrabold tracking-[-0.055em] text-[#071126]">
        {t("heroHeadline")}
      </h1>

      <p className="mb-7 w-full max-w-none text-[19px] leading-relaxed text-[#64748b] max-sm:mx-auto max-sm:text-center max-sm:text-[17px]">
        {t("heroDescription")}
      </p>

      <div className="mb-[22px] flex flex-wrap items-center gap-3.5 max-sm:w-full max-sm:max-w-sm max-sm:flex-col max-sm:justify-center">
        <Link
          href="/register"
          className="home-cta-primary inline-flex items-center justify-center rounded-full px-[22px] py-[13px] text-[15px] font-extrabold shadow-[0_12px_26px_rgba(37,99,235,0.28)] transition hover:-translate-y-px max-sm:w-full"
        >
          {t("heroCtaPrimary")}
        </Link>
        <Link
          href={profilePath(DEMO_PERSONA.username)}
          className="inline-flex items-center justify-center rounded-full border border-[#d8e1ef] bg-white px-[22px] py-[13px] text-[15px] font-extrabold text-[#2563eb] transition hover:-translate-y-px hover:shadow-[0_10px_22px_rgba(15,23,42,0.08)] max-sm:w-full"
        >
          {t("heroCtaSecondary")}
        </Link>
      </div>

      <div className="flex flex-wrap gap-3.5 text-sm font-semibold text-[#64748b] max-sm:justify-center max-sm:gap-x-4 max-sm:gap-y-2">
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
    </div>
  );
}
