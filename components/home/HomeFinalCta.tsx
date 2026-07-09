"use client";

import Link from "next/link";
import { translateHome } from "@/lib/i18n/client-messages";

export function HomeFinalCta({ compact = false }: { compact?: boolean }) {
  const t = translateHome;

  return (
    <section
      className={
        compact
          ? "on-dark-surface flex w-full flex-col items-center gap-4 rounded-[20px] bg-[linear-gradient(135deg,#0b1220,#111827)] px-5 py-5 text-center shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
          : "on-dark-surface flex flex-col items-start justify-between gap-6 rounded-[32px] bg-[radial-gradient(circle_at_18%_20%,rgba(37,99,235,0.34),transparent_30%),linear-gradient(135deg,#0b1220,#111827)] px-[38px] py-[38px] shadow-[0_24px_60px_rgba(15,23,42,0.20)] max-sm:px-[22px] max-sm:py-7"
      }
    >
      <div>
        <h2
          className={
            compact
              ? "mb-1.5 text-[20px] font-bold tracking-tight"
              : "mb-2 text-[32px] font-bold tracking-tight max-sm:text-[27px]"
          }
        >
          {t("finalCtaTitle")}
        </h2>
        <p className={`text-muted-on-dark m-0 leading-relaxed ${compact ? "text-[14px]" : "max-w-[650px]"}`}>
          {t("finalCtaBody")}
        </p>
      </div>
      <Link
        href="/register"
        className={
          compact
            ? "inline-flex w-full max-w-[280px] items-center justify-center rounded-full border border-[#d8e1ef] bg-white px-4 py-2.5 text-[13px] font-bold text-[#2563eb]"
            : "inline-flex w-full min-w-[190px] items-center justify-center rounded-full border border-[#d8e1ef] bg-white px-[22px] py-[13px] text-[15px] font-extrabold text-[#2563eb] transition hover:-translate-y-px hover:shadow-[0_10px_22px_rgba(15,23,42,0.08)] sm:w-auto"
        }
      >
        {t("heroCtaPrimary")}
      </Link>
    </section>
  );
}
