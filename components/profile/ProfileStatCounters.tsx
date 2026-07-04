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
  return (
    <div className="profile-stat">
      <strong>{value}</strong>
      <span>{label}</span>
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
