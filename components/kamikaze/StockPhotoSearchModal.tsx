"use client";

import { useCallback, useEffect, useState } from "react";
import type { StockPhotoHit, StockPhotoProvider } from "@/lib/kamikaze/stock-photos/types";

export type StockPhotoSearchModalLabels = {
  queryLabel: string;
  search: string;
  searching: string;
  empty: string;
  noProviders: string;
  pick: string;
  cancel: string;
  photographer: string;
  loadMore: string;
  noMore: string;
};

type StockPhotoSearchModalProps = {
  skin: "yp" | "hub";
  title: string;
  subtitle: string;
  defaultQuery: string;
  busy?: boolean;
  labels: StockPhotoSearchModalLabels;
  onClose: () => void;
  onSubmit: (imageUrl: string) => Promise<void>;
};

const PROVIDER_LABEL: Record<StockPhotoProvider, string> = {
  pixabay: "Pixabay",
  unsplash: "Unsplash",
  pexels: "Pexels",
};

export function StockPhotoSearchModal({
  skin,
  title,
  subtitle,
  defaultQuery,
  busy = false,
  labels,
  onClose,
  onSubmit,
}: StockPhotoSearchModalProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StockPhotoHit[]>([]);
  const [providers, setProviders] = useState<StockPhotoProvider[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const runSearch = useCallback(
    async (searchQuery: string, nextPage: number) => {
      const q = searchQuery.trim();
      if (!q) return;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/kamikaze/stock-photos?q=${encodeURIComponent(q)}&page=${nextPage}`
        );
        const data = (await res.json()) as {
          results?: StockPhotoHit[];
          providers?: StockPhotoProvider[];
          hasMore?: boolean;
          error?: string;
        };

        if (!res.ok) {
          if (res.status === 503) {
            setResults([]);
            setProviders([]);
            setHasMore(false);
            setError(data.error ?? labels.noProviders);
            return;
          }
          throw new Error(data.error ?? "Arama başarısız");
        }

        const nextResults = data.results ?? [];
        setResults(nextResults);
        setProviders(data.providers ?? []);
        setPage(nextPage);
        setHasMore(Boolean(data.hasMore));

        if (nextResults.length === 0) {
          setError(nextPage > 1 ? labels.noMore : labels.empty);
        }
      } catch (err) {
        setResults([]);
        setHasMore(false);
        setError(err instanceof Error ? err.message : "Arama başarısız");
      } finally {
        setLoading(false);
      }
    },
    [labels.empty, labels.noMore, labels.noProviders]
  );

  useEffect(() => {
    setQuery(defaultQuery);
    void runSearch(defaultQuery, 1);
  }, [defaultQuery, runSearch]);

  function searchFromInput() {
    void runSearch(query, 1);
  }

  function loadNextPage() {
    if (!hasMore || loading) return;
    void runSearch(query, page + 1);
  }

  async function pickHit(hit: StockPhotoHit) {
    setError(null);
    try {
      await onSubmit(hit.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Görsel yüklenemedi");
    }
  }

  const providerHint =
    providers.length > 0 ? providers.map((p) => PROVIDER_LABEL[p]).join(" · ") : null;

  const grid = (
    <>
      <StockPhotoGrid
        results={results}
        loading={loading}
        busy={busy}
        pickLabel={labels.pick}
        photographerLabel={labels.photographer}
        onPick={(hit) => void pickHit(hit)}
      />
      {results.length > 0 && hasMore ? (
        <div className="stock-photo-search__more-row">
          {skin === "hub" ? (
            <button
              type="button"
              className="city-page__hero-master-btn"
              disabled={busy || loading}
              onClick={loadNextPage}
            >
              {loading ? labels.searching : labels.loadMore}
            </button>
          ) : (
            <button
              type="button"
              className="yp-btn"
              disabled={busy || loading}
              onClick={loadNextPage}
            >
              {loading ? labels.searching : labels.loadMore}
            </button>
          )}
        </div>
      ) : null}
    </>
  );

  if (skin === "hub") {
    return (
      <div className="city-page__hero-master-modal" role="presentation">
        <button
          type="button"
          className="city-page__hero-master-modal-backdrop"
          aria-label={labels.cancel}
          disabled={busy || loading}
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-photo-search-title"
          className="city-page__hero-master-modal-sheet city-page__hero-master-modal-sheet--wide"
        >
          <h2 id="stock-photo-search-title" className="city-page__hero-master-modal-title">
            {title}
          </h2>
          <p className="city-page__hero-master-modal-sub">{subtitle}</p>
          {providerHint ? (
            <p className="city-page__hero-master-modal-hint">{providerHint}</p>
          ) : null}
          {error ? <p className="city-page__hero-master-modal-error">{error}</p> : null}
          <label className="city-page__hero-master-modal-label" htmlFor="stock-photo-search-input">
            {labels.queryLabel}
          </label>
          <div className="stock-photo-search__query-row">
            <input
              id="stock-photo-search-input"
              type="search"
              className="city-page__hero-master-modal-input"
              value={query}
              disabled={busy || loading}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  searchFromInput();
                }
              }}
            />
            <button
              type="button"
              className="city-page__hero-master-btn city-page__hero-master-btn--primary"
              disabled={busy || loading}
              onClick={searchFromInput}
            >
              {loading && page === 1 ? labels.searching : labels.search}
            </button>
          </div>
          {grid}
          <div className="city-page__hero-master-modal-actions">
            <button
              type="button"
              className="city-page__hero-master-btn"
              disabled={busy || loading}
              onClick={onClose}
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="yp-rename-modal" role="presentation">
      <button
        type="button"
        className="yp-rename-modal__backdrop"
        aria-label={labels.cancel}
        disabled={busy || loading}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-photo-search-title"
        className="yp-rename-modal__sheet yp-rename-modal__sheet--wide"
      >
        <h2 id="stock-photo-search-title">{title}</h2>
        <p className="yp-muted">{subtitle}</p>
        {providerHint ? (
          <p className="yp-muted" style={{ marginTop: "0.35rem", fontSize: "0.82rem" }}>
            {providerHint}
          </p>
        ) : null}
        {error ? <p className="yp-error">{error}</p> : null}
        <div className="yp-field yp-field--wide" style={{ marginTop: "0.85rem" }}>
          <label htmlFor="stock-photo-search-input">{labels.queryLabel}</label>
          <div className="stock-photo-search__query-row">
            <input
              id="stock-photo-search-input"
              type="search"
              value={query}
              disabled={busy || loading}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  searchFromInput();
                }
              }}
            />
            <button
              type="button"
              className="yp-btn yp-btn--primary"
              disabled={busy || loading}
              onClick={searchFromInput}
            >
              {loading && page === 1 ? labels.searching : labels.search}
            </button>
          </div>
        </div>
        {grid}
        <div className="yp-form-actions" style={{ padding: "0.9rem 0 0" }}>
          <button type="button" className="yp-btn" disabled={busy || loading} onClick={onClose}>
            {labels.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

function StockPhotoGrid({
  results,
  loading,
  busy,
  pickLabel,
  photographerLabel,
  onPick,
}: {
  results: StockPhotoHit[];
  loading: boolean;
  busy: boolean;
  pickLabel: string;
  photographerLabel: string;
  onPick: (hit: StockPhotoHit) => void;
}) {
  if (loading && results.length === 0) {
    return <p className="stock-photo-search__status yp-muted">…</p>;
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <ul className="stock-photo-search__grid" aria-label="Stock photo results">
      {results.map((hit) => (
        <li key={hit.id}>
          <button
            type="button"
            className="stock-photo-search__tile"
            disabled={busy || loading}
            title={pickLabel}
            onClick={() => onPick(hit)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hit.previewUrl} alt="" loading="lazy" />
            <span className="stock-photo-search__badge">{PROVIDER_LABEL[hit.provider]}</span>
            {hit.photographer ? (
              <span className="stock-photo-search__credit">
                {photographerLabel} {hit.photographer}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

export const YP_STOCK_PHOTO_LABELS: StockPhotoSearchModalLabels = {
  queryLabel: "Arama",
  search: "Ara",
  searching: "Aranıyor…",
  empty: "Sonuç yok. Farklı bir arama deneyin.",
  noProviders:
    "Sunucuda stok foto API anahtarı yok (PIXABAY_API_KEY, UNSPLASH_ACCESS_KEY, PEXELS_API_KEY).",
  pick: "Bu fotoğrafı kullan",
  cancel: "Vazgeç",
  photographer: "Foto:",
  loadMore: "Yenilerini getir",
  noMore: "Başka sonuç kalmadı.",
};
