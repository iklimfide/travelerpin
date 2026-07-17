"use client";

import { useAppMessages } from "@/lib/i18n/client-messages";

const FEATURES = [
  { key: "map", iconBg: "bg-[#dbeafe]", icon: "🗺️" },
  { key: "remember", iconBg: "bg-[#fef3c7]", icon: "📌" },
  { key: "share", iconBg: "bg-[#d1fae5]", icon: "🔗" },
] as const;

const STEP_STYLES = [
  "bg-[#dbeafe] text-[#2563eb]",
  "bg-[#ffedd5] text-[#c2410c]",
  "bg-[#d1fae5] text-[#047857]",
] as const;

export function HomeFeaturesClient({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { home: homeMessages } = useAppMessages();
  const steps = [
    homeMessages.steps.signUp,
    homeMessages.steps.addPins,
    homeMessages.steps.shareLink,
  ] as const;

  return (
    <section
      className={compact ? [className, "w-full"].filter(Boolean).join(" ") : className}
      aria-labelledby="home-features-title"
    >
      <div className={compact ? "mb-4 text-center" : "mx-auto mb-[26px] max-w-[700px] text-center"}>
        <h2
          id="home-features-title"
          className={
            compact
              ? "mb-1.5 text-[20px] font-bold tracking-tight text-[#071126]"
              : "mb-2.5 text-[34px] tracking-tight text-[#071126] max-sm:text-[28px]"
          }
        >
          {homeMessages.featuresSectionTitle}
        </h2>
        <p className={`m-0 leading-relaxed text-[#64748b] ${compact ? "text-[14px]" : "text-base"}`}>
          {homeMessages.featuresSectionSubtitle}
        </p>
      </div>

      <div className={compact ? "mb-4 grid grid-cols-1 gap-3" : "mx-auto mb-11 grid max-w-2xl grid-cols-1 gap-4"}>
        {FEATURES.map((feature) => (
          <article
            key={feature.key}
            className={
              compact
                ? "rounded-[18px] border border-[#e8eef5] bg-white px-4 py-4 text-center shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
                : "rounded-[26px] border border-[#d8e1ef] bg-white px-[26px] py-[30px] text-center shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
            }
          >
            <div
              className={`${compact ? "mx-auto mb-2.5 grid" : "mx-auto mb-[17px] grid"} h-[54px] w-[54px] place-items-center rounded-[18px] text-[25px] ${feature.iconBg}`}
            >
              <span aria-hidden>{feature.icon}</span>
            </div>
            <h3 className={`font-bold tracking-tight text-[#0f172a] ${compact ? "mb-1 text-[15px]" : "mb-2.5 text-xl"}`}>
              {homeMessages.features[feature.key].title}
            </h3>
            <p className={`m-0 leading-relaxed text-[#64748b] ${compact ? "text-[13px]" : "text-[15px]"}`}>
              {homeMessages.features[feature.key].description}
            </p>
          </article>
        ))}
      </div>

      <div
        className={
          compact
            ? "flex flex-wrap justify-center gap-2.5 text-[12px] font-bold text-[#64748b]"
            : "mb-[52px] flex flex-wrap justify-center gap-3.5 text-sm font-bold text-[#64748b]"
        }
        aria-label="How it works"
      >
        {steps.map((label, index) => (
          <div key={label} className="inline-flex items-center gap-2">
            <span
              className={`grid h-[25px] w-[25px] place-items-center rounded-full text-[13px] ${STEP_STYLES[index]}`}
            >
              {index + 1}
            </span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
