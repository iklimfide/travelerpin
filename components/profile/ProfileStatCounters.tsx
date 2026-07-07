type ProfileStatCountersProps = {
  countries: number;
  cities: number;
  nationalParks: number;
  themeParks: number;
  countriesLabel: string;
  citiesLabel: string;
  nationalParksLabel: string;
  themeParksLabel: string;
};

type StatItemProps = {
  value: number;
  label: string;
};

function StatItem({ value, label }: StatItemProps) {
  const lines = label.split("\n");

  return (
    <div className="profile-stat">
      <strong>{value}</strong>
      {lines.length > 1 ? (
        <span className="profile-stat__label profile-stat__label--multiline" aria-label={lines.join(" ")}>
          {lines.map((line, index) => (
            <span key={index} className="profile-stat__label-line">
              {line}
            </span>
          ))}
        </span>
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
}

export function ProfileStatCounters({
  countries,
  cities,
  nationalParks,
  themeParks,
  countriesLabel,
  citiesLabel,
  nationalParksLabel,
  themeParksLabel,
}: ProfileStatCountersProps) {
  return (
    <div className="profile-stats">
      <StatItem value={countries} label={countriesLabel} />
      <StatItem value={cities} label={citiesLabel} />
      <StatItem value={nationalParks} label={nationalParksLabel} />
      <StatItem value={themeParks} label={themeParksLabel} />
    </div>
  );
}
