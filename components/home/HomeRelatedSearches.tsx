import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  getHomeRelatedSearches,
  type RelatedSearchItem,
} from "@/lib/data/home-related-searches";
import { DEMO_PERSONA } from "@/lib/data/demo-persona";

function SearchIcon() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4 shrink-0 text-[#5f6368]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function RelatedSearchLink({ item }: { item: RelatedSearchItem }) {
  return (
    <Link
      href={item.href}
      className="flex min-h-[52px] items-center justify-between gap-3 rounded-[12px] bg-[#f1f3f4] px-4 py-3 text-left text-[15px] leading-snug text-[#202124] no-underline transition hover:bg-[#e8eaed]"
    >
      <span>
        {item.segments.map((segment, index) =>
          segment.bold ? (
            <strong key={index} className="font-semibold text-[#202124]">
              {segment.text}
            </strong>
          ) : (
            <span key={index}>{segment.text}</span>
          )
        )}
      </span>
      <SearchIcon />
    </Link>
  );
}

export async function HomeRelatedSearches({ compact = false }: { compact?: boolean }) {
  const t = await getTranslations("home.relatedSearches");
  const items = getHomeRelatedSearches(DEMO_PERSONA.username);

  return (
    <section
      className={
        compact
          ? "rounded-[20px] border border-[#e8eaed] bg-white px-4 py-5"
          : "rounded-[28px] border border-[#e8eaed] bg-white px-5 py-8 sm:px-8 sm:py-10"
      }
      aria-labelledby="home-related-searches-title"
    >
      <h2
        id="home-related-searches-title"
        className={
          compact
            ? "mb-4 text-[18px] font-normal tracking-tight text-[#202124]"
            : "mb-5 text-[clamp(22px,2.5vw,28px)] font-normal tracking-tight text-[#202124]"
        }
      >
        {t("title")}
      </h2>
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
        {items.map((item) => (
          <li key={item.segments.map((segment) => segment.text).join("")}>
            <RelatedSearchLink item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
