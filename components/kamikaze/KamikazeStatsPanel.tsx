"use client";

import { useEffect, useState } from "react";
import { YP_CACHE_KEYS, ypCacheGet, ypCacheSet } from "@/lib/kamikaze/yp-client-cache";

type CountryStat = {
  countryCode: string;
  countryName: string;
  pinnerCount: number;
};

type CityStat = {
  countryCode: string;
  countryName: string;
  cityName: string;
  pinnerCount: number;
};

type ParkStat = {
  countryCode: string;
  countryName: string;
  parkName: string;
  parkType: string;
  pinnerCount: number;
};

type StatsCachePayload = {
  countries: CountryStat[];
  cities: CityStat[];
  parks: ParkStat[];
};

const PARK_TYPE_LABELS: Record<string, string> = {
  national_park: "Milli park",
  theme_park: "Tema parkı",
  botanical_garden: "Botanik bahçesi",
};

const PAGE_SIZE = 20;

export function KamikazeStatsPanel() {
  const [countries, setCountries] = useState<CountryStat[]>([]);
  const [cities, setCities] = useState<CityStat[]>([]);
  const [parks, setParks] = useState<ParkStat[]>([]);
  const [countryVisible, setCountryVisible] = useState(PAGE_SIZE);
  const [cityVisible, setCityVisible] = useState(PAGE_SIZE);
  const [parkVisible, setParkVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cached = ypCacheGet<StatsCachePayload>(YP_CACHE_KEYS.stats);
    if (cached) {
      setCountries(cached.countries);
      setCities(cached.cities);
      setParks(cached.parks);
      setCountryVisible(PAGE_SIZE);
      setCityVisible(PAGE_SIZE);
      setParkVisible(PAGE_SIZE);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/kamikaze/stats");
        const data = (await res.json()) as {
          countries?: CountryStat[];
          cities?: CityStat[];
          parks?: ParkStat[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "İstatistikler yüklenemedi");
        if (cancelled) return;
        const nextCountries = (data.countries ?? []).filter((row) => row.pinnerCount > 0);
        const nextCities = (data.cities ?? []).filter((row) => row.pinnerCount > 0);
        const nextParks = (data.parks ?? []).filter((row) => row.pinnerCount > 0);
        setCountries(nextCountries);
        setCities(nextCities);
        setParks(nextParks);
        setCountryVisible(PAGE_SIZE);
        setCityVisible(PAGE_SIZE);
        setParkVisible(PAGE_SIZE);
        ypCacheSet(YP_CACHE_KEYS.stats, {
          countries: nextCountries,
          cities: nextCities,
          parks: nextParks,
        } satisfies StatsCachePayload);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "İstatistikler yüklenemedi");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCountries = countries.slice(0, countryVisible);
  const visibleCities = cities.slice(0, cityVisible);
  const visibleParks = parks.slice(0, parkVisible);

  return (
    <div>
      <h1>İstatistikler</h1>
      <p className="yp-main__lead">
        Benzersiz pincilere göre en çok pinlenen ülkeler, şehirler ve parklar.
      </p>

      {error ? <p className="yp-error">{error}</p> : null}
      {loading ? <p className="yp-muted">Sıralamalar yükleniyor…</p> : null}

      <div className="yp-panel">
        <div className="yp-panel__title">En çok pinlenen ülkeler</div>
        {countries.length === 0 && !loading ? (
          <div className="yp-empty">Henüz ülke pin verisi yok.</div>
        ) : countries.length > 0 ? (
          <>
            <table className="yp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ülke</th>
                  <th>Pinci</th>
                </tr>
              </thead>
              <tbody>
                {visibleCountries.map((row, index) => (
                  <tr key={row.countryCode}>
                    <td>{index + 1}</td>
                    <td>
                      {row.countryName} ({row.countryCode})
                    </td>
                    <td>{row.pinnerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {countryVisible < countries.length ? (
              <div className="yp-form-actions">
                <button
                  type="button"
                  className="yp-btn"
                  onClick={() => setCountryVisible((n) => n + PAGE_SIZE)}
                >
                  Daha fazla yükle (+{PAGE_SIZE})
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="yp-panel">
        <div className="yp-panel__title">En çok pinlenen şehirler</div>
        {cities.length === 0 && !loading ? (
          <div className="yp-empty">Henüz şehir pin verisi yok.</div>
        ) : cities.length > 0 ? (
          <>
            <table className="yp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Şehir</th>
                  <th>Ülke</th>
                  <th>Pinci</th>
                </tr>
              </thead>
              <tbody>
                {visibleCities.map((row, index) => (
                  <tr key={`${row.countryCode}:${row.cityName}`}>
                    <td>{index + 1}</td>
                    <td>{row.cityName}</td>
                    <td>
                      {row.countryName} ({row.countryCode})
                    </td>
                    <td>{row.pinnerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cityVisible < cities.length ? (
              <div className="yp-form-actions">
                <button
                  type="button"
                  className="yp-btn"
                  onClick={() => setCityVisible((n) => n + PAGE_SIZE)}
                >
                  Daha fazla yükle (+{PAGE_SIZE})
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="yp-panel">
        <div className="yp-panel__title">En çok pinlenen parklar</div>
        {parks.length === 0 && !loading ? (
          <div className="yp-empty">Henüz park pin verisi yok.</div>
        ) : parks.length > 0 ? (
          <>
            <table className="yp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Park</th>
                  <th>Tür</th>
                  <th>Ülke</th>
                  <th>Pinci</th>
                </tr>
              </thead>
              <tbody>
                {visibleParks.map((row, index) => (
                  <tr key={`${row.countryCode}:${row.parkType}:${row.parkName}`}>
                    <td>{index + 1}</td>
                    <td>{row.parkName}</td>
                    <td>{PARK_TYPE_LABELS[row.parkType] ?? row.parkType}</td>
                    <td>
                      {row.countryName} ({row.countryCode})
                    </td>
                    <td>{row.pinnerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parkVisible < parks.length ? (
              <div className="yp-form-actions">
                <button
                  type="button"
                  className="yp-btn"
                  onClick={() => setParkVisible((n) => n + PAGE_SIZE)}
                >
                  Daha fazla yükle (+{PAGE_SIZE})
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
