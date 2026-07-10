"use client";

import Link from "next/link";
import { formatMessage, homeMessages, translateHome } from "@/lib/i18n/client-messages";
import { linkNameInMessage } from "@/lib/utils/link-name-in-message";

type HomeExplainerProps = {
  name: string;
  countries: number;
  cities: number;
  compact?: boolean;
  profileHref?: string;
};

export function HomeExplainer({
  name,
  countries,
  cities,
  compact = false,
  profileHref,
}: HomeExplainerProps) {
  const t = translateHome;
  const statValues = { countries, cities };

  return (
    <section
      className={
        compact
          ? "flex w-full flex-col items-center gap-4 rounded-[20px] border border-[#e8eef5] bg-[#f8fbff] px-5 py-4 text-center"
          : "mb-[54px] flex flex-col items-start justify-between gap-5 rounded-3xl border border-[#d8e1ef] bg-white px-7 py-6 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center"
      }
    >
      <div>
        <h2
          className={
            compact
              ? "mb-1 text-[17px] font-bold tracking-tight text-[#0f172a]"
              : "mb-1.5 text-xl tracking-tight text-[#0f172a]"
          }
        >
          {profileHref
            ? linkNameInMessage(homeMessages.explainerTitle, name, profileHref)
            : formatMessage(homeMessages.explainerTitle, { name })}
        </h2>
        <p className={`m-0 leading-relaxed text-[#64748b] ${compact ? "text-[14px]" : ""}`}>
          {profileHref
            ? linkNameInMessage(homeMessages.explainerBody, name, profileHref, statValues)
            : formatMessage(homeMessages.explainerBody, { name, ...statValues })}
        </p>
      </div>
      <Link
        href="/register"
        className={
          compact
            ? "home-cta-primary inline-flex w-full max-w-[280px] shrink-0 items-center justify-center rounded-full px-4 py-2.5 text-[13px] font-bold shadow-[0_8px_18px_rgba(37,99,235,0.22)] transition"
            : "home-cta-primary inline-flex w-full shrink-0 items-center justify-center rounded-full px-[22px] py-[13px] text-[15px] font-extrabold shadow-[0_12px_26px_rgba(37,99,235,0.28)] transition hover:-translate-y-px sm:w-auto"
        }
      >
        {t("cta")}
      </Link>
    </section>
  );
}
