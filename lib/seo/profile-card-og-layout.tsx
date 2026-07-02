import { WORLD_COUNTRY_TOTAL, worldCoveragePercent } from "@/lib/utils/profile-page";
import {
  getTravelerBadgeLabel,
  getTravelerBadgeTier,
  type TravelerBadgeTier,
} from "@/lib/utils/traveler-badge";
import type { TravelStats } from "@/types/database";

const T = {
  card: "#ffffff",
  text: "#142033",
  caption: "#7a8798",
  primary: "#2563eb",
  barTrack: "#dfe7f1",
  statDivider: "#dfe5ee",
  panelBorder: "#dfe5ee",
  heroGradient: "linear-gradient(135deg, #729ac6 0%, #a9c4df 44%, #c7daf0 100%)",
} as const;

const FONT = "system-ui, sans-serif";
const AVATAR = 112;
const CARDS_MAX_W = 720;

const BADGE_STYLES: Record<
  TravelerBadgeTier,
  { background: string; border: string; color: string }
> = {
  explorer: { background: "#ecfdf5", border: "#6ee7b7", color: "#065f46" },
  globetrotter: { background: "#f0f9ff", border: "#7dd3fc", color: "#0c4a6e" },
  super_voyager: { background: "#f5f3ff", border: "#c4b5fd", color: "#5b21b6" },
  world_citizen: { background: "#fffbeb", border: "#fcd34d", color: "#78350f" },
};

export type ProfileCardOgLayoutProps = {
  displayName: string;
  avatarUrl: string | null;
  heroTitle: string;
  description: string;
  stats: TravelStats;
};

function profileInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

function ProfileAvatar({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        width={AVATAR}
        height={AVATAR}
        style={{
          width: `${AVATAR}px`,
          height: `${AVATAR}px`,
          borderRadius: "32px",
          objectFit: "cover",
          border: "8px solid #eef3f9",
          background: T.card,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: `${AVATAR}px`,
        height: `${AVATAR}px`,
        borderRadius: "32px",
        border: "8px solid #eef3f9",
        background: "#dbeafe",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontSize: "38px",
        fontWeight: 800,
        color: T.primary,
      }}
    >
      {profileInitial(displayName)}
    </div>
  );
}

function TravelerBadgePill({ countryCount }: { countryCount: number }) {
  const tier = getTravelerBadgeTier(countryCount);
  const label = getTravelerBadgeLabel(countryCount);
  if (!tier || !label) {
    return <div style={{ display: "flex", height: "8px" }} />;
  }

  const theme = BADGE_STYLES[tier];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "5px 14px",
        borderRadius: "999px",
        background: theme.background,
        border: `1px solid ${theme.border}`,
        color: theme.color,
        fontFamily: FONT,
        fontSize: "13px",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

function WorldProgress({ countryCount }: { countryCount: number }) {
  const coverage = worldCoveragePercent(countryCount);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: T.card,
        borderRadius: "24px",
        padding: "18px",
        width: "100%",
        border: `1px solid ${T.panelBorder}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: FONT,
            fontSize: "16px",
            fontWeight: 800,
            color: T.text,
          }}
        >
          World explored
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: FONT,
            fontSize: "30px",
            fontWeight: 900,
            color: T.primary,
            lineHeight: 1,
          }}
        >
          {`${coverage}%`}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          height: "12px",
          background: T.barTrack,
          borderRadius: "999px",
          overflow: "hidden",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: `${coverage}%`,
            height: "100%",
            background: T.primary,
            borderRadius: "999px",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: FONT,
          fontSize: "14px",
          fontWeight: 600,
          color: T.caption,
        }}
      >
        {`${countryCount} of ${WORLD_COUNTRY_TOTAL} countries pinned`}
      </div>
    </div>
  );
}

function StatCounters({ stats }: { stats: TravelStats }) {
  const items = [
    { value: stats.countries, label: "Country" },
    { value: stats.cities, label: "City" },
    { value: stats.nationalParks, label: "Nat. park" },
    { value: stats.themeParks, label: "Theme park" },
  ];

  return (
    <div
      style={{
        display: "flex",
        background: T.card,
        borderRadius: "24px",
        padding: "18px 10px",
        width: "100%",
        border: `1px solid ${T.panelBorder}`,
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
            padding: "0 4px",
            borderRight:
              index < items.length - 1 ? `1px solid ${T.statDivider}` : "0px solid transparent",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: FONT,
              fontSize: "25px",
              fontWeight: 800,
              color: T.text,
              lineHeight: 1,
              marginBottom: "4px",
            }}
          >
            {String(item.value)}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: FONT,
              fontSize: "12px",
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

export function ProfileCardOgLayout({
  displayName,
  avatarUrl,
  heroTitle,
  description,
  stats,
}: ProfileCardOgLayoutProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: T.heroGradient,
        fontFamily: FONT,
        padding: "28px 32px 28px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: "40px",
          fontWeight: 800,
          color: "#fff",
          lineHeight: 1.08,
          marginBottom: "10px",
        }}
      >
        {heroTitle}
      </div>

      <div
        style={{
          display: "flex",
          fontSize: "17px",
          lineHeight: 1.45,
          color: "rgba(255, 255, 255, 0.88)",
          marginBottom: "22px",
          maxWidth: "900px",
        }}
      >
        {description}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "22px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            flexShrink: 0,
          }}
        >
          <ProfileAvatar displayName={displayName} avatarUrl={avatarUrl} />
          <TravelerBadgePill countryCount={stats.countries} />
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            gap: "16px",
            maxWidth: `${CARDS_MAX_W}px`,
            minWidth: 0,
          }}
        >
          <WorldProgress countryCount={stats.countries} />
          <StatCounters stats={stats} />
        </div>
      </div>
    </div>
  );
}
