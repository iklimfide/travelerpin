"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useModal } from "@/components/ui/ModalProvider";
import { YpCountrySelect } from "@/components/kamikaze/YpCountrySelect";
import { YpImageUrlImportModal } from "@/components/kamikaze/YpImageUrlImportModal";
import {
  StockPhotoSearchModal,
  YP_STOCK_PHOTO_LABELS,
} from "@/components/kamikaze/StockPhotoSearchModal";
import { invalidateCachedHeroImages } from "@/lib/client/hero-images-cache";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import { YP_CACHE_KEYS, ypCacheGet, ypCacheInvalidate, ypCacheSet } from "@/lib/kamikaze/yp-client-cache";
import {
  parkHeroLookupKey,
  toParkHeroDisplayUrl,
} from "@/lib/park/park-hero-images";
import { parkPlacePath } from "@/lib/utils/hub-place-path";
import { getDefaultParkHeroImage } from "@/lib/utils/park-hero-image";
import { parkTypeLabel } from "@/lib/utils/park-type";
import { PARK_TYPES, type ParkType } from "@/types/database";

type CatalogParkRow = {
  id?: string;
  name: string;
  nameTr?: string | null;
  countryCode: string;
  countryName: string;
  latitude: number | null;
  longitude: number | null;
  parkType: ParkType;
  source: "static" | "yp";
  popular?: boolean;
};

type CustomHeroRow = {
  countryCode: string;
  parkType: ParkType;
  nameKey: string;
  parkName: string;
  imageUrl: string;
};

type PopularFilter = "" | "popular" | "not_popular";
type ListScope = "catalog" | "yp";

const MIN_QUERY_LENGTH = 2;
const ADD_SEARCH_DEBOUNCE_MS = 300;
const CATALOG_PAGE_SIZE = 80;

function resultKey(row: CatalogParkRow): string {
  return `${row.source}:${row.countryCode}:${row.parkType}:${row.name}:${row.id ?? ""}`;
}

function parkRowMatches(
  row: Pick<CatalogParkRow, "countryCode" | "parkType" | "name">,
  countryCode: string,
  parkType: ParkType,
  name: string
): boolean {
  return (
    row.countryCode.toUpperCase() === countryCode.toUpperCase() &&
    row.parkType === parkType &&
    catalogNameKey(row.name) === catalogNameKey(name.trim())
  );
}

export function KamikazeParksPanel() {
  const modal = useModal();
  const [country, setCountry] = useState("");
  const [query, setQuery] = useState("");
  const [popularFilter, setPopularFilter] = useState<PopularFilter>("");
  const [listScope, setListScope] = useState<ListScope>("catalog");
  const [results, setResults] = useState<CatalogParkRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [customImages, setCustomImages] = useState<Map<string, string>>(() => new Map());
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [renameTarget, setRenameTarget] = useState<CatalogParkRow | null>(null);
  const [urlImportTarget, setUrlImportTarget] = useState<CatalogParkRow | null>(null);
  const [stockSearchTarget, setStockSearchTarget] = useState<CatalogParkRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameTrValue, setRenameTrValue] = useState("");
  const fileInputsRef = useRef<Map<string, HTMLInputElement>>(new Map());

  const [formName, setFormName] = useState("");
  const [formNameTr, setFormNameTr] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formParkType, setFormParkType] = useState<ParkType>("national_park");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formPopular, setFormPopular] = useState(false);
  const [addSearchResults, setAddSearchResults] = useState<CatalogParkRow[]>([]);
  const [addSearchLoading, setAddSearchLoading] = useState(false);
  const [addSearchDone, setAddSearchDone] = useState(false);

  const canBrowse =
    listScope === "yp" ||
    Boolean(country) ||
    query.trim().length >= MIN_QUERY_LENGTH ||
    Boolean(popularFilter);

  useEffect(() => {
    if (!canBrowse) return;

    let cancelled = false;
    void fetch("/api/kamikaze/park-images")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { images?: CustomHeroRow[] } | null) => {
        if (cancelled || !data?.images) return;
        const next = new Map<string, string>();
        for (const row of data.images) {
          next.set(parkHeroLookupKey(row.countryCode, row.parkName, row.parkType), row.imageUrl);
        }
        setCustomImages(next);
      })
      .catch(() => {
        /* best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, [canBrowse]);

  const loadList = useCallback(
    async (mode: "replace" | "append" = "replace", options?: { force?: boolean; offset?: number }) => {
      if (!canBrowse) {
        setResults([]);
        setHasMore(false);
        setNextOffset(0);
        setTotal(0);
        setSelectedKeys(new Set());
        return;
      }

      const cacheKey = YP_CACHE_KEYS.catalog("park", listScope, country, query, popularFilter);
      const offset = options?.offset ?? 0;

      if (mode === "replace" && !options?.force) {
        const cached = ypCacheGet<{
          results: CatalogParkRow[];
          hasMore: boolean;
          nextOffset: number;
          total: number;
        }>(cacheKey);
        if (cached) {
          setResults(cached.results);
          setHasMore(cached.hasMore);
          setNextOffset(cached.nextOffset);
          setTotal(cached.total);
          setSelectedKeys(new Set());
          setLoading(false);
          return;
        }
      }

      if (mode === "replace") setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          kind: "park",
          offset: String(offset),
          limit: String(CATALOG_PAGE_SIZE),
        });
        if (country) params.set("country", country);
        if (query.trim()) params.set("q", query.trim());
        if (popularFilter) params.set("popularFilter", popularFilter);
        if (listScope === "yp") params.set("ypOnly", "1");

        const res = await fetch(`/api/kamikaze/catalog?${params}`);
        const data = (await res.json()) as {
          results?: CatalogParkRow[];
          hasMore?: boolean;
          nextOffset?: number;
          total?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Parklar yüklenemedi");

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
          });
          return nextResults;
        });
        setHasMore(nextHasMore);
        setNextOffset(nextOff);
        setTotal(nextTotal);
        if (mode === "replace") setSelectedKeys(new Set());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Parklar yüklenemedi");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [canBrowse, country, query, popularFilter, listScope]
  );

  useEffect(() => {
    if (!canBrowse) {
      setResults([]);
      setHasMore(false);
      setNextOffset(0);
      setTotal(0);
      setSelectedKeys(new Set());
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void loadList("replace");
    }, 280);
    return () => window.clearTimeout(timer);
  }, [canBrowse, loadList]);

  useEffect(() => {
    const queryText = formName.trim();
    if (queryText.length < MIN_QUERY_LENGTH) {
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
        const params = new URLSearchParams({ kind: "park", q: queryText });
        if (formCountry) params.set("country", formCountry);
        const res = await fetch(`/api/kamikaze/catalog?${params}`, { signal: controller.signal });
        const data = (await res.json()) as { results?: CatalogParkRow[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Arama başarısız");
        setAddSearchResults(data.results ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAddSearchResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setAddSearchLoading(false);
          setAddSearchDone(true);
        }
      }
    }, ADD_SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [formName, formCountry, formParkType]);

  const exactParkMatch = useMemo(() => {
    const name = formName.trim();
    if (!name || !formCountry) return null;
    return (
      addSearchResults.find((row) =>
        parkRowMatches(row, formCountry, formParkType, name)
      ) ?? null
    );
  }, [formName, formCountry, formParkType, addSearchResults]);

  const canAddPark =
    Boolean(formCountry) &&
    formName.trim().length >= MIN_QUERY_LENGTH &&
    addSearchDone &&
    !addSearchLoading &&
    !exactParkMatch;

  const allSelected =
    results.length > 0 && results.every((row) => selectedKeys.has(resultKey(row)));

  function heroKey(row: Pick<CatalogParkRow, "countryCode" | "name" | "parkType">): string {
    return parkHeroLookupKey(row.countryCode, row.name, row.parkType);
  }

  function resolveCustomUrl(row: CatalogParkRow): string | null {
    const stored = customImages.get(heroKey(row));
    return stored ? toParkHeroDisplayUrl(stored, row.parkType) : null;
  }

  function selectListScope(next: ListScope) {
    if (next === listScope) return;
    setListScope(next);
    setSelectedKeys(new Set());
  }

  async function postAction(body: Record<string, unknown>, busy: string) {
    setBusyId(busy);
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
      await loadList("replace", { force: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setBusyId(null);
    }
  }

  async function postHeroImage(
    row: CatalogParkRow,
    payload: { file?: File; imageUrl?: string }
  ) {
    const key = heroKey(row);
    setBusyKey(key);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("countryCode", row.countryCode);
      formData.set("parkName", row.name);
      formData.set("parkType", row.parkType);
      if (payload.file) formData.set("file", payload.file);
      else if (payload.imageUrl) formData.set("imageUrl", payload.imageUrl);
      const res = await fetch("/api/kamikaze/park-images", { method: "POST", body: formData });
      const data = (await res.json()) as { image?: CustomHeroRow; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Görsel yüklenemedi");
      if (data.image) {
        invalidateCachedHeroImages();
        const storedUrl = data.image.imageUrl;
        const lookup = parkHeroLookupKey(
          data.image.countryCode,
          data.image.parkName,
          data.image.parkType
        );
        const rowLookup = heroKey(row);
        setCustomImages((prev) => {
          const next = new Map(prev);
          next.set(lookup, storedUrl);
          next.set(rowLookup, storedUrl);
          return next;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Görsel yüklenemedi";
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setBusyKey(null);
    }
  }

  async function uploadImage(row: CatalogParkRow, file: File) {
    await postHeroImage(row, { file });
  }

  async function uploadImageFromUrl(row: CatalogParkRow, imageUrl: string) {
    await postHeroImage(row, { imageUrl });
  }

  async function removeImage(row: CatalogParkRow) {
    const key = heroKey(row);
    setBusyKey(key);
    setError(null);
    try {
      const res = await fetch("/api/kamikaze/park-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: row.countryCode,
          parkName: row.name,
          parkType: row.parkType,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Görsel kaldırılamadı");
      invalidateCachedHeroImages();
      setCustomImages((prev) => {
        const next = new Map(prev);
        for (const mapKey of prev.keys()) {
          if (
            mapKey === key ||
            mapKey === parkHeroLookupKey(row.countryCode, row.name, row.parkType)
          ) {
            next.delete(mapKey);
          }
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Görsel kaldırılamadı");
    } finally {
      setBusyKey(null);
    }
  }

  function openRename(row: CatalogParkRow) {
    setRenameTarget(row);
    setRenameValue(row.name);
    setRenameTrValue(row.nameTr ?? "");
  }

  async function submitRename() {
    if (!renameTarget) return;
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
    const key = `rename:${row.source}:${row.countryCode}:${row.parkType}:${row.name}`;

    if (nameUnchanged) {
      await postAction(
        {
          action: "set_name_tr",
          countryCode: row.countryCode,
          name: row.name,
          nameTr: nextTr || null,
          parkType: row.parkType,
        },
        key
      );
      return;
    }

    await postAction(
      {
        action: "rename",
        kind: "park",
        countryCode: row.countryCode,
        oldName: row.name,
        newName: next,
        nameTr: nextTr || null,
        source: row.source,
        id: row.id,
        latitude: row.latitude,
        longitude: row.longitude,
        parkType: row.parkType,
      },
      key
    );
    setCountry(row.countryCode);
    setQuery(next);
  }

  async function handleDelete(row: CatalogParkRow) {
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
    await postAction(
      {
        action: "delete",
        kind: "park",
        countryCode: row.countryCode,
        name: row.name,
        source: row.source,
        id: row.id,
      },
      `delete:${row.source}:${row.id ?? row.name}:${row.countryCode}`
    );
  }

  async function handleSetPopular(row: CatalogParkRow, isPopular: boolean) {
    await postAction(
      {
        action: "set_popular",
        countryCode: row.countryCode,
        name: row.name,
        isPopular,
        parkType: row.parkType,
      },
      `popular:${row.countryCode}:${row.parkType}:${row.name}:${isPopular ? "1" : "0"}`
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
        kind: "park",
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
    const selected = selectedRows();
    if (selected.length === 0) return;
    const ok = await modal.confirm(
      isPopular
        ? `${selected.length} parke Popüler etiketi eklensin mi?`
        : `${selected.length} parkten Popüler etiketi kaldırılsın mı?`,
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
          parkType: row.parkType,
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
    if (!formCountry) {
      setError("Ülke seçmelisin");
      return;
    }
    if (!canAddPark) {
      setError(
        exactParkMatch
          ? "Bu park zaten katalogda"
          : "Eklemeden önce park adını yazıp aramanın bitmesini bekle"
      );
      return;
    }

    await postAction(
      {
        action: "add_park",
        name: formName,
        nameTr: formNameTr.trim() || null,
        countryCode: formCountry,
        parkType: formParkType,
        latitude,
        longitude,
        isPopular: formPopular,
      },
      "add"
    );
    setFormPopular(false);
    setFormCountry("");
    setFormNameTr("");
    setFormName("");
    setFormLat("");
    setFormLng("");
    setAddSearchResults([]);
    setAddSearchDone(false);
  }

  function renderFileInput(row: CatalogParkRow, inputId: string) {
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

  function renderPhotoActions(row: CatalogParkRow) {
    const key = heroKey(row);
    const customUrl = resolveCustomUrl(row);
    const busy = busyKey === key;
    const inputId = `yp-park-photo-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

    return (
      <>
        {renderFileInput(row, inputId)}
        <button
          type="button"
          className="yp-btn yp-btn--primary"
          disabled={busy}
          onClick={() => fileInputsRef.current.get(key)?.click()}
        >
          {busy ? "…" : customUrl ? "Foto değiştir" : "Foto yükle"}
        </button>
        <button
          type="button"
          className="yp-btn"
          disabled={busy}
          onClick={() => setUrlImportTarget(row)}
        >
          Linkten
        </button>
        <button
          type="button"
          className="yp-btn"
          disabled={busy}
          onClick={() => setStockSearchTarget(row)}
        >
          Stok ara
        </button>
        {customUrl ? (
          <button
            type="button"
            className="yp-btn"
            disabled={busy}
            onClick={() => void removeImage(row)}
          >
            Foto kaldır
          </button>
        ) : null}
      </>
    );
  }

  function renderResultRow(row: CatalogParkRow) {
    const key = resultKey(row);
    const rowBusyKey = heroKey(row);
    const customUrl = resolveCustomUrl(row);
    const checked = selectedKeys.has(key);

    return (
      <tr key={key}>
        <td className="yp-table__check">
          <input
            type="checkbox"
            aria-label={`${row.name} seç`}
            checked={checked}
            onChange={() => {
              setSelectedKeys((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              });
            }}
          />
        </td>
        <td className="yp-table__thumb">
          <div className="yp-city-thumb-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="yp-city-thumb"
              src={customUrl ?? getDefaultParkHeroImage(row.parkType)}
              alt=""
            />
          </div>
        </td>
        <td className="yp-table__name">
          <a
            href={parkPlacePath(row.name, row.countryCode)}
            className="yp-link yp-city-name"
            target="_blank"
            rel="noopener noreferrer"
          >
            {row.name}
          </a>{" "}
          {row.popular ? <span className="yp-badge">Popüler</span> : null}
        </td>
        <td className="yp-table__tr yp-muted">{row.nameTr ?? "—"}</td>
        <td className="yp-table__type yp-muted">{parkTypeLabel(row.parkType)}</td>
        <td className="yp-table__actions">
          <div className="yp-actions">
            {renderPhotoActions(row)}
            {row.popular ? (
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
                className="yp-btn"
                disabled={Boolean(busyId?.startsWith("popular:"))}
                onClick={() => void handleSetPopular(row, true)}
              >
                Popüler yap
              </button>
            )}
            <button
              type="button"
              className="yp-btn"
              disabled={busyId?.startsWith("rename:") || busyKey === rowBusyKey}
              onClick={() => openRename(row)}
            >
              Düzenle
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
  }

  return (
    <div>
      <h1>Parklar</h1>
      <p className="yp-main__lead">
        Tek yerden park ekle, popüler işaretle, yeniden adlandır ve kapak fotoğrafı yükle.
        Kullanıcı pinleri silinmez.
      </p>

      {error ? <p className="yp-error">{error}</p> : null}

      <div className="yp-panel">
        <div className="yp-panel__title">Yeni park ekle</div>
        <form onSubmit={(e) => void handleAdd(e)}>
          <div className="yp-form-grid yp-form-grid--inline yp-form-grid--inline-park">
            <div className="yp-field">
              <label htmlFor="yp-park-add-name">Park adı</label>
              <input
                id="yp-park-add-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ara…"
                autoComplete="off"
              />
            </div>
            <div className="yp-field">
              <label htmlFor="yp-park-add-name-tr">TR</label>
              <input
                id="yp-park-add-name-tr"
                value={formNameTr}
                onChange={(e) => setFormNameTr(e.target.value)}
                placeholder="Göreme"
                autoComplete="off"
              />
            </div>
            <div className="yp-field">
              <label htmlFor="yp-park-add-country">Ülke</label>
              <YpCountrySelect
                id="yp-park-add-country"
                value={formCountry}
                onChange={setFormCountry}
                emptyLabel="Ülke seç"
              />
            </div>
            <div className="yp-field">
              <label htmlFor="yp-park-add-type">Tür</label>
              <select
                id="yp-park-add-type"
                value={formParkType}
                onChange={(e) => setFormParkType(e.target.value as ParkType)}
              >
                {PARK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {parkTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formName.trim().length > 0 && formName.trim().length < MIN_QUERY_LENGTH ? (
            <p className="yp-muted" style={{ padding: "0 0.9rem", margin: 0, fontSize: "0.85rem" }}>
              Arama için en az {MIN_QUERY_LENGTH} karakter yaz.
            </p>
          ) : null}
          {addSearchLoading ? (
            <p className="yp-muted" style={{ padding: "0 0.9rem", margin: 0, fontSize: "0.85rem" }}>
              Aranıyor…
            </p>
          ) : null}
          {exactParkMatch ? (
            <p className="yp-muted" style={{ padding: "0 0.9rem", margin: 0, fontSize: "0.85rem" }}>
              Bu park zaten katalogda — aşağıdaki listeden düzenleyebilirsin.
            </p>
          ) : null}
          {canAddPark ? (
            <div className="yp-form-grid yp-form-grid--inline yp-form-grid--aux">
              <div className="yp-field">
                <label htmlFor="yp-park-add-lat">Enlem (isteğe bağlı)</label>
                <input
                  id="yp-park-add-lat"
                  inputMode="decimal"
                  value={formLat}
                  onChange={(e) => setFormLat(e.target.value)}
                />
              </div>
              <div className="yp-field">
                <label htmlFor="yp-park-add-lng">Boylam (isteğe bağlı)</label>
                <input
                  id="yp-park-add-lng"
                  inputMode="decimal"
                  value={formLng}
                  onChange={(e) => setFormLng(e.target.value)}
                />
              </div>
              <div className="yp-field">
                <label htmlFor="yp-park-add-popular">Popüler</label>
                <label
                  htmlFor="yp-park-add-popular"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    textTransform: "none",
                    letterSpacing: "normal",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    minHeight: "2.05rem",
                  }}
                >
                  <input
                    id="yp-park-add-popular"
                    type="checkbox"
                    checked={formPopular}
                    onChange={(e) => setFormPopular(e.target.checked)}
                  />
                  Popüler etiketi ekle
                </label>
              </div>
              <div className="yp-form-actions yp-form-actions--inline">
                <button type="submit" className="yp-btn yp-btn--primary" disabled={busyId === "add"}>
                  Ekle
                </button>
              </div>
            </div>
          ) : null}
        </form>
      </div>

      <div className="yp-toolbar yp-toolbar--inline">
        <div className="yp-field yp-field--filter-country">
          <label htmlFor="yp-park-browse-country">Ülke (süzgeç)</label>
          <YpCountrySelect
            id="yp-park-browse-country"
            value={country}
            onChange={setCountry}
            emptyLabel="Tümü"
            showCode
          />
        </div>
        <div className="yp-field yp-field--filter-q">
          <label htmlFor="yp-park-browse-q">Park ara</label>
          <div className="yp-field__input-wrap">
            <input
              id="yp-park-browse-q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="En az 2 karakter"
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
        <div className="yp-field yp-field--filter-popular">
          <label htmlFor="yp-park-popular">Popüler</label>
          <select
            id="yp-park-popular"
            value={popularFilter}
            onChange={(e) => setPopularFilter(e.target.value as PopularFilter)}
          >
            <option value="">Tümü (popüler önce)</option>
            <option value="popular">Sadece popüler</option>
            <option value="not_popular">Popüler değil</option>
          </select>
        </div>
        <button
          type="button"
          className="yp-btn"
          onClick={() => void loadList("replace", { force: true })}
          disabled={loading}
        >
          {loading ? "Yükleniyor…" : "Yenile"}
        </button>
      </div>

      <div className="yp-panel">
        <div className="yp-panel__title">
          <div className="yp-panel__title-start">
            <div className="yp-tabs yp-tabs--inline" role="tablist" aria-label="Liste kapsamı">
              <button
                type="button"
                aria-selected={listScope === "catalog"}
                onClick={() => selectListScope("catalog")}
              >
                Katalog
              </button>
              <button
                type="button"
                aria-selected={listScope === "yp"}
                onClick={() => selectListScope("yp")}
              >
                YP eklemeleri
              </button>
            </div>
          </div>
          {selectedKeys.size > 0 ? (
            <div className="yp-actions">
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
              {!canBrowse
                ? "Listelemek için ülke seç, arama yaz veya popüler filtresi kullan"
                : total > results.length
                  ? `${results.length} / ${total} park`
                  : `${results.length} park`}
            </span>
          )}
        </div>
        {!canBrowse ? (
          <div className="yp-empty">
            Listelemek için ülke seç, en az {MIN_QUERY_LENGTH} karakterlik arama yaz veya popüler
            filtresi kullan.
          </div>
        ) : loading && results.length === 0 ? (
          <div className="yp-empty">Yükleniyor…</div>
        ) : results.length === 0 ? (
          <div className="yp-empty">
            {listScope === "yp"
              ? "Sonuç yok. Henüz YP ile eklenen park yok veya süzgeçe uymuyor."
              : "Sonuç yok. Katalogda yoksa yukarıdaki formdan ekleyebilirsin."}
          </div>
        ) : (
          <>
            <div className="yp-table-wrap">
              <table className="yp-table yp-table--city-images yp-table--parks">
                <colgroup>
                  <col className="yp-col-check" />
                  <col className="yp-col-thumb" />
                  <col className="yp-col-name" />
                  <col className="yp-col-tr" />
                  <col className="yp-col-type" />
                  <col className="yp-col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="yp-table__check">
                      <input
                        type="checkbox"
                        aria-label="Tümünü seç"
                        checked={allSelected}
                        onChange={() => {
                          if (allSelected) setSelectedKeys(new Set());
                          else setSelectedKeys(new Set(results.map((row) => resultKey(row))));
                        }}
                      />
                    </th>
                    <th className="yp-table__thumb">Önizleme</th>
                    <th className="yp-table__name">Ad</th>
                    <th className="yp-table__tr">TR</th>
                    <th className="yp-table__type">Tür</th>
                    <th className="yp-table__actions">İşlemler</th>
                  </tr>
                </thead>
                <tbody>{results.map(renderResultRow)}</tbody>
              </table>
            </div>
            {hasMore ? (
              <div style={{ padding: "0.75rem 0.9rem" }}>
                <button
                  type="button"
                  className="yp-btn"
                  disabled={loadingMore || loading}
                  onClick={() => void loadList("append", { force: true, offset: nextOffset })}
                >
                  {loadingMore ? "Yükleniyor…" : `Daha fazla yükle (+${CATALOG_PAGE_SIZE})`}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {stockSearchTarget ? (
        <StockPhotoSearchModal
          key={`stock-${heroKey(stockSearchTarget)}`}
          skin="yp"
          title="Stok foto ara"
          subtitle={`${stockSearchTarget.countryName} · ${parkTypeLabel(stockSearchTarget.parkType)} · ${stockSearchTarget.name}`}
          defaultQuery={stockSearchTarget.name}
          busy={busyKey === heroKey(stockSearchTarget)}
          labels={YP_STOCK_PHOTO_LABELS}
          onClose={() => setStockSearchTarget(null)}
          onSubmit={async (imageUrl) => {
            await uploadImageFromUrl(stockSearchTarget, imageUrl);
            setStockSearchTarget(null);
          }}
        />
      ) : null}

      {urlImportTarget ? (
        <YpImageUrlImportModal
          key={heroKey(urlImportTarget)}
          title="Linkten foto ekle"
          subtitle={`${urlImportTarget.countryName} · ${parkTypeLabel(urlImportTarget.parkType)} · ${urlImportTarget.name}`}
          busy={busyKey === heroKey(urlImportTarget)}
          onClose={() => setUrlImportTarget(null)}
          onSubmit={async (imageUrl) => {
            await uploadImageFromUrl(urlImportTarget, imageUrl);
            setUrlImportTarget(null);
          }}
        />
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
            aria-labelledby="yp-park-rename-title"
            className="yp-rename-modal__sheet"
          >
            <h2 id="yp-park-rename-title">Adı düzenle</h2>
            <p className="yp-muted">
              {renameTarget.countryName} · {parkTypeLabel(renameTarget.parkType)} ·{" "}
              {renameTarget.name}
              {renameTarget.nameTr ? ` / ${renameTarget.nameTr}` : ""}
            </p>
            <div className="yp-field yp-field--wide" style={{ marginTop: "0.85rem" }}>
              <label htmlFor="yp-park-rename-en">Ad (EN)</label>
              <input
                id="yp-park-rename-en"
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
            <div className="yp-field yp-field--wide" style={{ marginTop: "0.65rem" }}>
              <label htmlFor="yp-park-rename-tr">TR</label>
              <input
                id="yp-park-rename-tr"
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
