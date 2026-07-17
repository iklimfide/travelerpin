import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { profilePath } from "@/lib/seo/site";
import type { TravelStats } from "@/types/database";

type HomeSampleCardHeaderProps = {
  name: string;
  username: string;
  avatarUrl: string | null;
  stats: TravelStats;
  isDemo?: boolean;
};

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex h-11 w-full min-w-0 flex-col items-center justify-center rounded-xl border border-[#93c5fd] bg-[#dbeafe] px-1 py-1.5 sm:h-12 sm:w-[5.5rem] sm:shrink-0">
      <strong className="text-base font-bold leading-none text-[#0f172a]">{value}</strong>
      <span className="mt-1 max-w-full truncate px-0.5 text-[8px] font-bold leading-none text-[#2563eb] sm:text-[9px]">
        {label}
      </span>
    </div>
  );
}

export async function HomeSampleCardHeader({
  name,
  username,
  avatarUrl,
  stats,
  isDemo = true,
}: HomeSampleCardHeaderProps) {
  const t = await getTranslations("common");
  const tHome = await getTranslations("home");

  const title = isDemo ? tHome("demoMapTitle", { name }) : `@${username}`;

  const parkTotal = stats.nationalParks + stats.themeParks;
  const showParks = parkTotal > 0;

  const profileHref = profilePath(username);

  return (
    <div className="flex flex-col gap-3 overflow-hidden border-b border-[#d8e1ef] bg-gradient-to-b from-white to-[#f8fbff] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        {isDemo ? (
          <Link
            href={profileHref}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-[#bfdbfe] to-[#fde68a] shadow-[0_0_0_1px_#d8e1ef] transition-shadow hover:shadow-[0_0_0_2px_#93c5fd]"
            aria-label={`${name}'s profile`}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xl" aria-hidden>
                👤
              </span>
            )}
          </Link>
        ) : (
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-[#bfdbfe] to-[#fde68a] shadow-[0_0_0_1px_#d8e1ef]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xl" aria-hidden>
                👤
              </span>
            )}
          </div>
        )}
        <div className="min-w-0">
          <strong className="block text-[14px] leading-snug font-bold text-[#0f172a] sm:text-[15px]">
            {isDemo ? (
              <Link href={profileHref} className="home-profile-name-link">
                {title}
              </Link>
            ) : (
              title
            )}
          </strong>
          <small className="mt-0.5 block text-[11px] text-[#64748b] sm:text-xs">
            {isDemo ? tHome("sampleProfileLabel") : tHome("yourMap")}
          </small>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:shrink-0 sm:items-stretch sm:gap-1.5">
        <StatPill value={stats.countries} label={t("countries")} />
        <StatPill value={stats.cities} label={t("cities")} />
        {showParks ? (
          <>
            <StatPill value={stats.nationalParks} label={t("nationalParks")} />
            <StatPill value={stats.themeParks} label={t("themeParks")} />
          </>
        ) : null}
      </div>
    </div>
  );
}
