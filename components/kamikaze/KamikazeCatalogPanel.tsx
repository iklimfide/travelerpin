"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useModal } from "@/components/ui/ModalProvider";
import { YpCountrySelect } from "@/components/kamikaze/YpCountrySelect";
import { YP_CACHE_KEYS, ypCacheGet, ypCacheInvalidate, ypCacheSet } from "@/lib/kamikaze/yp-client-cache";
import { citiesAreSame } from "@/lib/utils/city-aliases";
import { PARK_TYPES, type ParkType } from "@/types/database";

type Kind = "city" | "park" | "country";
type CatalogTab = "cities" | "parks" | "countries" | "add-city" | "add-park";
type PopularFilter = "" | "popular" | "not_popular";

type CatalogResult = {
  id?: string;
  name: string;
  nameTr?: string | null;
  countryCode: string;
  countryName: string;
  latitude: number | null;
  longitude: number | null;
  parkType?: ParkType;
  source: "static" | "yp";
  popular?: boolean;
  capital?: boolean;
  trSource?: "db" | "static" | "iso";
};

type CatalogCachePayload = {
  results: CatalogResult[];
  hasMore: boolean;
  nextOffset: number;
  total: number;
};

const PARK_TYPE_LABELS: Record<ParkType, string> = {
  national_park: "Milli park",
  theme_park: "Tema parkı",
  botanical_garden: "Botanik bahçesi",
};

const ADD_CITY_SEARCH_DEBOUNCE_MS = 300;
const ADD_CITY_MIN_QUERY = 2;
const CATALOG_PAGE_SIZE = 80;

export function KamikazeCatalogPanel() {
  const modal = useModal();
  const [tab, setTab] = useState<CatalogTab>("cities");
  const [country, setCountry] = useState("");
  const [q, setQ] = useState("");
  const [popularFilter, setPopularFilter] = useState<PopularFilter>("");
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [renameTarget, setRenameTarget] = useState<CatalogResult | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameTrValue, setRenameTrValue] = useState("");

  const [formName, setFormName] = useState("");
  const [formNameTr, setFormNameTr] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formParkType, setFormParkType] = useState<ParkType>("national_park");
  const [formPopular, setFormPopular] = useState(false);
  const [ypAdditions, setYpAdditions] = useState<CatalogResult[]>([]);
  const [additionsLoading, setAdditionsLoading] = useState(false);
  const [addSearchResults, setAddSearchResults] = useState<CatalogResult[]>([]);
  const [addSearchLoading, setAddSearchLoading] = useState(false);
  const [addSearchDone, setAddSearchDone] = useState(false);

  const kind: Kind =
    tab === "parks" || tab === "add-park"
      ? "park"
      : tab === "countries"
        ? "country"
        : "city";
  const isManageTab = tab === "cities" || tab === "parks" || tab === "countries";
  const isCountriesTab = tab === "countries";
  const isAddTab = tab === "add-city" || tab === "add-park";

  function resultKey(row: CatalogResult): string {
    return `${row.source}:${row.countryCode}:${row.name}:${row.id ?? ""}`;
  }

  const loadAdditions = useCallback(
    async (options?: { force?: boolean }) => {
      if (!isAddTab) return;
      const addKind: Kind = tab === "add-park" ? "park" : "city";
      const cacheKey = YP_CACHE_KEYS.catalogAdditions(addKind);
      if (!options?.force) {
        const cached = ypCacheGet<{ results: CatalogResult[] }>(cacheKey);
        if (cached) {
          setYpAdditions(cached.results);
          setAdditionsLoading(false);
          return;
        }
      }

      setAdditionsLoading(true);
      try {
        const params = new URLSearchParams({ kind: addKind, ypOnly: "1" });
        const res = await fetch(`/api/kamikaze/catalog?${params}`);
        const data = (await res.json()) as {
          results?: CatalogResult[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Eklenenler yüklenemedi");
        const next = data.results ?? [];
        setYpAdditions(next);
        ypCacheSet(cacheKey, { results: next });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Eklenenler yüklenemedi");
      } finally {
        setAdditionsLoading(false);
      }
    },
    [isAddTab, tab]
  );

  const load = useCallback(
    async (
      mode: "replace" | "append" = "replace",
      options?: { force?: boolean; offset?: number }
    ) => {
      if (!isManageTab) return;
      const cacheKey = YP_CACHE_KEYS.catalog(kind, country, q, popularFilter);
      const offset = options?.offset ?? 0;

      if (mode === "replace" && !options?.force) {
        const cached = ypCacheGet<CatalogCachePayload>(cacheKey);
        if (cached) {
          setResults(cached.results);
          setHasMore(cached.hasMore);
          setNextOffset(cached.nextOffset);
          setTotal(cached.total);
          setSelectedKeys(new Set());
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
          kind,
          offset: String(offset),
          limit: String(CATALOG_PAGE_SIZE),
        });
        if (!isCountriesTab && country) params.set("country", country);
        if (q.trim()) params.set("q", q.trim());
        if (kind === "city" && popularFilter) params.set("popularFilter", popularFilter);
        const res = await fetch(`/api/kamikaze/catalog?${params}`);
        const data = (await res.json()) as {
          results?: CatalogResult[];
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
        if (mode === "replace") setSelectedKeys(new Set());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Katalog yüklenemedi");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [kind, country, q, popularFilter, isManageTab, isCountriesTab]
  );

  useEffect(() => {
    void load("replace");
  }, [load]);

  async function loadMore() {
    if (!hasMore || loadingMore || loading) return;
    await load("append", { force: true, offset: nextOffset });
  }

  useEffect(() => {
    void loadAdditions();
  }, [loadAdditions]);

  useEffect(() => {
    if (tab !== "add-city") {
      setAddSearchResults([]);
      setAddSearchLoading(false);
      setAddSearchDone(false);
      return;
    }

    const query = formName.trim();
    if (query.length < ADD_CITY_MIN_QUERY) {
      setAddSearchResults([]);
      setAddSearchLoading(false);
      setAddSearchDone(false);
      return;
    }

    const controller = new AbortController();
    setAddSearchLoading(true);
    setAddSearchDone(false);

    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          kind: "city",
          q: query,
        });
        if (formCountry) params.set("country", formCountry);
        const res = await fetch(`/api/kamikaze/catalog?${params}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          results?: CatalogResult[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Arama başarısız");
        setAddSearchResults(data.results ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAddSearchResults([]);
        setError(err instanceof Error ? err.message : "Arama başarısız");
      } finally {
        if (!controller.signal.aborted) {
          setAddSearchLoading(false);
          setAddSearchDone(true);
        }
      }
    }, ADD_CITY_SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [tab, formName, formCountry]);

  const exactCityMatch = useMemo(() => {
    const query = formName.trim();
    if (!query || tab !== "add-city" || !formCountry) return null;
    return (
      addSearchResults.find(
        (row) =>
          row.countryCode.toUpperCase() === formCountry.toUpperCase() &&
          citiesAreSame(formCountry, row.name, query)
      ) ?? null
    );
  }, [tab, formName, formCountry, addSearchResults]);

  const canAddCity =
    tab === "add-city" &&
    Boolean(formCountry) &&
    formName.trim().length >= ADD_CITY_MIN_QUERY &&
    addSearchDone &&
    !addSearchLoading &&
    !exactCityMatch;

  function selectTab(next: CatalogTab) {
    setTab(next);
    setError(null);
    setSelectedKeys(new Set());
    setRenameTarget(null);
    if (next === "parks" || next === "add-park" || next === "countries") {
      setPopularFilter("");
    }
    if (next === "countries") {
      setCountry("");
    }
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
      if (isAddTab) {
        await loadAdditions({ force: true });
      } else {
        await load("replace", { force: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setBusyId(null);
    }
  }

  function openRename(row: CatalogResult) {
    setRenameTarget(row);
    setRenameValue(row.name);
    setRenameTrValue(row.nameTr ?? "");
  }

  async function submitCountryTr() {
    if (!renameTarget) return;
    const nextTr = renameTrValue.trim();
    const trUnchanged = nextTr === (renameTarget.nameTr ?? "").trim();
    // Clearing a non-DB fallback (static/iso) with empty string is a no-op unless DB override exists.
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

  async function submitRename() {
    if (!renameTarget) return;
    if (isCountriesTab) {
      await submitCountryTr();
      return;
    }
    const next = renameValue.trim();
    const nextTr = renameTrValue.trim();
    if (!next) {
      setError("Yeni ad boş olamaz");
      return;
    }
    const nameUnchanged = next === renameTarget.name;
    const trUnchanged = nextTr === (renameTarget.nameTr ?? "").trim();
    if (nameUnchanged && trUnchanged) {
      setRenameTarget(null);
      return;
    }
    const row = renameTarget;
    setRenameTarget(null);
    const key = `rename:${row.source}:${row.countryCode}:${row.name}`;

    if (nameUnchanged && kind === "city") {
      await postAction(
        {
          action: "set_name_tr",
          countryCode: row.countryCode,
          name: row.name,
          nameTr: nextTr || null,
        },
        key
      );
      setCountry(row.countryCode);
      setQ(row.name);
      return;
    }

    await postAction(
      {
        action: "rename",
        kind,
        countryCode: row.countryCode,
        oldName: row.name,
        newName: next,
        ...(kind === "city" ? { nameTr: nextTr || null } : {}),
        source: row.source,
        id: row.id,
        latitude: row.latitude,
        longitude: row.longitude,
        parkType: row.parkType,
      },
      key
    );
    // Jump to the new name so the rename result is visible.
    setCountry(row.countryCode);
    setQ(next);
  }

  async function handleDelete(row: CatalogResult) {
    const ok = await modal.confirm(
      `"${row.name}" katalogdan kalıcı silinsin mi? Kullanıcı pinleri silinmez.`,
      {
        title: "Kayıt silinsin mi?",
        variant: "error",
        destructive: true,
        confirmLabel: "Sil",
        cancelLabel: "Vazgeç",
      }
    );
    if (!ok) return;
    const key = `delete:${row.source}:${row.id ?? row.name}:${row.countryCode}`;
    await postAction(
      {
        action: "delete",
        kind,
        countryCode: row.countryCode,
        name: row.name,
        source: row.source,
        id: row.id,
      },
      key
    );
  }

  const allSelected =
    results.length > 0 && results.every((row) => selectedKeys.has(resultKey(row)));

  function toggleSelect(row: CatalogResult) {
    const key = resultKey(row);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedKeys(new Set());
      return;
    }
    setSelectedKeys(new Set(results.map((row) => resultKey(row))));
  }

  async function handleSetPopular(row: CatalogResult, isPopular: boolean) {
    const key = `popular:${row.countryCode}:${row.name}:${isPopular ? "1" : "0"}`;
    await postAction(
      {
        action: "set_popular",
        countryCode: row.countryCode,
        name: row.name,
        isPopular,
      },
      key
    );
  }

  function selectedRows() {
    return results.filter((row) => selectedKeys.has(resultKey(row)));
  }

  async function handleBulkDelete() {
    const selected = selectedRows();
    if (selected.length === 0) return;
    const ok = await modal.confirm(
      `${selected.length} kayıt katalogdan kalıcı silinsin mi? Kullanıcı pinleri silinmez.`,
      {
        title: "Toplu silme",
        variant: "error",
        destructive: true,
        confirmLabel: "Sil",
        cancelLabel: "Vazgeç",
      }
    );
    if (!ok) return;
    await postAction(
      {
        action: "delete_bulk",
        kind,
        items: selected.map((row) => ({
          source: row.source,
          countryCode: row.countryCode,
          name: row.name,
          id: row.id,
        })),
      },
      "bulk-delete"
    );
  }

  async function handleBulkPopular(isPopular: boolean) {
    if (kind !== "city") return;
    const selected = selectedRows();
    if (selected.length === 0) return;
    const ok = await modal.confirm(
      isPopular
        ? `${selected.length} şehre Popüler etiketi eklensin mi?`
        : `${selected.length} şehirden Popüler etiketi kaldırılsın mı?`,
      {
        title: isPopular ? "Toplu popüler ekle" : "Toplu popüler kaldır",
        variant: "info",
        confirmLabel: isPopular ? "Popüler yap" : "Kaldır",
        cancelLabel: "Vazgeç",
      }
    );
    if (!ok) return;
    await postAction(
      {
        action: "set_popular_bulk",
        isPopular,
        items: selected.map((row) => ({
          countryCode: row.countryCode,
          name: row.name,
        })),
      },
      isPopular ? "bulk-popular-on" : "bulk-popular-off"
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const latTrim = formLat.trim();
    const lngTrim = formLng.trim();
    const latitude = latTrim === "" ? null : Number(latTrim);
    const longitude = lngTrim === "" ? null : Number(lngTrim);

    if ((latitude === null) !== (longitude === null)) {
      setError("Enlem ve boylam birlikte girilmeli veya ikisi de boş bırakılmalı");
      return;
    }
    if (latitude !== null && (!Number.isFinite(latitude) || !Number.isFinite(longitude))) {
      setError("Geçersiz enlem veya boylam");
      return;
    }

    if (tab === "add-city") {
      if (!formCountry) {
        setError("Ülke seçmelisin");
        return;
      }
      if (!canAddCity) {
        setError(
          exactCityMatch
            ? "Bu şehir zaten katalogda"
            : "Eklemeden önce şehir adını yazıp aramanın bitmesini bekle"
        );
        return;
      }
      await postAction(
        {
          action: "add_city",
          name: formName,
          nameTr: formNameTr.trim() || null,
          countryCode: formCountry,
          latitude,
          longitude,
          isPopular: formPopular,
        },
        "add"
      );
      setFormPopular(false);
      setFormCountry("");
      setFormNameTr("");
    } else {
      if (!formCountry) {
        setError("Ülke seçmelisin");
        return;
      }
      await postAction(
        {
          action: "add_park",
          name: formName,
          countryCode: formCountry,
          parkType: formParkType,
          latitude,
          longitude,
        },
        "add"
      );
      setFormCountry("");
    }
    setFormName("");
    setFormLat("");
    setFormLng("");
    setAddSearchResults([]);
    setAddSearchDone(false);
  }

  return (
    <div>
      <h1>Katalog</h1>
      <p className="yp-main__lead">
        Şehir/park/ülke ekle veya TR adlarını düzenle. Kullanıcı pinleri silinmez.
      </p>

      {error ? <p className="yp-error">{error}</p> : null}

      <div className="yp-tabs" role="tablist" aria-label="Katalog sekmeleri">
        <button
          type="button"
          aria-selected={tab === "cities"}
          onClick={() => selectTab("cities")}
        >
          Şehirler
        </button>
        <button
          type="button"
          aria-selected={tab === "parks"}
          onClick={() => selectTab("parks")}
        >
          Parklar
        </button>
        <button
          type="button"
          aria-selected={tab === "countries"}
          onClick={() => selectTab("countries")}
        >
          Ülkeler
        </button>
        <button
          type="button"
          aria-selected={tab === "add-city"}
          onClick={() => selectTab("add-city")}
        >
          Şehir ekle
        </button>
        <button
          type="button"
          aria-selected={tab === "add-park"}
          onClick={() => selectTab("add-park")}
        >
          Park ekle
        </button>
      </div>

      {isAddTab ? (
        <>
          <div className="yp-panel">
            <div className="yp-panel__title">
              {tab === "add-city" ? "Şehir ekle" : "Park ekle"}
            </div>
            <form onSubmit={(e) => void handleAdd(e)}>
              {tab === "add-city" ? (
                <>
                  <div className="yp-form-grid">
                    <div className="yp-field yp-field--wide">
                      <label htmlFor="yp-add-name">Şehir adı (EN)</label>
                      <input
                        id="yp-add-name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Yazmaya başla — otomatik aranır"
                        autoComplete="off"
                      />
                    </div>
                    <div className="yp-field yp-field--wide">
                      <label htmlFor="yp-add-name-tr">Şehir adı (TR, isteğe bağlı)</label>
                      <input
                        id="yp-add-name-tr"
                        value={formNameTr}
                        onChange={(e) => setFormNameTr(e.target.value)}
                        placeholder="Örn. Londra"
                        autoComplete="off"
                      />
                    </div>
                    <div className="yp-field">
                      <label htmlFor="yp-add-country">Ülke</label>
                      <YpCountrySelect
                        id="yp-add-country"
                        value={formCountry}
                        onChange={setFormCountry}
                        emptyLabel="Ülke seç"
                      />
                    </div>
                  </div>

                  <div style={{ padding: "0 0.9rem 0.65rem" }}>
                    {formName.trim().length > 0 &&
                    formName.trim().length < ADD_CITY_MIN_QUERY ? (
                      <p className="yp-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                        Arama için en az {ADD_CITY_MIN_QUERY} karakter yaz.
                      </p>
                    ) : null}
                    {addSearchLoading ? (
                      <p className="yp-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                        Aranıyor…
                      </p>
                    ) : null}
                    {addSearchDone &&
                    !addSearchLoading &&
                    formName.trim().length >= ADD_CITY_MIN_QUERY &&
                    !formCountry ? (
                      <p className="yp-error" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
                        Eklemek için ülke seçmelisin.
                      </p>
                    ) : null}
                    {addSearchDone && !addSearchLoading && addSearchResults.length > 0 ? (
                      <div style={{ marginTop: "0.35rem" }}>
                        <p
                          className="yp-muted"
                          style={{ margin: "0 0 0.4rem", fontSize: "0.78rem", fontWeight: 600 }}
                        >
                          Katalogda bulunanlar
                        </p>
                        <table className="yp-table">
                          <thead>
                            <tr>
                              <th>Ad (EN)</th>
                              <th>TR</th>
                              <th>Ülke</th>
                              <th>Kaynak</th>
                            </tr>
                          </thead>
                          <tbody>
                            {addSearchResults.map((row) => {
                              const isExact =
                                exactCityMatch != null &&
                                resultKey(exactCityMatch) === resultKey(row);
                              return (
                                <tr key={resultKey(row)}>
                                  <td>
                                    {row.name}{" "}
                                    {isExact ? (
                                      <span className="yp-badge">Eşleşme</span>
                                    ) : null}
                                  </td>
                                  <td className="yp-muted">{row.nameTr ?? "—"}</td>
                                  <td>
                                    {row.countryName} ({row.countryCode})
                                  </td>
                                  <td>
                                    {row.source === "yp" ? (
                                      <span className="yp-badge">YP</span>
                                    ) : (
                                      "Statik"
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                    {exactCityMatch ? (
                      <p
                        className="yp-muted"
                        style={{ margin: "0.55rem 0 0", fontSize: "0.85rem" }}
                      >
                        Bu şehir zaten katalogda — yeniden eklenmez.
                      </p>
                    ) : null}
                    {canAddCity && addSearchResults.length === 0 ? (
                      <p
                        className="yp-muted"
                        style={{ margin: "0.55rem 0 0", fontSize: "0.85rem" }}
                      >
                        Katalogda yok — ekleyebilirsin.
                      </p>
                    ) : null}
                    {canAddCity && addSearchResults.length > 0 ? (
                      <p
                        className="yp-muted"
                        style={{ margin: "0.55rem 0 0", fontSize: "0.85rem" }}
                      >
                        Tam eşleşme yok — &quot;{formName.trim()}&quot; olarak ekleyebilirsin.
                      </p>
                    ) : null}
                  </div>

                  {canAddCity ? (
                    <>
                      <div className="yp-form-grid">
                        <div className="yp-field">
                          <label htmlFor="yp-add-lat">Enlem (isteğe bağlı)</label>
                          <input
                            id="yp-add-lat"
                            inputMode="decimal"
                            value={formLat}
                            onChange={(e) => setFormLat(e.target.value)}
                            placeholder="Boş bırakılabilir"
                          />
                        </div>
                        <div className="yp-field">
                          <label htmlFor="yp-add-lng">Boylam (isteğe bağlı)</label>
                          <input
                            id="yp-add-lng"
                            inputMode="decimal"
                            value={formLng}
                            onChange={(e) => setFormLng(e.target.value)}
                            placeholder="Boş bırakılabilir"
                          />
                        </div>
                        <div className="yp-field yp-field--wide">
                          <label htmlFor="yp-add-popular">Popüler</label>
                          <label
                            htmlFor="yp-add-popular"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              textTransform: "none",
                              letterSpacing: "normal",
                              fontSize: "0.9rem",
                              fontWeight: 500,
                              color: "var(--foreground)",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              id="yp-add-popular"
                              type="checkbox"
                              checked={formPopular}
                              onChange={(e) => setFormPopular(e.target.checked)}
                            />
                            Popüler etiketi ekle
                          </label>
                        </div>
                      </div>
                      <div className="yp-form-actions">
                        <button
                          type="submit"
                          className="yp-btn yp-btn--primary"
                          disabled={busyId === "add"}
                        >
                          Ekle
                        </button>
                      </div>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="yp-form-grid">
                    <div className="yp-field yp-field--wide">
                      <label htmlFor="yp-add-name">Ad</label>
                      <input
                        id="yp-add-name"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>
                    <div className="yp-field">
                      <label htmlFor="yp-add-country">Ülke</label>
                      <YpCountrySelect
                        id="yp-add-country"
                        value={formCountry}
                        onChange={setFormCountry}
                        required
                        emptyLabel="Ülke seç"
                      />
                    </div>
                    <div className="yp-field">
                      <label htmlFor="yp-add-type">Park türü</label>
                      <select
                        id="yp-add-type"
                        value={formParkType}
                        onChange={(e) => setFormParkType(e.target.value as ParkType)}
                      >
                        {PARK_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {PARK_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="yp-field">
                      <label htmlFor="yp-add-lat">Enlem (isteğe bağlı)</label>
                      <input
                        id="yp-add-lat"
                        inputMode="decimal"
                        value={formLat}
                        onChange={(e) => setFormLat(e.target.value)}
                        placeholder="Boş bırakılabilir"
                      />
                    </div>
                    <div className="yp-field">
                      <label htmlFor="yp-add-lng">Boylam (isteğe bağlı)</label>
                      <input
                        id="yp-add-lng"
                        inputMode="decimal"
                        value={formLng}
                        onChange={(e) => setFormLng(e.target.value)}
                        placeholder="Boş bırakılabilir"
                      />
                    </div>
                  </div>
                  <div className="yp-form-actions">
                    <button
                      type="submit"
                      className="yp-btn yp-btn--primary"
                      disabled={busyId === "add"}
                    >
                      Kataloğa ekle
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>

          <div className="yp-panel">
            <div className="yp-panel__title">
              <span className="yp-panel__title-label">
                {tab === "add-city" ? "Eklenen şehirler" : "Eklenen parklar"}
              </span>
              <span className="yp-muted" style={{ fontWeight: 500, fontSize: "0.78rem" }}>
                En son eklenen üstte
              </span>
            </div>
            {additionsLoading && ypAdditions.length === 0 ? (
              <div className="yp-empty">Yükleniyor…</div>
            ) : ypAdditions.length === 0 ? (
              <div className="yp-empty">
                {tab === "add-city"
                  ? "Henüz YP şehri eklenmedi."
                  : "Henüz YP parkı eklenmedi."}
              </div>
            ) : (
              <table className="yp-table">
                <thead>
                  <tr>
                    <th>Ad (EN)</th>
                    {tab === "add-city" ? <th>TR</th> : null}
                    <th>Ülke</th>
                    {tab === "add-park" ? <th>Tür</th> : null}
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {ypAdditions.map((row) => {
                    const key = resultKey(row);
                    return (
                      <tr key={key}>
                        <td>
                          {row.name}{" "}
                          {tab === "add-city" && row.capital ? (
                            <span className="yp-badge">Başkent</span>
                          ) : null}{" "}
                          {tab === "add-city" && row.popular ? (
                            <span className="yp-badge">Popüler</span>
                          ) : null}
                        </td>
                        {tab === "add-city" ? (
                          <td className="yp-muted">{row.nameTr ?? "—"}</td>
                        ) : null}
                        <td>
                          {row.countryName} ({row.countryCode})
                        </td>
                        {tab === "add-park" ? (
                          <td>
                            {row.parkType
                              ? PARK_TYPE_LABELS[row.parkType] ?? row.parkType
                              : "—"}
                          </td>
                        ) : null}
                        <td>
                          <div className="yp-actions">
                            <button
                              type="button"
                              className="yp-btn yp-btn--danger"
                              disabled={Boolean(busyId?.startsWith("delete:"))}
                              onClick={() => void handleDelete(row)}
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}

      {isManageTab ? (
        <>
          <div className="yp-toolbar">
            {!isCountriesTab ? (
              <div className="yp-field">
                <label htmlFor="yp-cat-country">Ülke</label>
                <YpCountrySelect
                  id="yp-cat-country"
                  value={country}
                  onChange={setCountry}
                  emptyLabel="Tümü"
                  showCode
                />
              </div>
            ) : null}
            <div className="yp-field" style={{ minWidth: "14rem", flex: 1 }}>
              <label htmlFor="yp-cat-q">Ara</label>
              <div className="yp-field__input-wrap">
                <input
                  id="yp-cat-q"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={
                    isCountriesTab
                      ? "Kod, EN veya TR (en az 2 karakter)"
                      : "En az 2 karakter"
                  }
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
            {kind === "city" ? (
              <div className="yp-field">
                <label htmlFor="yp-cat-popular">Popüler</label>
                <select
                  id="yp-cat-popular"
                  value={popularFilter}
                  onChange={(e) => setPopularFilter(e.target.value as PopularFilter)}
                >
                  <option value="">Tümü (popüler önce)</option>
                  <option value="popular">Sadece popüler</option>
                  <option value="not_popular">Popüler değil</option>
                </select>
              </div>
            ) : null}
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
              <span className="yp-panel__title-label">
                {isCountriesTab ? "Ülkeler" : "Arama sonuçları"}
              </span>
              {!isCountriesTab && selectedKeys.size > 0 ? (
                <div className="yp-actions">
                  {kind === "city" ? (
                    <>
                      <button
                        type="button"
                        className="yp-btn yp-btn--primary"
                        disabled={busyId === "bulk-popular-on"}
                        onClick={() => void handleBulkPopular(true)}
                      >
                        Popüler yap ({selectedKeys.size})
                      </button>
                      <button
                        type="button"
                        className="yp-btn"
                        disabled={busyId === "bulk-popular-off"}
                        onClick={() => void handleBulkPopular(false)}
                      >
                        Popüler kaldır ({selectedKeys.size})
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="yp-btn yp-btn--danger"
                    disabled={busyId === "bulk-delete"}
                    onClick={() => void handleBulkDelete()}
                  >
                    Sil ({selectedKeys.size})
                  </button>
                </div>
              ) : (
                <span className="yp-muted" style={{ fontWeight: 500, fontSize: "0.78rem" }}>
                  {isCountriesTab
                    ? total > results.length
                      ? `${results.length} / ${total} ülke`
                      : `${results.length} ülke`
                    : kind === "city"
                      ? total > results.length
                        ? `${results.length} / ${total} şehir`
                        : `${results.length} şehir`
                      : total > results.length
                        ? `${results.length} / ${total} park`
                        : `${results.length} park`}
                </span>
              )}
            </div>
            {results.length === 0 ? (
              <div className="yp-empty">
                {isCountriesTab
                  ? loading
                    ? "Yükleniyor…"
                    : "Sonuç yok."
                  : popularFilter === "popular" && q.length < 2 && !country
                    ? "Henüz popüler işaretli şehir yok."
                    : q.length < 2 && !country
                      ? "Listelemek için ülke seç, arama yaz veya popüler filtresi kullan."
                      : "Sonuç yok."}
              </div>
            ) : isCountriesTab ? (
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
                        <td>
                          <code>{row.countryCode}</code>
                        </td>
                        <td>{row.name}</td>
                        <td className="yp-muted">{row.nameTr ?? "—"}</td>
                        <td>
                          {row.trSource === "db" ? (
                            <span className="yp-badge">{trLabel}</span>
                          ) : (
                            trLabel
                          )}
                        </td>
                        <td>
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
            ) : (
              <>
              <table className="yp-table">
                <thead>
                  <tr>
                    <th style={{ width: "2.25rem" }}>
                      <input
                        type="checkbox"
                        aria-label="Tümünü seç"
                        checked={allSelected}
                        disabled={results.length === 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Ad (EN)</th>
                    {kind === "city" ? <th>TR</th> : null}
                    <th>Ülke</th>
                    {kind === "park" ? <th>Tür</th> : null}
                    <th>Kaynak</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row) => {
                    const key = resultKey(row);
                    const checked = selectedKeys.has(key);
                    return (
                      <tr key={key}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${row.name} seç`}
                            checked={checked}
                            onChange={() => toggleSelect(row)}
                          />
                        </td>
                        <td>
                          {row.name}{" "}
                          {kind === "city" && row.capital ? (
                            <span className="yp-badge">Başkent</span>
                          ) : null}{" "}
                          {kind === "city" && row.popular ? (
                            <span className="yp-badge">Popüler</span>
                          ) : null}
                        </td>
                        {kind === "city" ? (
                          <td className="yp-muted">{row.nameTr ?? "—"}</td>
                        ) : null}
                        <td>
                          {row.countryName} ({row.countryCode})
                        </td>
                        {kind === "park" ? (
                          <td>
                            {row.parkType
                              ? PARK_TYPE_LABELS[row.parkType] ?? row.parkType
                              : "—"}
                          </td>
                        ) : null}
                        <td>
                          {row.source === "yp" ? <span className="yp-badge">YP</span> : "Statik"}
                        </td>
                        <td>
                          <div className="yp-actions">
                            {kind === "city" ? (
                              row.popular ? (
                                <button
                                  type="button"
                                  className="yp-btn"
                                  disabled={Boolean(busyId?.startsWith("popular:"))}
                                  onClick={() => void handleSetPopular(row, false)}
                                >
                                  Popüler kaldır
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="yp-btn yp-btn--primary"
                                  disabled={Boolean(busyId?.startsWith("popular:"))}
                                  onClick={() => void handleSetPopular(row, true)}
                                >
                                  Popüler yap
                                </button>
                              )
                            ) : null}
                            <button
                              type="button"
                              className="yp-btn"
                              disabled={busyId?.startsWith("rename:") || busyId === key}
                              onClick={() => openRename(row)}
                            >
                              Yeniden adlandır
                            </button>
                            <button
                              type="button"
                              className="yp-btn yp-btn--danger"
                              disabled={Boolean(busyId?.startsWith("delete:"))}
                              onClick={() => void handleDelete(row)}
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </>
            )}
            {hasMore ? (
              <div style={{ padding: "0.75rem 0.9rem" }}>
                <button
                  type="button"
                  className="yp-btn"
                  disabled={loadingMore || loading}
                  onClick={() => void loadMore()}
                >
                  {loadingMore
                    ? "Yükleniyor…"
                    : `Daha fazla yükle (+${CATALOG_PAGE_SIZE})`}
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

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
            <h2 id="yp-rename-title">
              {isCountriesTab
                ? "Ülke TR adı"
                : kind === "city"
                  ? "Adı düzenle"
                  : "Yeniden adlandır"}
            </h2>
            <p className="yp-muted">
              {isCountriesTab ? (
                <>
                  <code>{renameTarget.countryCode}</code> · {renameTarget.name}
                  {renameTarget.nameTr ? ` / ${renameTarget.nameTr}` : ""}
                </>
              ) : (
                <>
                  {renameTarget.countryName} · {renameTarget.name}
                  {renameTarget.nameTr ? ` / ${renameTarget.nameTr}` : ""}
                </>
              )}
            </p>
            {!isCountriesTab ? (
              <div className="yp-field yp-field--wide" style={{ marginTop: "0.85rem" }}>
                <label htmlFor="yp-rename-input">
                  {kind === "city" ? "Ad (EN)" : "Yeni ad"}
                </label>
                <input
                  id="yp-rename-input"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submitRename();
                    }
                  }}
                />
              </div>
            ) : null}
            {kind === "city" || isCountriesTab ? (
              <div
                className="yp-field yp-field--wide"
                style={{ marginTop: isCountriesTab ? "0.85rem" : "0.65rem" }}
              >
                <label htmlFor="yp-rename-tr-input">Ad (TR)</label>
                <input
                  id="yp-rename-tr-input"
                  autoFocus={isCountriesTab}
                  value={renameTrValue}
                  onChange={(e) => setRenameTrValue(e.target.value)}
                  placeholder="Boş bırakılırsa YP TR etiketi silinir"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submitRename();
                    }
                  }}
                />
              </div>
            ) : null}
            <div className="yp-form-actions" style={{ padding: "0.9rem 0 0" }}>
              <button type="button" className="yp-btn" onClick={() => setRenameTarget(null)}>
                Vazgeç
              </button>
              <button
                type="button"
                className="yp-btn yp-btn--primary"
                onClick={() => void submitRename()}
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
