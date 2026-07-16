"use client";

import { useCallback, useEffect, useState } from "react";
import { useModal } from "@/components/ui/ModalProvider";
import { COUNTRY_LIST } from "@/lib/data/countries";
import { YP_CACHE_KEYS, ypCacheGet, ypCacheInvalidate, ypCacheSet } from "@/lib/kamikaze/yp-client-cache";
import { PARK_TYPES, type ParkType } from "@/types/database";

type Kind = "city" | "park";
type CatalogTab = "cities" | "parks" | "add-city" | "add-park";

type CatalogResult = {
  id?: string;
  name: string;
  countryCode: string;
  countryName: string;
  latitude: number | null;
  longitude: number | null;
  parkType?: ParkType;
  source: "static" | "yp";
  popular?: boolean;
};

type CatalogCachePayload = {
  results: CatalogResult[];
};

const PARK_TYPE_LABELS: Record<ParkType, string> = {
  national_park: "Milli park",
  theme_park: "Tema parkı",
  botanical_garden: "Botanik bahçesi",
};

/** TR first, then the rest in alphabetical order. */
const YP_COUNTRY_LIST = [
  ...COUNTRY_LIST.filter((c) => c.code === "TR"),
  ...COUNTRY_LIST.filter((c) => c.code !== "TR"),
];

export function KamikazeCatalogPanel() {
  const modal = useModal();
  const [tab, setTab] = useState<CatalogTab>("cities");
  const [country, setCountry] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [renameTarget, setRenameTarget] = useState<CatalogResult | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [formName, setFormName] = useState("");
  const [formCountry, setFormCountry] = useState("TR");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formParkType, setFormParkType] = useState<ParkType>("national_park");
  const [ypAdditions, setYpAdditions] = useState<CatalogResult[]>([]);
  const [additionsLoading, setAdditionsLoading] = useState(false);

  const kind: Kind = tab === "parks" || tab === "add-park" ? "park" : "city";
  const isManageTab = tab === "cities" || tab === "parks";
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
    async (options?: { force?: boolean }) => {
      if (!isManageTab) return;
      const cacheKey = YP_CACHE_KEYS.catalog(kind, country, q);
      if (!options?.force) {
        const cached = ypCacheGet<CatalogCachePayload>(cacheKey);
        if (cached) {
          setResults(cached.results);
          setSelectedKeys(new Set());
          setLoading(false);
          setError(null);
          return;
        }
      }

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ kind });
        if (country) params.set("country", country);
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`/api/kamikaze/catalog?${params}`);
        const data = (await res.json()) as {
          results?: CatalogResult[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Katalog yüklenemedi");
        const nextResults = data.results ?? [];
        setResults(nextResults);
        setSelectedKeys(new Set());
        ypCacheSet(cacheKey, { results: nextResults } satisfies CatalogCachePayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Katalog yüklenemedi");
      } finally {
        setLoading(false);
      }
    },
    [kind, country, q, isManageTab]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadAdditions();
  }, [loadAdditions]);

  function selectTab(next: CatalogTab) {
    setTab(next);
    setError(null);
    setSelectedKeys(new Set());
    setRenameTarget(null);
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
        await load({ force: true });
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
  }

  async function submitRename() {
    if (!renameTarget) return;
    const next = renameValue.trim();
    if (!next) {
      setError("Yeni ad boş olamaz");
      return;
    }
    if (next === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    const row = renameTarget;
    setRenameTarget(null);
    const key = `rename:${row.source}:${row.countryCode}:${row.name}`;
    await postAction(
      {
        action: "rename",
        kind,
        countryCode: row.countryCode,
        oldName: row.name,
        newName: next,
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
      await postAction(
        {
          action: "add_city",
          name: formName,
          countryCode: formCountry,
          latitude,
          longitude,
        },
        "add"
      );
    } else {
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
    }
    setFormName("");
    setFormLat("");
    setFormLng("");
  }

  return (
    <div>
      <h1>Katalog</h1>
      <p className="yp-main__lead">
        Şehir/park ekle, yeniden adlandır veya katalogdan sil. Kullanıcı pinleri silinmez.
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
                  <select
                    id="yp-add-country"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                  >
                    {YP_COUNTRY_LIST.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {tab === "add-park" ? (
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
                ) : null}
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
                    <th>Ad</th>
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
                          {tab === "add-city" && row.popular ? (
                            <span className="yp-badge">Popüler</span>
                          ) : null}
                        </td>
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
            <div className="yp-field">
              <label htmlFor="yp-cat-country">Ülke</label>
              <select
                id="yp-cat-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">Tümü</option>
                {YP_COUNTRY_LIST.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="yp-field" style={{ minWidth: "14rem", flex: 1 }}>
              <label htmlFor="yp-cat-q">Ara</label>
              <input
                id="yp-cat-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="En az 2 karakter"
              />
            </div>
            <button
              type="button"
              className="yp-btn"
              onClick={() => void load({ force: true })}
              disabled={loading}
            >
              {loading ? "Yükleniyor…" : "Yenile"}
            </button>
          </div>

          <div className="yp-panel">
            <div className="yp-panel__title">
              <span className="yp-panel__title-label">Arama sonuçları</span>
              {selectedKeys.size > 0 ? (
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
                  Checkbox ile seç → toplu işlem
                </span>
              )}
            </div>
            {results.length === 0 ? (
              <div className="yp-empty">
                {q.length < 2 && !country
                  ? "Listelemek için ülke seç veya arama yaz."
                  : "Sonuç yok."}
              </div>
            ) : (
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
                    <th>Ad</th>
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
                          {kind === "city" && row.popular ? (
                            <span className="yp-badge">Popüler</span>
                          ) : null}
                        </td>
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
            )}
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
            <h2 id="yp-rename-title">Yeniden adlandır</h2>
            <p className="yp-muted">
              {renameTarget.countryName} · {renameTarget.name}
            </p>
            <div className="yp-field yp-field--wide" style={{ marginTop: "0.85rem" }}>
              <label htmlFor="yp-rename-input">Yeni ad</label>
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
