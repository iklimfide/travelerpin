"use client";

import { useCallback, useEffect, useState } from "react";
import type { InstagramImportPreviewRow, InstagramImportHashtagStats } from "@/lib/kamikaze/instagram-export/run-import";
import type { InstagramImportReviewItemPublic } from "@/lib/kamikaze/instagram-export/review-session";
import { DEFAULT_IGNORE_POSTING_LOCATION_LABELS } from "@/lib/kamikaze/instagram-export/location-ignore";
import {
  KamikazeInstagramImportReview,
  rowsFromItems,
  type ClientReviewRow,
  type ReviewCityOption,
} from "@/components/kamikaze/KamikazeInstagramImportReview";

type ImportTarget = {
  username: string;
  default?: boolean;
};

type ImportResponse = {
  targetUsername?: string;
  apply?: boolean;
  jsonFiles?: number;
  postCount?: number;
  preview?: InstagramImportPreviewRow[];
  skippedUnassignedPhotos?: number;
  hashtagStats?: InstagramImportHashtagStats;
  sessionId?: string;
  reviewItems?: InstagramImportReviewItemPublic[];
  cityOptions?: ReviewCityOption[];
  applyReview?: boolean;
  applied?: Array<{
    city: string;
    mode: string;
    photoCount: number;
    igCount: number;
    uploadedThisRun: number;
  }>;
  error?: string;
};

export function KamikazeInstagramImportPanel() {
  const [targets, setTargets] = useState<ImportTarget[]>([]);
  const [targetUsername, setTargetUsername] = useState("guvencgiller");
  const [file, setFile] = useState<File | null>(null);
  const [limit, setLimit] = useState("");
  const [hashtagMapJson, setHashtagMapJson] = useState("");
  const [ignoreLocationLabels, setIgnoreLocationLabels] = useState(
    DEFAULT_IGNORE_POSTING_LOCATION_LABELS
  );
  const [geocodeHashtags, setGeocodeHashtags] = useState(true);
  const [geocodeGps, setGeocodeGps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ImportResponse | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reviewRows, setReviewRows] = useState<ClientReviewRow[]>([]);
  const [cityOptions, setCityOptions] = useState<ReviewCityOption[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/kamikaze/instagram-import");
        const data = (await res.json()) as { targets?: ImportTarget[] };
        if (data.targets?.length) {
          setTargets(data.targets);
          const def = data.targets.find((t) => t.default)?.username ?? data.targets[0].username;
          setTargetUsername(def);
        }
      } catch {
        setTargets([
          { username: "guvencgiller", default: true },
          { username: "arif" },
          { username: "nazli" },
        ]);
      }
    })();
  }, []);

  const runImport = useCallback(
    async (mode: "preview" | "apply") => {
      if (!file) {
        setError("Meta’dan indirdiğin Instagram ZIP dosyasını seç.");
        return;
      }
      setBusy(true);
      setError(null);
      if (mode === "preview") {
        setLastResult(null);
        setSessionId(null);
        setReviewRows([]);
      }

      try {
        const form = new FormData();
        form.append("file", file, file.name);
        form.append("mode", mode);
        form.append("targetUsername", targetUsername);
        if (limit.trim()) form.append("limit", limit.trim());
        if (hashtagMapJson.trim()) form.append("hashtagMapJson", hashtagMapJson.trim());
        form.append("ignoreLocationLabels", ignoreLocationLabels.trim());
        form.append("geocodeHashtags", geocodeHashtags ? "true" : "false");
        form.append("geocodeGps", geocodeGps ? "true" : "false");

        const res = await fetch("/api/kamikaze/instagram-import", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as ImportResponse;
        if (!res.ok) {
          throw new Error(data.error ?? "Import başarısız");
        }
        setLastResult(data);
        if (data.sessionId && data.reviewItems?.length) {
          setSessionId(data.sessionId);
          setReviewRows(rowsFromItems(data.reviewItems));
          setCityOptions(data.cityOptions ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import başarısız");
      } finally {
        setBusy(false);
      }
    },
    [file, limit, targetUsername, hashtagMapJson, ignoreLocationLabels, geocodeHashtags, geocodeGps]
  );

  const applyApproved = useCallback(async () => {
    if (!sessionId || reviewRows.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const decisions = reviewRows.map((row) => ({
        id: row.id,
        approved: row.approved && Boolean(row.city_name.trim() && row.country_code.trim()),
        city_name: row.city_name.trim(),
        country_code: row.country_code.trim(),
        country_name: row.country_name.trim() || row.country_code.trim(),
      }));
      const form = new FormData();
      form.append("mode", "apply_review");
      form.append("targetUsername", targetUsername);
      form.append("sessionId", sessionId);
      form.append("decisions", JSON.stringify(decisions));

      const res = await fetch("/api/kamikaze/instagram-import", { method: "POST", body: form });
      const data = (await res.json()) as ImportResponse;
      if (!res.ok) throw new Error(data.error ?? "Yükleme başarısız");
      setLastResult(data);
      setSessionId(null);
      setReviewRows([]);
      setCityOptions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yükleme başarısız");
    } finally {
      setBusy(false);
    }
  }, [reviewRows, sessionId, targetUsername]);

  return (
    <div className="yp-panel">
      <header className="yp-panel__title">
        <div className="yp-panel__title-start">
          <h1 className="yp-panel__title-label">Instagram import</h1>
          <p className="yp-muted">
            Meta JSON export (ZIP). Hedef profilin şehir pin’lerine foto + IG linkleri eklenir.
            Sadece allowlist kullanıcılar.
          </p>
        </div>
      </header>

      <section className="yp-panel__section">
        <h2 className="yp-panel__section-title">Hedef profil</h2>
        <div className="yp-field yp-field--wide">
          <label htmlFor="yp-ig-import-target">Kullanıcı</label>
          <select
            id="yp-ig-import-target"
            className="yp-input"
            value={targetUsername}
            disabled={busy}
            onChange={(event) => setTargetUsername(event.target.value)}
          >
            {(targets.length > 0
              ? targets
              : [
                  { username: "guvencgiller" },
                  { username: "arif" },
                  { username: "nazli" },
                ]
            ).map((t) => (
              <option key={t.username} value={t.username}>
                @{t.username}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="yp-panel__section">
        <h2 className="yp-panel__section-title">Export ZIP</h2>
        <div className="yp-field yp-field--wide">
          <label htmlFor="yp-ig-import-zip">instagram-….zip</label>
          <input
            id="yp-ig-import-zip"
            type="file"
            accept=".zip,application/zip"
            disabled={busy}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setLastResult(null);
              setSessionId(null);
              setReviewRows([]);
              setError(null);
            }}
          />
        </div>
        <p className="yp-muted" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
          İndirirken format JSON, medya (foto) dahil, Posts/Reels seçili olsun. ZIP sunucuda
          geçici açılır; iş bitince silinir. Büyük arşivler için yerel `npm run dev` kullan (Vercel
          limiti düşük olabilir).
        </p>
        <div className="yp-field yp-field--wide" style={{ marginTop: "0.75rem" }}>
          <label htmlFor="yp-ig-import-limit">Test limiti (opsiyonel)</label>
          <input
            id="yp-ig-import-limit"
            type="number"
            min={1}
            className="yp-input"
            placeholder="Tüm gönderiler"
            value={limit}
            disabled={busy}
            onChange={(event) => setLimit(event.target.value)}
          />
        </div>
      </section>

      <section className="yp-panel__section">
        <h2 className="yp-panel__section-title">Hashtag eşleme</h2>
        <p className="yp-muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          IG’deki konum etiketi çoğu zaman paylaşım yaptığın şehir (ör. Antalya); asıl rota hashtag’te
          olabilir. Önce hashtag’lere bakılır; aşağıdaki “evden paylaşım” konumları haritaya
          yazılmaz.
        </p>
        <div className="yp-field yp-field--wide">
          <label htmlFor="yp-ig-ignore-locations">Evden paylaşım konumları (yok say)</label>
          <input
            id="yp-ig-ignore-locations"
            className="yp-input"
            disabled={busy}
            value={ignoreLocationLabels}
            onChange={(event) => setIgnoreLocationLabels(event.target.value)}
          />
        </div>
        <div className="yp-field yp-field--wide" style={{ marginTop: "0.65rem" }}>
          <label htmlFor="yp-ig-hashtag-map">Hashtag → şehir (JSON, opsiyonel)</label>
          <textarea
            id="yp-ig-hashtag-map"
            className="yp-input"
            rows={6}
            spellCheck={false}
            disabled={busy}
            placeholder={`{
  "paris": { "city_name": "Paris", "country_code": "FR", "country_name": "France" },
  "eiffel": { "city_name": "Paris", "country_code": "FR", "country_name": "France" }
}`}
            value={hashtagMapJson}
            onChange={(event) => setHashtagMapJson(event.target.value)}
          />
        </div>
        <label className="yp-check" style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={geocodeHashtags}
            disabled={busy}
            onChange={(event) => setGeocodeHashtags(event.target.checked)}
          />
          <span>
            Eşleme yoksa yer adı gibi hashtag’leri Nominatim ile dene (yavaş; gönderi başına en fazla 3
            deneme)
          </span>
        </label>
        <label className="yp-check" style={{ marginTop: "0.45rem", display: "flex", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={geocodeGps}
            disabled={busy}
            onChange={(event) => setGeocodeGps(event.target.checked)}
          />
          <span>
            EXIF GPS’ten şehir tahmin et (yanlış pin riski — sıfırdan importta genelde kapalı tut)
          </span>
        </label>
      </section>

      {error ? <p className="yp-error">{error}</p> : null}

      <div className="yp-form-actions" style={{ paddingTop: "0.5rem" }}>
        <button
          type="button"
          className="yp-btn"
          disabled={busy || !file}
          onClick={() => void runImport("preview")}
        >
          {busy ? "İşleniyor…" : "Önizleme"}
        </button>
        <button
          type="button"
          className="yp-btn yp-btn--primary"
          disabled={busy || !file}
          onClick={() => void runImport("apply")}
        >
          {busy ? "Yükleniyor…" : "Tümünü otomatik yükle (onaysız)"}
        </button>
      </div>

      {lastResult && !lastResult.apply ? (
        <section className="yp-panel__section">
          <h2 className="yp-panel__section-title">Önizleme özeti — @{lastResult.targetUsername}</h2>
          <p className="yp-muted">
            JSON kaynak: {lastResult.jsonFiles ?? 0} dosya · {lastResult.postCount ?? 0} gönderi
            {typeof lastResult.skippedUnassignedPhotos === "number" &&
            lastResult.skippedUnassignedPhotos > 0
              ? ` · otomatik atanmamış: ${lastResult.skippedUnassignedPhotos} foto`
              : null}
          </p>
          {lastResult.hashtagStats ? (
            <p className="yp-muted" style={{ marginTop: "0.35rem" }}>
              Hashtag: {lastResult.hashtagStats.postsWithHashtags} gönderi etiketli · harita ile{" "}
              {lastResult.hashtagStats.resolvedByHashtagMap} · geocode ile{" "}
              {lastResult.hashtagStats.resolvedByHashtagGeocode}
              {lastResult.hashtagStats.ignoredPostingLocationPosts > 0
                ? ` · ev konumu yok sayıldı: ${lastResult.hashtagStats.ignoredPostingLocationPosts} gönderi`
                : null}
            </p>
          ) : null}
          {lastResult.hashtagStats?.unassignedTopHashtags &&
          lastResult.hashtagStats.unassignedTopHashtags.length > 0 ? (
            <p className="yp-muted" style={{ fontSize: "0.82rem", marginTop: "0.5rem" }}>
              Sık atanmamış hashtag:{" "}
              {lastResult.hashtagStats.unassignedTopHashtags
                .slice(0, 12)
                .map((row) => `#${row.tag} (${row.count})`)
                .join(" · ")}
            </p>
          ) : null}
        </section>
      ) : null}

      {sessionId && reviewRows.length > 0 ? (
        <KamikazeInstagramImportReview
          sessionId={sessionId}
          rows={reviewRows}
          cityOptions={cityOptions}
          busy={busy}
          onRowsChange={setReviewRows}
          onApplyApproved={() => void applyApproved()}
        />
      ) : null}

      {lastResult?.apply ? (
        <section className="yp-panel__section">
          <h2 className="yp-panel__section-title">Uygulandı — @{lastResult.targetUsername}</h2>
          {lastResult.applied && lastResult.applied.length > 0 ? (
            <ul className="yp-muted">
              {lastResult.applied.map((row) => (
                <li key={row.city}>
                  {row.city}: +{row.uploadedThisRun} foto → toplam {row.photoCount} foto,{" "}
                  {row.igCount} IG ({row.mode})
                </li>
              ))}
            </ul>
          ) : (
            <p className="yp-muted">Onaylı foto yüklenmedi.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
