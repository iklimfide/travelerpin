"use client";

import { useMemo, useState } from "react";
import type { InstagramImportReviewItemPublic } from "@/lib/kamikaze/instagram-export/review-session";

export type ReviewCityOption = {
  bucket: string;
  label: string;
  city_name: string;
  country_code: string;
  country_name?: string;
};

export type ClientReviewRow = InstagramImportReviewItemPublic & {
  approved: boolean;
  city_name: string;
  country_code: string;
  country_name: string;
};

type FilterMode = "all" | "approved" | "pending" | "unassigned";

function rowsFromItems(items: InstagramImportReviewItemPublic[]): ClientReviewRow[] {
  return items.map((item) => ({
    ...item,
    approved: item.suggestedApproved,
    city_name: item.city.city_name,
    country_code: item.city.country_code,
    country_name: item.city.country_name,
  }));
}

function cityLabel(row: ClientReviewRow): string {
  if (!row.city_name || !row.country_code) return "(atanmamış)";
  return `${row.city_name}, ${row.country_code}`;
}

type Props = {
  sessionId: string;
  rows: ClientReviewRow[];
  cityOptions: ReviewCityOption[];
  busy: boolean;
  onRowsChange: (rows: ClientReviewRow[]) => void;
  onApplyApproved: () => void;
};

export function KamikazeInstagramImportReview({
  sessionId,
  rows,
  cityOptions,
  busy,
  onRowsChange,
  onApplyApproved,
}: Props) {
  const [filter, setFilter] = useState<FilterMode>("pending");

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const unassigned = !row.city_name || !row.country_code;
      if (filter === "approved") return row.approved;
      if (filter === "pending") return !row.approved || unassigned;
      if (filter === "unassigned") return unassigned;
      return true;
    });
  }, [filter, rows]);

  const approvedCount = rows.filter((r) => r.approved && r.city_name && r.country_code).length;

  function patchRow(id: string, patch: Partial<ClientReviewRow>) {
    onRowsChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function applyCityOption(id: string, bucket: string) {
    const opt = cityOptions.find((c) => c.bucket === bucket);
    if (!opt) return;
    patchRow(id, {
      city_name: opt.city_name,
      country_code: opt.country_code,
      country_name: opt.country_name ?? opt.country_code,
    });
  }

  function selectAllPendingApproved(value: boolean) {
    onRowsChange(
      rows.map((row) => {
        const hasCity = Boolean(row.city_name && row.country_code);
        if (!hasCity) return { ...row, approved: false };
        if (row.city.bucket === "__unassigned__" && !row.city_name) return row;
        return { ...row, approved: value && hasCity };
      })
    );
  }

  const optionList = useMemo(() => {
    const map = new Map(cityOptions.map((c) => [c.bucket, c]));
    for (const row of rows) {
      if (!row.city_name || !row.country_code) continue;
      const bucket = `${row.country_code.toUpperCase()}|${row.city_name}`;
      if (!map.has(bucket)) {
        map.set(bucket, {
          bucket,
          label: `${row.city_name}, ${row.country_code}`,
          city_name: row.city_name,
          country_code: row.country_code,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [cityOptions, rows]);

  return (
    <section className="yp-panel__section">
      <h2 className="yp-panel__section-title">Foto · şehir onayı</h2>
      <p className="yp-muted" style={{ fontSize: "0.85rem" }}>
        Oturum: <code>{sessionId.slice(0, 10)}…</code> · {rows.length} foto · onaylı{" "}
        {approvedCount}. ZIP sunucuda ~3 saat tutulur; onayladıkların R2’ye gider.
      </p>

      <div className="yp-form-actions" style={{ paddingTop: "0.5rem", flexWrap: "wrap" }}>
        <select
          className="yp-input"
          value={filter}
          disabled={busy}
          onChange={(e) => setFilter(e.target.value as FilterMode)}
        >
          <option value="pending">İnceleme bekleyen</option>
          <option value="unassigned">Atanmamış şehir</option>
          <option value="approved">Onaylı</option>
          <option value="all">Tümü</option>
        </select>
        <button type="button" className="yp-btn" disabled={busy} onClick={() => selectAllPendingApproved(true)}>
          Şehri olanların hepsini onayla
        </button>
        <button type="button" className="yp-btn" disabled={busy} onClick={() => selectAllPendingApproved(false)}>
          Onayları kaldır
        </button>
        <button
          type="button"
          className="yp-btn yp-btn--primary"
          disabled={busy || approvedCount === 0}
          onClick={onApplyApproved}
        >
          {busy ? "Yükleniyor…" : `Onaylananları yükle (${approvedCount})`}
        </button>
      </div>

      <ul className="yp-media-fix-grid" style={{ marginTop: "0.85rem" }}>
        {filtered.map((row) => {
          const thumb = `/api/kamikaze/instagram-import/thumb?sessionId=${encodeURIComponent(sessionId)}&itemId=${encodeURIComponent(row.id)}`;
          const bucketKey =
            row.city_name && row.country_code
              ? optionList.find(
                  (o) =>
                    o.city_name === row.city_name &&
                    o.country_code.toUpperCase() === row.country_code.toUpperCase()
                )?.bucket ?? ""
              : "";

          return (
            <li
              key={row.id}
              className={`yp-media-fix-card${!row.approved ? " yp-media-fix-card--dup" : ""}`}
            >
              <label className="yp-check" style={{ display: "flex", gap: "0.4rem", fontSize: "0.82rem" }}>
                <input
                  type="checkbox"
                  checked={row.approved}
                  disabled={busy}
                  onChange={(e) => patchRow(row.id, { approved: e.target.checked })}
                />
                Yükle
              </label>
              <div className="yp-media-fix-card__thumb">
                {row.hasFile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" loading="lazy" />
                ) : (
                  <span className="yp-muted">dosya yok</span>
                )}
              </div>
              <p className="yp-media-fix-card__place">{cityLabel(row)}</p>
              {row.locationLabel ? (
                <p className="yp-muted" style={{ fontSize: "0.75rem", margin: 0 }}>
                  Konum: {row.locationLabel}
                </p>
              ) : null}
              {row.hashtags.length > 0 ? (
                <p className="yp-muted" style={{ fontSize: "0.75rem", margin: 0 }}>
                  {row.hashtags.slice(0, 6).map((t) => `#${t}`).join(" ")}
                </p>
              ) : null}
              <label className="yp-media-fix-card__label">
                Şehir
                <select
                  className="yp-input"
                  value={bucketKey}
                  disabled={busy}
                  onChange={(e) => {
                    if (e.target.value) applyCityOption(row.id, e.target.value);
                  }}
                >
                  <option value="">— seç —</option>
                  {optionList.map((opt) => (
                    <option key={opt.bucket} value={opt.bucket}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 3.5rem", gap: "0.35rem" }}>
                <input
                  className="yp-input"
                  placeholder="City"
                  value={row.city_name}
                  disabled={busy}
                  onChange={(e) => patchRow(row.id, { city_name: e.target.value })}
                />
                <input
                  className="yp-input"
                  placeholder="TR"
                  maxLength={2}
                  value={row.country_code}
                  disabled={busy}
                  onChange={(e) =>
                    patchRow(row.id, { country_code: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <p className="yp-muted" style={{ fontSize: "0.72rem", margin: 0 }}>
                {row.resolveSource}
                {row.captionPreview ? ` · ${row.captionPreview}` : ""}
              </p>
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 ? (
        <p className="yp-muted" style={{ marginTop: "0.5rem" }}>Bu filtrede foto yok.</p>
      ) : null}
    </section>
  );
}

export { rowsFromItems };
