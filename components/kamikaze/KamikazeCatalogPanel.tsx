"use client";

import { useCallback, useEffect, useState } from "react";
import { YpCountrySelect } from "@/components/kamikaze/YpCountrySelect";
import { YP_CACHE_KEYS, ypCacheGet, ypCacheInvalidate, ypCacheSet } from "@/lib/kamikaze/yp-client-cache";

type CountryResult = {
  name: string;
  nameTr?: string | null;
  countryCode: string;
  countryName: string;
  latitude: number | null;
  longitude: number | null;
  source: "static";
  trSource?: "db" | "static" | "iso";
};

type CatalogCachePayload = {
  results: CountryResult[];
  hasMore: boolean;
  nextOffset: number;
  total: number;
};

const CATALOG_PAGE_SIZE = 80;

export function KamikazeCatalogPanel() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CountryResult[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<CountryResult | null>(null);
  const [renameTrValue, setRenameTrValue] = useState("");

  function resultKey(row: CountryResult): string {
    return row.countryCode;
  }

  const load = useCallback(
    async (
      mode: "replace" | "append" = "replace",
      options?: { force?: boolean; offset?: number }
    ) => {
      const cacheKey = YP_CACHE_KEYS.catalog("country", "catalog", "", q, "");
      const offset = options?.offset ?? 0;

      if (mode === "replace" && !options?.force) {
        const cached = ypCacheGet<CatalogCachePayload>(cacheKey);
        if (cached) {
          setResults(cached.results);
          setHasMore(cached.hasMore);
          setNextOffset(cached.nextOffset);
          setTotal(cached.total);
          setLoading(false);
          setError(null);
          return;
        }
      }

      if (mode === "replace") setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          kind: "country",
          offset: String(offset),
          limit: String(CATALOG_PAGE_SIZE),
        });
        if (q.trim()) params.set("q", q.trim());

        const res = await fetch(`/api/kamikaze/catalog?${params}`);
        const data = (await res.json()) as {
          results?: CountryResult[];
          hasMore?: boolean;
          nextOffset?: number;
          total?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Katalog yüklenemedi");

        const page = data.results ?? [];
        const nextHasMore = Boolean(data.hasMore);
        const nextOff = data.nextOffset ?? offset + page.length;
        const nextTotal = typeof data.total === "number" ? data.total : offset + page.length;

        setResults((prev) => {
          const nextResults = mode === "append" ? [...prev, ...page] : page;
          ypCacheSet(cacheKey, {
            results: nextResults,
            hasMore: nextHasMore,
            nextOffset: nextOff,
            total: nextTotal,
          } satisfies CatalogCachePayload);
          return nextResults;
        });
        setHasMore(nextHasMore);
        setNextOffset(nextOff);
        setTotal(nextTotal);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Katalog yüklenemedi");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [q]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load("replace");
    }, 280);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function loadMore() {
    if (!hasMore || loadingMore || loading) return;
    await load("append", { force: true, offset: nextOffset });
  }

  async function postAction(body: Record<string, unknown>, busyKey: string) {
    setBusyId(busyKey);
    setError(null);
    try {
      const res = await fetch("/api/kamikaze/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "İşlem başarısız");
      ypCacheInvalidate("catalog:");
      await load("replace", { force: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setBusyId(null);
    }
  }

  function openRename(row: CountryResult) {
    setRenameTarget(row);
    setRenameTrValue(row.nameTr ?? "");
  }

  async function submitCountryTr() {
    if (!renameTarget) return;
    const nextTr = renameTrValue.trim();
    const trUnchanged = nextTr === (renameTarget.nameTr ?? "").trim();
    if (trUnchanged) {
      setRenameTarget(null);
      return;
    }
    const row = renameTarget;
    setRenameTarget(null);
    const key = `rename:${row.countryCode}`;
    await postAction(
      {
        action: "set_country_name_tr",
        countryCode: row.countryCode,
        nameTr: nextTr || null,
      },
      key
    );
    setQ(row.name);
  }

  return (
    <div>
      <h1>Katalog</h1>
      <p className="yp-main__lead">
        Ülke TR adlarını düzenle. Şehir ve park yönetimi için Şehirler / Parklar sekmelerini kullan.
        Kullanıcı pinleri silinmez.
      </p>

      {error ? <p className="yp-error">{error}</p> : null}

      <div className="yp-toolbar yp-toolbar--inline">
        <div className="yp-field yp-field--filter-q yp-field--grow">
          <label htmlFor="yp-cat-q">Ara</label>
          <div className="yp-field__input-wrap">
            <input
              id="yp-cat-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Kod, EN veya TR (en az 2 karakter)"
              className={q ? "yp-field__input--has-clear" : undefined}
            />
            {q ? (
              <button
                type="button"
                className="yp-field__clear"
                onClick={() => setQ("")}
                aria-label="Temizle"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className="yp-btn"
          onClick={() => void load("replace", { force: true })}
          disabled={loading}
        >
          {loading ? "Yükleniyor…" : "Yenile"}
        </button>
      </div>

      <div className="yp-panel">
        <div className="yp-panel__title">
          <span className="yp-panel__title-label">Ülkeler</span>
          <span className="yp-muted" style={{ fontWeight: 500, fontSize: "0.78rem" }}>
            {total > results.length ? `${results.length} / ${total} ülke` : `${results.length} ülke`}
          </span>
        </div>
        {results.length === 0 ? (
          <div className="yp-empty">{loading ? "Yükleniyor…" : "Sonuç yok."}</div>
        ) : (
          <>
            <div className="yp-table-wrap yp-table-wrap--mobile-cards">
            <table className="yp-table">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Ad (EN)</th>
                  <th>TR</th>
                  <th>Kaynak</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => {
                  const key = resultKey(row);
                  const trLabel =
                    row.trSource === "db"
                      ? "YP"
                      : row.trSource === "static"
                        ? "Statik"
                        : "ISO";
                  return (
                    <tr key={key}>
                      <td data-label="Kod">
                        <code>{row.countryCode}</code>
                      </td>
                      <td data-label="Ad (EN)">{row.name}</td>
                      <td className="yp-muted" data-label="TR">
                        {row.nameTr ?? "—"}
                      </td>
                      <td data-label="Kaynak">
                        {row.trSource === "db" ? (
                          <span className="yp-badge">{trLabel}</span>
                        ) : (
                          trLabel
                        )}
                      </td>
                      <td data-label="İşlemler">
                        <div className="yp-actions">
                          <button
                            type="button"
                            className="yp-btn"
                            disabled={busyId?.startsWith("rename:") || busyId === key}
                            onClick={() => openRename(row)}
                          >
                            TR düzenle
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            {hasMore ? (
              <div style={{ padding: "0.75rem 0.9rem" }}>
                <button
                  type="button"
                  className="yp-btn"
                  disabled={loadingMore || loading}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? "Yükleniyor…" : `Daha fazla yükle (+${CATALOG_PAGE_SIZE})`}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {renameTarget ? (
        <div className="yp-rename-modal" role="presentation">
          <button
            type="button"
            className="yp-rename-modal__backdrop"
            aria-label="Kapat"
            onClick={() => setRenameTarget(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="yp-rename-title"
            className="yp-rename-modal__sheet"
          >
            <h2 id="yp-rename-title">Ülke TR adı</h2>
            <p className="yp-muted">
              <code>{renameTarget.countryCode}</code> · {renameTarget.name}
              {renameTarget.nameTr ? ` / ${renameTarget.nameTr}` : ""}
            </p>
            <div className="yp-field yp-field--wide" style={{ marginTop: "0.85rem" }}>
              <label htmlFor="yp-rename-tr-input">Ad (TR)</label>
              <input
                id="yp-rename-tr-input"
                autoFocus
                value={renameTrValue}
                onChange={(e) => setRenameTrValue(e.target.value)}
                placeholder="Boş bırakılırsa YP TR etiketi silinir"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submitCountryTr();
                  }
                }}
              />
            </div>
            <div className="yp-form-actions" style={{ padding: "0.9rem 0 0" }}>
              <button type="button" className="yp-btn" onClick={() => setRenameTarget(null)}>
                Vazgeç
              </button>
              <button
                type="button"
                className="yp-btn yp-btn--primary"
                onClick={() => void submitCountryTr()}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
