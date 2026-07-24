"use client";

import { useCallback, useEffect, useState } from "react";
import { useModal } from "@/components/ui/ModalProvider";
import { cityHeroLookupKey } from "@/lib/city/city-hero-images";
import {
  assignBulkCityHeroes,
  fetchCityHeroCustomLookupKeys,
} from "@/lib/kamikaze/client/bulk-city-hero";
import { parkHeroLookupKey } from "@/lib/park/park-hero-images";
import {
  assignBulkParkHeroes,
  fetchParkHeroCustomLookupKeys,
} from "@/lib/kamikaze/client/bulk-park-hero";
import type { ParkType } from "@/types/database";
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
  const modal = useModal();
  const [countries, setCountries] = useState<CountryStat[]>([]);
  const [cities, setCities] = useState<CityStat[]>([]);
  const [parks, setParks] = useState<ParkStat[]>([]);
  const [countryVisible, setCountryVisible] = useState(PAGE_SIZE);
  const [cityVisible, setCityVisible] = useState(PAGE_SIZE);
  const [parkVisible, setParkVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customHeroKeys, setCustomHeroKeys] = useState<Set<string>>(() => new Set());
  const [customParkHeroKeys, setCustomParkHeroKeys] = useState<Set<string>>(() => new Set());
  const [bulkHeroBusy, setBulkHeroBusy] = useState(false);
  const [bulkParkHeroBusy, setBulkParkHeroBusy] = useState(false);
  const [bulkHeroProgress, setBulkHeroProgress] = useState<{
    current: number;
    total: number;
    cityName: string;
  } | null>(null);
  const [bulkParkHeroProgress, setBulkParkHeroProgress] = useState<{
    current: number;
    total: number;
    parkName: string;
  } | null>(null);

  const reloadCustomHeroKeys = useCallback(async () => {
    const [cityKeys, parkKeys] = await Promise.all([
      fetchCityHeroCustomLookupKeys(),
      fetchParkHeroCustomLookupKeys(),
    ]);
    setCustomHeroKeys(cityKeys);
    setCustomParkHeroKeys(parkKeys);
  }, []);

  useEffect(() => {
    void reloadCustomHeroKeys();
  }, [reloadCustomHeroKeys]);

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

  const pinnedCitiesMissingHero = cities.filter(
    (row) => !customHeroKeys.has(cityHeroLookupKey(row.countryCode, row.cityName))
  );

  async function handleBulkHeroForPinnedCities() {
    if (pinnedCitiesMissingHero.length === 0) {
      await modal.alert("Pinlenen şehirlerin hepsinde zaten özel kapak var.", { variant: "info" });
      return;
    }

    const ok = await modal.confirm(
      `Pin istatistiğindeki ${pinnedCitiesMissingHero.length} şehre (özel kapak olmayan) stok aramasından ilk sonuç otomatik yüklenecek. Beğenmediklerini şehir sayfasından tek tek değiştirebilirsin. Devam edilsin mi?`,
      {
        title: "Pinlenen şehirlere kapak ata",
        variant: "info",
        confirmLabel: "Ata",
        cancelLabel: "Vazgeç",
      }
    );
    if (!ok) return;

    setBulkHeroBusy(true);
    setError(null);
    try {
      const { assigned, failed } = await assignBulkCityHeroes(
        pinnedCitiesMissingHero.map((row) => ({
          countryCode: row.countryCode,
          cityName: row.cityName,
        })),
        { onProgress: (progress) => setBulkHeroProgress(progress) }
      );
      await reloadCustomHeroKeys();
      await modal.alert(
        `${assigned} kapak atandı.${failed > 0 ? ` ${failed} şehirde sonuç bulunamadı veya yükleme başarısız.` : ""}`,
        { variant: assigned > 0 ? "success" : "info" }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toplu kapak atama başarısız");
    } finally {
      setBulkHeroProgress(null);
      setBulkHeroBusy(false);
    }
  }

  const pinnedParksMissingHero = parks.filter(
    (row) =>
      !customParkHeroKeys.has(
        parkHeroLookupKey(row.countryCode, row.parkName, row.parkType as ParkType)
      )
  );

  async function handleBulkHeroForPinnedParks() {
    if (pinnedParksMissingHero.length === 0) {
      await modal.alert("Pinlenen parkların hepsinde zaten özel kapak var.", { variant: "info" });
      return;
    }

    const ok = await modal.confirm(
      `Pin istatistiğindeki ${pinnedParksMissingHero.length} parke (özel kapak olmayan) stok aramasından ilk sonuç otomatik yüklenecek. Beğenmediklerini park sayfasından tek tek değiştirebilirsin. Devam edilsin mi?`,
      {
        title: "Pinlenen parklara kapak ata",
        variant: "info",
        confirmLabel: "Ata",
        cancelLabel: "Vazgeç",
      }
    );
    if (!ok) return;

    setBulkParkHeroBusy(true);
    setError(null);
    try {
      const { assigned, failed } = await assignBulkParkHeroes(
        pinnedParksMissingHero.map((row) => ({
          countryCode: row.countryCode,
          parkName: row.parkName,
          parkType: row.parkType as ParkType,
        })),
        { onProgress: (progress) => setBulkParkHeroProgress(progress) }
      );
      await reloadCustomHeroKeys();
      await modal.alert(
        `${assigned} kapak atandı.${failed > 0 ? ` ${failed} parkta sonuç bulunamadı veya yükleme başarısız.` : ""}`,
        { variant: assigned > 0 ? "success" : "info" }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toplu kapak atama başarısız");
    } finally {
      setBulkParkHeroProgress(null);
      setBulkParkHeroBusy(false);
    }
  }

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
      {bulkHeroProgress ? (
        <p className="yp-muted">
          Şehir kapak atanıyor ({bulkHeroProgress.current}/{bulkHeroProgress.total}):{" "}
          {bulkHeroProgress.cityName}
        </p>
      ) : null}
      {bulkParkHeroProgress ? (
        <p className="yp-muted">
          Park kapak atanıyor ({bulkParkHeroProgress.current}/{bulkParkHeroProgress.total}):{" "}
          {bulkParkHeroProgress.parkName}
        </p>
      ) : null}
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
        <div className="yp-panel__title">
          <div className="yp-panel__title-start">
            <span>En çok pinlenen şehirler</span>
          </div>
          {cities.length > 0 && !loading ? (
            <div className="yp-actions">
              <button
                type="button"
                className="yp-btn yp-btn--primary"
                disabled={bulkHeroBusy || pinnedCitiesMissingHero.length === 0}
                onClick={() => void handleBulkHeroForPinnedCities()}
              >
                {bulkHeroBusy
                  ? "Kapak atanıyor…"
                  : `Pinlenenlere kapak ata (${pinnedCitiesMissingHero.length})`}
              </button>
            </div>
          ) : null}
        </div>
        {cities.length === 0 && !loading ? (
          <div className="yp-empty">Henüz şehir pin verisi yok.</div>
        ) : cities.length > 0 ? (
          <>
            <p className="yp-muted" style={{ padding: "0 0.9rem", margin: 0, fontSize: "0.85rem" }}>
              Kapak atama tüm pinlenen şehir listesine uygulanır (tabloda görünen sayfa değil). Özel
              kapak olanlar atlanır.
            </p>
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
        <div className="yp-panel__title">
          <div className="yp-panel__title-start">
            <span>En çok pinlenen parklar</span>
          </div>
          {parks.length > 0 && !loading ? (
            <div className="yp-actions">
              <button
                type="button"
                className="yp-btn yp-btn--primary"
                disabled={bulkParkHeroBusy || pinnedParksMissingHero.length === 0}
                onClick={() => void handleBulkHeroForPinnedParks()}
              >
                {bulkParkHeroBusy
                  ? "Kapak atanıyor…"
                  : `Pinlenenlere kapak ata (${pinnedParksMissingHero.length})`}
              </button>
            </div>
          ) : null}
        </div>
        {parks.length === 0 && !loading ? (
          <div className="yp-empty">Henüz park pin verisi yok.</div>
        ) : parks.length > 0 ? (
          <>
            <p className="yp-muted" style={{ padding: "0 0.9rem", margin: 0, fontSize: "0.85rem" }}>
              Kapak atama tüm pinlenen park listesine uygulanır (tabloda görünen sayfa değil). Özel
              kapak olanlar atlanır.
            </p>
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
