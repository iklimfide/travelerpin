import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/constants";
import { shareCardMapDataUrl } from "@/lib/seo/og-map-svg";
import {
  getShareCardFonts,
  SHARE_CARD_FONT_FAMILIES,
} from "@/lib/seo/share-card-fonts";
import { getSiteUrl } from "@/lib/seo/site";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { WORLD_COUNTRY_TOTAL, worldCoveragePercent } from "@/lib/utils/profile-page";
import { getTravelerBadgeLabel } from "@/lib/utils/traveler-badge";
import type { TravelUpdateDelta } from "@/lib/utils/travel-update";
import type { TravelStats, VisitedCity } from "@/types/database";

export const TRAVEL_UPDATE_SQUARE_SIZE = { width: 1080, height: 1080 } as const;
export const TRAVEL_UPDATE_STORY_SIZE = { width: 1080, height: 1920 } as const;

export type TravelUpdateImageFormat = "square" | "story";

type BuildTravelUpdateImageOptions = {
  displayName: string;
  avatarUrl: string | null;
  delta: TravelUpdateDelta;
  visitedCountryCodes: string[];
  visitedCities: VisitedCity[];
  format: TravelUpdateImageFormat;
  bio?: string;
  residence?: string | null;
  isOwnProfile?: boolean;
};

const STORY_HERO_SUBTITLE =
  "Collect the places you've been and share how your map grows over time.";

const T = {
  white: "#ffffff",
  ink: "#0f2744",
  blue: "#2563eb",
  blueDark: "#1e40af",
  blueDeep: "#1e3a8a",
  blueSoft: "#e8f2fc",
  blueLine: "#cfe0f5",
  muted: "#5b6f88",
  violet: "#7c3aed",
  violetSoft: "#f3edff",
} as const;

const FONT = SHARE_CARD_FONT_FAMILIES;

type CardLayoutProps = {
  displayName: string;
  avatarUrl: string | null;
  delta: TravelUpdateDelta;
  mapSrc: string;
  siteUrl: string;
  bio: string;
  residence: string | null;
  isOwnProfile: boolean;
  visitedCountryCodes: string[];
};

function truncateStoryBio(text: string, maxLen = 108): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1).trimEnd()}…`;
}

function profileInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

function GlobeIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: "flex" }}
    >
      <circle cx="12" cy="12" r="9" stroke={T.blue} strokeWidth="2" />
      <path
        d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"
        stroke={T.blue}
        strokeWidth="1.5"
      />
    </svg>
  );
}

function PinLogo({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${Math.round(size * 0.22)}px`,
        background: T.white,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: `${Math.round(size * 0.34)}px`,
          height: `${Math.round(size * 0.34)}px`,
          borderRadius: "50%",
          background: T.blue,
        }}
      />
    </div>
  );
}

function WorldExploredBadge({ percent }: { percent: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 16px",
        borderRadius: "16px",
        background: T.white,
        border: `1px solid ${T.blueLine}`,
        boxShadow: "0 4px 14px rgba(37, 99, 235, 0.08)",
      }}
    >
      <GlobeIcon size={30} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontFamily: FONT.sans,
            fontSize: "28px",
            fontWeight: 700,
            color: T.blue,
            lineHeight: 1,
          }}
        >
          {percent}%
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: FONT.sans,
            fontSize: "10px",
            fontWeight: 700,
            color: T.muted,
            letterSpacing: "0.1em",
            marginTop: "3px",
          }}
        >
          WORLD EXPLORED
        </div>
      </div>
    </div>
  );
}

function ProfileHeader({
  displayName,
  avatarUrl,
  badgeLabel,
  worldPercent,
  avatarSize,
}: {
  displayName: string;
  avatarUrl: string | null;
  badgeLabel: string | null;
  worldPercent: number;
  avatarSize: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            width={avatarSize}
            height={avatarSize}
            style={{
              width: `${avatarSize}px`,
              height: `${avatarSize}px`,
              borderRadius: "50%",
              border: `3px solid ${T.blueLine}`,
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: `${avatarSize}px`,
              height: `${avatarSize}px`,
              borderRadius: "50%",
              border: `3px solid ${T.blueLine}`,
              background: T.blueSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT.sans,
              fontSize: `${Math.round(avatarSize * 0.36)}px`,
              fontWeight: 700,
              color: T.blue,
            }}
          >
            {profileInitial(displayName)}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              fontFamily: FONT.sans,
              fontSize: "30px",
              fontWeight: 700,
              color: T.ink,
              letterSpacing: "-0.02em",
            }}
          >
            {displayName}
          </div>
          {badgeLabel ? (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "999px",
                background: T.violetSoft,
                border: "1px solid #ddd6fe",
                color: T.violet,
                fontFamily: FONT.sans,
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <span style={{ display: "flex", fontSize: "12px" }}>★</span>
              {badgeLabel}
            </div>
          ) : null}
        </div>
      </div>
      <WorldExploredBadge percent={worldPercent} />
    </div>
  );
}

function HeadlineTitle({ hasUpdate, centered = false }: { hasUpdate: boolean; centered?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: centered ? "center" : "flex-start",
        gap: "10px",
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: FONT.script,
          fontSize: centered ? "42px" : "38px",
          fontWeight: 700,
          color: T.blue,
          lineHeight: 1,
        }}
      >
        My travel map
      </div>
      {hasUpdate ? (
        <>
          <div
            style={{
              display: "flex",
              fontFamily: FONT.sans,
              fontSize: centered ? "34px" : "30px",
              fontWeight: 700,
              color: T.ink,
              letterSpacing: "0.04em",
            }}
          >
            KEEPS GROWING
          </div>
          <div style={{ display: "flex", fontSize: "28px", color: T.blue }}>✈</div>
        </>
      ) : null}
    </div>
  );
}

function StatGlyph({ kind }: { kind: "globe" | "pin" | "mountain" | "park" }) {
  const color = T.blue;
  if (kind === "globe") {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ display: "flex" }}>
        <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="2" />
        <path d="M4 12h16M12 4.5a11 11 0 0 1 0 15M12 4.5a11 11 0 0 0 0 15" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === "pin") {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ display: "flex" }}>
        <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" fill={color} />
        <circle cx="12" cy="11" r="2.2" fill={T.white} />
      </svg>
    );
  }
  if (kind === "mountain") {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ display: "flex" }}>
        <path d="M4 18 9 8l4 7 3-5 4 8H4Z" fill={color} />
      </svg>
    );
  }
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ display: "flex" }}>
      <rect x="5" y="9" width="14" height="10" rx="2" fill={color} />
      <path d="M9 9V7a3 3 0 0 1 6 0v2" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function StatsRow({ delta }: { delta: TravelUpdateDelta }) {
  const stats = delta.currentStats;
  const items = [
    { value: stats.countries, label: "COUNTRIES", kind: "globe" as const },
    { value: stats.cities, label: "CITIES", kind: "pin" as const },
    { value: stats.nationalParks, label: "Natura&Parks", kind: "mountain" as const },
    { value: stats.themeParks, label: "THEME PARKS", kind: "park" as const },
  ];

  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <StatGlyph kind={item.kind} />
          <div
            style={{
              display: "flex",
              fontFamily: FONT.sans,
              fontSize: "28px",
              fontWeight: 700,
              color: T.ink,
              lineHeight: 1,
            }}
          >
            {item.value}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: FONT.sans,
              fontSize: "11px",
              fontWeight: 700,
              color: T.muted,
              letterSpacing: "0.06em",
            }}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function UpdateSection({
  delta,
  siteUrl,
  stacked = false,
}: {
  delta: TravelUpdateDelta;
  siteUrl: string;
  stacked?: boolean;
}) {
  if (!delta.hasChanges) return null;

  const countries = delta.newCountries.slice(0, 4);
  const deltas: string[] = [];
  if (delta.countriesDelta > 0) {
    deltas.push(`+${delta.countriesDelta} ${delta.countriesDelta === 1 ? "COUNTRY" : "COUNTRIES"}`);
  }
  if (delta.citiesDelta > 0) {
    deltas.push(`+${delta.citiesDelta} ${delta.citiesDelta === 1 ? "CITY" : "CITIES"}`);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: stacked ? "column" : "row",
        alignItems: stacked ? "stretch" : "center",
        justifyContent: "space-between",
        gap: "20px",
        padding: "20px 24px",
        borderRadius: "20px",
        background: T.blueSoft,
        border: `1px solid ${T.blueLine}`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
        <div
          style={{
            display: "flex",
            fontFamily: FONT.sans,
            fontSize: "12px",
            fontWeight: 700,
            color: T.blue,
            letterSpacing: "0.08em",
          }}
        >
          NEWLY ADDED SINCE LAST SHARE
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
          {deltas.map((line) => (
            <div
              key={line}
              style={{
                display: "flex",
                fontFamily: FONT.sans,
                fontSize: "26px",
                fontWeight: 700,
                color: T.blue,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>

      {countries.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            alignItems: stacked ? "flex-start" : "flex-end",
          }}
        >
          {countries.map((country) => (
            <div
              key={country.code}
              style={{ display: "flex", alignItems: "center", gap: "10px" }}
            >
              <img
                src={`${siteUrl}${countryCodeToFlagUrl(country.code)}`}
                alt=""
                width={28}
                height={20}
                style={{
                  width: "28px",
                  height: "20px",
                  borderRadius: "3px",
                  objectFit: "cover",
                }}
              />
              <div
                style={{
                  display: "flex",
                  fontFamily: FONT.sans,
                  fontSize: "18px",
                  fontWeight: 600,
                  color: T.ink,
                }}
              >
                {country.name}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LandmarkStrip() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        height: "54px",
        background: `linear-gradient(180deg, ${T.blueSoft} 0%, #c7dbf2 100%)`,
        gap: "18px",
        padding: "0 24px 0",
        overflow: "hidden",
      }}
    >
      {["🗼", "⛩", "🕌", "🏛", "🗿"].map((icon) => (
        <div
          key={icon}
          style={{
            display: "flex",
            fontSize: "28px",
            opacity: 0.55,
            filter: "grayscale(1) brightness(0.35)",
          }}
        >
          {icon}
        </div>
      ))}
    </div>
  );
}

function FooterBar({ centered = false }: { centered?: boolean }) {
  if (centered) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          height: "56px",
          padding: "0 32px",
          background: T.blueDeep,
        }}
      >
        <PinLogo size={22} />
        <div
          style={{
            display: "flex",
            fontFamily: FONT.sans,
            fontSize: "17px",
            fontWeight: 700,
            color: T.white,
          }}
        >
          {BRAND.name}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: FONT.sans,
            fontSize: "17px",
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
          }}
        >
          {BRAND.domain}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: centered ? "center" : "space-between",
        gap: centered ? "12px" : "0",
        height: "56px",
        padding: centered ? "0 32px" : "0 28px",
        background: T.blueDeep,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <PinLogo size={22} />
        <div
          style={{
            display: "flex",
            fontFamily: FONT.sans,
            fontSize: "18px",
            fontWeight: 700,
            color: T.white,
          }}
        >
          {BRAND.name}
        </div>
      </div>

      {!centered ? (
        <div
          style={{
            display: "flex",
            width: "1px",
            height: "24px",
            background: "rgba(255,255,255,0.28)",
          }}
        />
      ) : null}

      <div
        style={{
          display: "flex",
          fontFamily: FONT.sans,
          fontSize: centered ? "17px" : "18px",
          fontWeight: 600,
          color: "rgba(255,255,255,0.92)",
        }}
      >
        {BRAND.domain}
      </div>
    </div>
  );
}

function MapPreview({ mapSrc, height }: { mapSrc: string; height: number }) {
  return (
    <div
      style={{
        display: "flex",
        height: `${height}px`,
        borderRadius: "18px",
        overflow: "hidden",
        background: "#d4e8f8",
        border: `1px solid ${T.blueLine}`,
      }}
    >
      <img
        src={mapSrc}
        alt=""
        width={1080}
        height={height}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

function StoryWorldProgress({ countryCount }: { countryCount: number }) {
  const coverage = worldCoveragePercent(countryCount);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        padding: "22px 24px",
        borderRadius: "24px",
        background: "#f8fafc",
        border: `1px solid ${T.blueLine}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: FONT.sans,
            fontSize: "28px",
            fontWeight: 700,
            color: T.ink,
          }}
        >
          🌍 World explored
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: FONT.sans,
            fontSize: "40px",
            fontWeight: 800,
            color: T.blue,
            lineHeight: 1,
          }}
        >
          {coverage}%
        </div>
      </div>
      <div
        style={{
          display: "flex",
          height: "14px",
          borderRadius: "999px",
          background: "#dbeafe",
          overflow: "hidden",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: `${coverage}%`,
            height: "100%",
            background: T.blue,
            borderRadius: "999px",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: FONT.sans,
          fontSize: "24px",
          fontWeight: 600,
          color: T.muted,
        }}
      >
        {`${countryCount} of ${WORLD_COUNTRY_TOTAL} countries pinned`}
      </div>
    </div>
  );
}

function StoryStatCounters({ stats }: { stats: TravelStats }) {
  const items = [
    { value: stats.countries, label: "Country" },
    { value: stats.cities, label: "City" },
    { value: stats.nationalParks, label: "Natura&Parks" },
    { value: stats.themeParks, label: "Theme park" },
  ];

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        padding: "20px 12px",
        borderRadius: "24px",
        background: "#f8fafc",
        border: `1px solid ${T.blueLine}`,
      }}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            borderRight: index < items.length - 1 ? `1px solid #e2e8f0` : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: FONT.sans,
              fontSize: "36px",
              fontWeight: 800,
              color: T.ink,
              lineHeight: 1,
              marginBottom: "6px",
            }}
          >
            {String(item.value)}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: FONT.sans,
              fontSize: "20px",
              fontWeight: 600,
              color: "#7b8798",
              textAlign: "center",
            }}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function StoryHero({
  displayName,
  residence,
  isOwnProfile,
  hasUpdate,
}: {
  displayName: string;
  residence: string | null;
  isOwnProfile: boolean;
  hasUpdate: boolean;
}) {
  const heroTitle = isOwnProfile ? "My Travel Map" : `${displayName}'s Travel Map`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        height: "320px",
        padding: "36px 40px 28px",
        overflow: "hidden",
        color: T.white,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, #1e293b 0%, #334155 55%, #475569 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0.72) 100%)",
        }}
      />

      <div style={{ display: "flex", position: "relative", flexDirection: "column", gap: "14px" }}>
        {residence ? (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.92)",
              color: T.ink,
              fontFamily: FONT.sans,
              fontSize: "22px",
              fontWeight: 700,
            }}
          >
            <span style={{ display: "flex" }}>📍</span>
            {residence}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            fontFamily: FONT.sans,
            fontSize: "52px",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            maxWidth: "760px",
          }}
        >
          {heroTitle}
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: FONT.sans,
            fontSize: "24px",
            fontWeight: 500,
            lineHeight: 1.45,
            color: "rgba(255,255,255,0.88)",
            maxWidth: "720px",
          }}
        >
          {hasUpdate ? "✨ Your map keeps growing — share the latest version." : STORY_HERO_SUBTITLE}
        </div>
      </div>
    </div>
  );
}

function StoryIdentityCard({
  displayName,
  avatarUrl,
  bio,
  stats,
}: {
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  stats: TravelStats;
}) {
  const badgeLabel = getTravelerBadgeLabel(stats.countries);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: "-72px",
        padding: "0 36px 28px",
        position: "relative",
        zIndex: 2,
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          width={168}
          height={168}
          style={{
            width: "168px",
            height: "168px",
            borderRadius: "36px",
            border: "8px solid #eef3f9",
            objectFit: "cover",
            marginBottom: "18px",
            boxShadow: "0 16px 36px rgba(15,23,42,0.14)",
          }}
        />
      ) : (
        <div
          style={{
            width: "168px",
            height: "168px",
            borderRadius: "36px",
            border: "8px solid #eef3f9",
            background: T.blueSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT.sans,
            fontSize: "64px",
            fontWeight: 700,
            color: T.blue,
            marginBottom: "18px",
          }}
        >
          {profileInitial(displayName)}
        </div>
      )}

      <div
        style={{
          display: "flex",
          width: "100%",
          flexDirection: "column",
          alignItems: "center",
          gap: "14px",
          padding: "28px 28px 24px",
          borderRadius: "32px",
          background: T.white,
          border: `1px solid ${T.blueLine}`,
          boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: FONT.sans,
            fontSize: "44px",
            fontWeight: 800,
            color: T.ink,
            letterSpacing: "-0.02em",
            textAlign: "center",
          }}
        >
          {displayName}
        </div>

        {badgeLabel ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "999px",
              background: T.violetSoft,
              border: "1px solid #ddd6fe",
              color: T.violet,
              fontFamily: FONT.sans,
              fontSize: "22px",
              fontWeight: 600,
            }}
          >
            <span style={{ display: "flex" }}>★</span>
            {badgeLabel}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            fontFamily: FONT.sans,
            fontSize: "26px",
            fontWeight: 500,
            lineHeight: 1.45,
            color: T.muted,
            textAlign: "center",
            maxWidth: "900px",
          }}
        >
          {truncateStoryBio(bio)}
        </div>

        <StoryWorldProgress countryCount={stats.countries} />
        <StoryStatCounters stats={stats} />
      </div>
    </div>
  );
}

function StoryMapSection({
  displayName,
  isOwnProfile,
  mapSrc,
  countryCount,
  visitedCountryCodes,
  siteUrl,
}: {
  displayName: string;
  isOwnProfile: boolean;
  mapSrc: string;
  countryCount: number;
  visitedCountryCodes: string[];
  siteUrl: string;
}) {
  const coverage = worldCoveragePercent(countryCount);
  const flags = visitedCountryCodes.slice(0, 8);
  const mapTitle = isOwnProfile ? "My world map" : `${displayName}'s world map`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        padding: "0 36px",
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: FONT.sans,
          fontSize: "34px",
          fontWeight: 800,
          color: T.ink,
        }}
      >
        {mapTitle}
      </div>

      <div
        style={{
          display: "flex",
          position: "relative",
          height: "380px",
          borderRadius: "28px",
          overflow: "hidden",
          background: "#d4e8f8",
          border: `1px solid ${T.blueLine}`,
        }}
      >
        <img
          src={mapSrc}
          alt=""
          width={1008}
          height={380}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: "18px",
            right: "18px",
            flexDirection: "column",
            alignItems: "center",
            padding: "12px 16px",
            borderRadius: "18px",
            background: "rgba(255,255,255,0.94)",
            border: `1px solid ${T.blueLine}`,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: FONT.sans,
              fontSize: "28px",
              fontWeight: 800,
              color: T.blue,
              lineHeight: 1,
            }}
          >
            {coverage}%
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: FONT.sans,
              fontSize: "14px",
              fontWeight: 700,
              color: T.muted,
              letterSpacing: "0.08em",
              marginTop: "4px",
            }}
          >
            EXPLORED
          </div>
        </div>
      </div>

      {flags.length > 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "0 4px 8px",
            overflow: "hidden",
          }}
        >
          {flags.map((code) => (
            <img
              key={code}
              src={`${siteUrl}${countryCodeToFlagUrl(code)}`}
              alt=""
              width={52}
              height={52}
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid #eef3f9",
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SquareLayout(
  props: Pick<CardLayoutProps, "displayName" | "avatarUrl" | "delta" | "mapSrc" | "siteUrl">
) {
  const { displayName, avatarUrl, delta, mapSrc, siteUrl } = props;
  const badgeLabel = getTravelerBadgeLabel(delta.currentStats.countries);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: T.white,
        fontFamily: FONT.sans,
        padding: "28px 32px 0",
        gap: "18px",
      }}
    >
      <ProfileHeader
        displayName={displayName}
        avatarUrl={avatarUrl}
        badgeLabel={badgeLabel}
        worldPercent={delta.worldPercent}
        avatarSize={76}
      />

      <HeadlineTitle hasUpdate={delta.hasChanges} />

      <MapPreview mapSrc={mapSrc} height={310} />

      <StatsRow delta={delta} />

      <UpdateSection delta={delta} siteUrl={siteUrl} />

      <div style={{ display: "flex", flex: 1 }} />

      <div style={{ display: "flex", flexDirection: "column", margin: "0 -32px" }}>
        <LandmarkStrip />
        <FooterBar />
      </div>
    </div>
  );
}

function StoryLayout(props: CardLayoutProps) {
  const {
    displayName,
    avatarUrl,
    delta,
    mapSrc,
    siteUrl,
    bio,
    residence,
    isOwnProfile,
    visitedCountryCodes,
  } = props;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#eef3f9",
        fontFamily: FONT.sans,
      }}
    >
      <StoryHero
        displayName={displayName}
        residence={residence}
        isOwnProfile={isOwnProfile}
        hasUpdate={delta.hasChanges}
      />

      <StoryIdentityCard
        displayName={displayName}
        avatarUrl={avatarUrl}
        bio={bio}
        stats={delta.currentStats}
      />

      <div style={{ display: "flex", flex: 1, minHeight: "24px" }} />

      <StoryMapSection
        displayName={displayName}
        isOwnProfile={isOwnProfile}
        mapSrc={mapSrc}
        countryCount={delta.currentStats.countries}
        visitedCountryCodes={visitedCountryCodes}
        siteUrl={siteUrl}
      />

      <div style={{ display: "flex", flexDirection: "column", marginTop: "28px" }}>
        <FooterBar centered />
      </div>

      <div style={{ display: "flex", height: "120px" }} />
    </div>
  );
}

export async function buildTravelUpdateImage({
  displayName,
  avatarUrl,
  delta,
  visitedCountryCodes,
  visitedCities,
  format,
  bio = "",
  residence = null,
  isOwnProfile = true,
}: BuildTravelUpdateImageOptions): Promise<ImageResponse> {
  const mapSrc = shareCardMapDataUrl(visitedCountryCodes, visitedCities);
  const siteUrl = getSiteUrl();
  const size =
    format === "story" ? TRAVEL_UPDATE_STORY_SIZE : TRAVEL_UPDATE_SQUARE_SIZE;
  const fonts = await getShareCardFonts().catch(() => null);

  const layoutProps: CardLayoutProps = {
    displayName,
    avatarUrl,
    delta,
    mapSrc,
    siteUrl,
    bio,
    residence,
    isOwnProfile,
    visitedCountryCodes,
  };

  return new ImageResponse(
    format === "story" ? (
      <StoryLayout {...layoutProps} />
    ) : (
      <SquareLayout
        displayName={displayName}
        avatarUrl={avatarUrl}
        delta={delta}
        mapSrc={mapSrc}
        siteUrl={siteUrl}
      />
    ),
    {
      ...size,
      ...(fonts
        ? {
            fonts: [
              {
                name: FONT.script,
                data: fonts.script,
                weight: 700,
                style: "normal" as const,
              },
              {
                name: FONT.sans,
                data: fonts.bold,
                weight: 700,
                style: "normal" as const,
              },
              {
                name: FONT.sans,
                data: fonts.semi,
                weight: 600,
                style: "normal" as const,
              },
            ],
          }
        : {}),
    }
  );
}
