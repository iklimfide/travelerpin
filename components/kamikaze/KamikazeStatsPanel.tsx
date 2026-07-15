"use client";

import { useEffect, useState } from "react";

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

const PARK_TYPE_LABELS: Record<string, string> = {
  national_park: "Milli park",
  theme_park: "Tema parkı",
  botanical_garden: "Botanik bahçesi",
};

export function KamikazeStatsPanel() {
  const [countries, setCountries] = useState<CountryStat[]>([]);
  const [cities, setCities] = useState<CityStat[]>([]);
  const [parks, setParks] = useState<ParkStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
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
        setCountries(data.countries ?? []);
        setCities(data.cities ?? []);
        setParks(data.parks ?? []);
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
        ) : (
          <table className="yp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Ülke</th>
                <th>Pinci</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((row, index) => (
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
        )}
      </div>

      <div className="yp-panel">
        <div className="yp-panel__title">En çok pinlenen şehirler</div>
        {cities.length === 0 && !loading ? (
          <div className="yp-empty">Henüz şehir pin verisi yok.</div>
        ) : (
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
              {cities.map((row, index) => (
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
        )}
      </div>

      <div className="yp-panel">
        <div className="yp-panel__title">En çok pinlenen parklar</div>
        {parks.length === 0 && !loading ? (
          <div className="yp-empty">Henüz park pin verisi yok.</div>
        ) : (
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
              {parks.map((row, index) => (
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
        )}
      </div>
    </div>
  );
}
