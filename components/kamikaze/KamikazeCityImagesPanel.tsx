"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { YpCountrySelect } from "@/components/kamikaze/YpCountrySelect";
import { cityHeroLookupKey, toCityHeroDisplayUrl } from "@/lib/city/city-hero-images";
import { DEFAULT_CITY_HERO_IMAGE } from "@/lib/constants";
import { cityPlacePath } from "@/lib/utils/hub-place-path";

type CatalogCityRow = {
  name: string;
  nameTr?: string | null;
  countryCode: string;
  countryName: string;
  source: "static" | "yp";
};

type CustomHeroRow = {
  countryCode: string;
  nameKey: string;
  cityName: string;
  imageUrl: string;
};

const MIN_QUERY_LENGTH = 2;
const PAGE_SIZE = 80;

function customRowToCatalog(row: CustomHeroRow): CatalogCityRow {
  return {
    name: row.cityName,
    countryCode: row.countryCode,
    countryName: row.countryCode,
    source: "static",
  };
}

export function KamikazeCityImagesPanel() {
  const [country, setCountry] = useState("");
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<CatalogCityRow[]>([]);
  const [customImages, setCustomImages] = useState<Map<string, string>>(() => new Map());
  const [customRows, setCustomRows] = useState<CustomHeroRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCustom, setLoadingCustom] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const fileInputsRef = useRef<Map<string, HTMLInputElement>>(new Map());

  const loadCustomImages = useCallback(async () => {
    setLoadingCustom(true);
    try {
      const res = await fetch("/api/kamikaze/city-images");
      const data = (await res.json()) as {
        images?: CustomHeroRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Özel görseller yüklenemedi");

      const rows = data.images ?? [];
      const map = new Map<string, string>();
      for (const row of rows) {
        map.set(cityHeroLookupKey(row.countryCode, row.cityName), row.imageUrl);
      }
      setCustomRows(rows);
      setCustomImages(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Özel görseller yüklenemedi");
    } finally {
      setLoadingCustom(false);
    }
  }, []);

  const loadCities = useCallback(async () => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setCities([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        kind: "city",
        q,
        limit: String(PAGE_SIZE),
      });
      if (country) params.set("country", country);
      const res = await fetch(`/api/kamikaze/catalog?${params.toString()}`);
      const data = (await res.json()) as {
        results?: CatalogCityRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Şehirler yüklenemedi");
      setCities(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Şehirler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [country, query]);

  useEffect(() => {
    void loadCustomImages();
  }, [loadCustomImages]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCities();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [loadCities]);

  const sortedCustomRows = useMemo(
    () =>
      [...customRows].sort((a, b) =>
        a.cityName.localeCompare(b.cityName, "tr", { sensitivity: "base" })
      ),
    [customRows]
  );

  const canSearch = query.trim().length >= MIN_QUERY_LENGTH;

  function heroKey(row: CatalogCityRow): string {
    return cityHeroLookupKey(row.countryCode, row.name);
  }

  function resolveCustomUrl(row: CatalogCityRow): string | null {
    const stored = customImages.get(heroKey(row));
    return stored ? toCityHeroDisplayUrl(stored) : null;
  }

  async function uploadImage(row: CatalogCityRow, file: File) {
    const key = heroKey(row);
    setBusyKey(key);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("countryCode", row.countryCode);
      formData.set("cityName", row.name);
      formData.set("file", file);

      const res = await fetch("/api/kamikaze/city-images", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as {
        image?: CustomHeroRow;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Görsel yüklenemedi");

      if (data.image) {
        const lookup = cityHeroLookupKey(data.image.countryCode, data.image.cityName);
        setCustomImages((prev) => {
          const next = new Map(prev);
          next.set(lookup, data.image!.imageUrl);
          return next;
        });
        setCustomRows((prev) => {
          const rest = prev.filter(
            (item) => cityHeroLookupKey(item.countryCode, item.cityName) !== lookup
          );
          return [...rest, data.image!];
        });
      } else {
        await loadCustomImages();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Görsel yüklenemedi");
    } finally {
      setBusyKey(null);
    }
  }

  async function removeImage(row: CatalogCityRow) {
    const key = heroKey(row);
    setBusyKey(key);
    setError(null);
    try {
      const res = await fetch("/api/kamikaze/city-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: row.countryCode,
          cityName: row.name,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Görsel kaldırılamadı");

      setCustomImages((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      setCustomRows((prev) =>
        prev.filter((item) => cityHeroLookupKey(item.countryCode, item.cityName) !== key)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Görsel kaldırılamadı");
    } finally {
      setBusyKey(null);
    }
  }

  function renderFileInput(row: CatalogCityRow, inputId: string) {
    const key = heroKey(row);
    return (
      <input
        id={inputId}
        ref={(node) => {
          if (node) fileInputsRef.current.set(key, node);
          else fileInputsRef.current.delete(key);
        }}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="yp-visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void uploadImage(row, file);
        }}
      />
    );
  }

  function renderCityActions(row: CatalogCityRow) {
    const key = heroKey(row);
    const customUrl = resolveCustomUrl(row);
    const busy = busyKey === key;
    const inputId = `yp-city-image-file-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

    return (
      <div className="yp-actions">
        {renderFileInput(row, inputId)}
        <button
          type="button"
          className="yp-btn yp-btn--primary"
          disabled={busy}
          onClick={() => fileInputsRef.current.get(key)?.click()}
        >
          {busy ? "…" : customUrl ? "Değiştir" : "Yükle"}
        </button>
        {customUrl ? (
          <button
            type="button"
            className="yp-btn yp-btn--danger"
            disabled={busy}
            onClick={() => void removeImage(row)}
          >
            Kaldır
          </button>
        ) : null}
      </div>
    );
  }

  function renderCityRow(row: CatalogCityRow) {
    const key = heroKey(row);
    const customUrl = resolveCustomUrl(row);

    return (
      <tr key={`${row.countryCode}:${row.name}`}>
        <td className="yp-table__thumb">
          <div className="yp-city-thumb-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="yp-city-thumb"
              src={customUrl ?? DEFAULT_CITY_HERO_IMAGE}
              alt=""
            />
          </div>
        </td>
        <td>
          <a
            href={cityPlacePath(row.countryCode, row.name)}
            className="yp-link yp-city-name"
            target="_blank"
            rel="noopener noreferrer"
          >
            {row.name}
          </a>
          {row.nameTr ? <span className="yp-muted"> · {row.nameTr}</span> : null}
        </td>
        <td className="yp-muted">
          {row.countryName} ({row.countryCode})
        </td>
        <td>
          {customUrl ? (
            <span className="yp-badge">Özel</span>
          ) : (
            <span className="yp-badge yp-badge--muted">Varsayılan</span>
          )}
        </td>
        <td>{renderCityActions(row)}</td>
      </tr>
    );
  }

  return (
    <div>
      <h1>Şehir görselleri</h1>
      <p className="yp-main__lead">
        Şehir hub sayfası ve profil kartlarında varsayılan kapak yerine özel görsel kullan.
        Yüklemediğin şehirlerde <code>/images/city-default.png</code> kalır.
      </p>

      {error ? <p className="yp-error">{error}</p> : null}

      <div className="yp-toolbar">
        <div className="yp-field">
          <label htmlFor="yp-city-image-country">Ülke (süzgeç)</label>
          <YpCountrySelect
            id="yp-city-image-country"
            value={country}
            onChange={setCountry}
            emptyLabel="Tümü"
            showCode
          />
        </div>
        <div className="yp-field" style={{ minWidth: "14rem", flex: 1 }}>
          <label htmlFor="yp-city-image-q">Şehir ara</label>
          <div className="yp-field__input-wrap">
            <input
              id="yp-city-image-q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="En az 2 karakter (ör. Antalya, Niagara)"
              autoComplete="off"
              className={query ? "yp-field__input--has-clear" : undefined}
            />
            {query ? (
              <button
                type="button"
                className="yp-field__clear"
                onClick={() => setQuery("")}
                aria-label="Temizle"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="yp-panel">
        <div className="yp-panel__title">
          <span className="yp-panel__title-label">Arama sonuçları</span>
          <span className="yp-muted" style={{ fontWeight: 500, fontSize: "0.78rem" }}>
            {!canSearch
              ? "En az 2 karakter yaz"
              : loading
                ? "Aranıyor…"
                : country
                  ? `${cities.length} şehir · ${country}`
                  : `${cities.length} şehir`}
          </span>
        </div>
        {!canSearch ? (
          <div className="yp-empty">
            Görsel atamak için en az {MIN_QUERY_LENGTH} karakterlik şehir adı yaz. Ülke seçersen
            sonuçlar o ülkeyle sınırlanır.
          </div>
        ) : loading ? (
          <div className="yp-empty">Şehirler aranıyor…</div>
        ) : cities.length === 0 ? (
          <div className="yp-empty">Sonuç yok.</div>
        ) : (
          <div className="yp-table-wrap">
            <table className="yp-table yp-table--city-images">
              <thead>
                <tr>
                  <th>Önizleme</th>
                  <th>Şehir</th>
                  <th>Ülke</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>{cities.map(renderCityRow)}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="yp-panel">
        <div className="yp-panel__title">
          <span className="yp-panel__title-label">Özel görseli olan şehirler</span>
          <span className="yp-muted" style={{ fontWeight: 500, fontSize: "0.78rem" }}>
            {loadingCustom ? "Yükleniyor…" : `${sortedCustomRows.length} şehir`}
          </span>
        </div>
        {loadingCustom ? (
          <div className="yp-empty">Yükleniyor…</div>
        ) : sortedCustomRows.length === 0 ? (
          <div className="yp-empty">Henüz özel şehir görseli yok.</div>
        ) : (
          <div className="yp-city-image-grid">
            {sortedCustomRows.map((row) => {
              const catalogRow = customRowToCatalog(row);
              const key = heroKey(catalogRow);
              const busy = busyKey === key;
              const inputId = `yp-city-image-card-file-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

              return (
                <article key={`${row.countryCode}:${row.nameKey}`} className="yp-city-image-card">
                  <div className="yp-city-image-card__media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={toCityHeroDisplayUrl(row.imageUrl)} alt="" />
                  </div>
                  <div className="yp-city-image-card__body">
                    <p className="yp-city-image-card__title">
                      <a
                        href={cityPlacePath(row.countryCode, row.cityName)}
                        className="yp-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {row.cityName}
                      </a>
                    </p>
                    <p className="yp-city-image-card__meta">{row.countryCode}</p>
                    <div className="yp-actions yp-actions--compact">
                      {renderFileInput(catalogRow, inputId)}
                      <button
                        type="button"
                        className="yp-btn yp-btn--primary"
                        disabled={busy}
                        onClick={() => fileInputsRef.current.get(key)?.click()}
                      >
                        {busy ? "…" : "Değiştir"}
                      </button>
                      <button
                        type="button"
                        className="yp-btn yp-btn--danger"
                        disabled={busy}
                        onClick={() => void removeImage(catalogRow)}
                      >
                        Kaldır
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
