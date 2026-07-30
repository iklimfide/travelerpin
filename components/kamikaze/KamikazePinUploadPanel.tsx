"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PIN_PHOTO_GALLERY_ACCEPT } from "@/lib/client/pin-photo-pick";
import { resolvePublicMediaImageUrl } from "@/lib/storage/hub-photo-url";
import { YP_INSTAGRAM_IMPORT_USERNAMES } from "@/lib/kamikaze/instagram-import-targets";
import type { YpPinUploadSnapshot, YpPinUploadTarget } from "@/lib/kamikaze/yp-pin-upload";

export function KamikazePinUploadPanel() {
  const [username, setUsername] = useState("arif");
  const [snapshot, setSnapshot] = useState<YpPinUploadSnapshot | null>(null);
  const [pinKind, setPinKind] = useState<"city" | "park" | "">("");
  const [pinId, setPinId] = useState("");
  const [filter, setFilter] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/kamikaze/pin-upload?username=${encodeURIComponent(username)}`);
      const data = (await res.json()) as YpPinUploadSnapshot & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Yüklenemedi");
      setSnapshot(data);
      setPinId((prev) => {
        if (prev && data.targets.some((t) => t.id === prev)) return prev;
        return "";
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklenemedi");
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredTargets = useMemo(() => {
    const targets = snapshot?.targets ?? [];
    const q = filter.trim().toLowerCase();
    const kindFilter = pinKind || null;
    return targets.filter((target) => {
      if (kindFilter && target.kind !== kindFilter) return false;
      if (!q) return true;
      return target.label.toLowerCase().includes(q);
    });
  }, [snapshot?.targets, filter, pinKind]);

  const selectedTarget = useMemo(
    () => snapshot?.targets.find((t) => t.id === pinId) ?? null,
    [snapshot?.targets, pinId]
  );

  const maxPhotos = snapshot?.maxPhotosPerPin ?? 20;
  const remainingSlots = selectedTarget
    ? Math.max(0, maxPhotos - selectedTarget.photoCount)
    : maxPhotos;

  function selectTarget(target: YpPinUploadTarget) {
    setPinId(target.id);
    setPinKind(target.kind);
    setPendingFiles([]);
    setError(null);
    setMessage(null);
  }

  async function handleUpload() {
    if (!selectedTarget || pendingFiles.length === 0) return;

    const filesToSend = pendingFiles.slice(0, remainingSlots);
    if (filesToSend.length === 0) {
      setError(`Bu pin zaten ${maxPhotos} foto limitine ulaşmış.`);
      return;
    }

    setUploading(true);
    setUploadProgress(`0 / ${filesToSend.length}`);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("pinKind", selectedTarget.kind);
      formData.append("pinId", selectedTarget.id);
      for (const file of filesToSend) {
        formData.append("files", file, file.name);
      }

      const res = await fetch("/api/kamikaze/pin-upload", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as {
        error?: string;
        addedCount?: number;
        totalCount?: number;
        uploadedCount?: number;
        uploadErrors?: string[];
      };

      if (!res.ok) throw new Error(data.error ?? "Yükleme başarısız");

      setUploadProgress(`${filesToSend.length} / ${filesToSend.length}`);
      setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      let msg = `${data.addedCount ?? 0} foto eklendi (toplam ${data.totalCount ?? "?"}).`;
      if (data.uploadErrors?.length) {
        msg += ` ${data.uploadErrors.length} dosya atlandı.`;
      }
      if (filesToSend.length < pendingFiles.length) {
        msg += ` Limit nedeniyle ${pendingFiles.length - filesToSend.length} dosya gönderilmedi.`;
      }
      setMessage(msg);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yükleme başarısız");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  return (
    <div className="yp-panel">
      <header className="yp-panel__title">
        <div className="yp-panel__title-start">
          <h1 className="yp-panel__title-label">Pin foto yükle</h1>
          <p className="yp-muted">
            Allowlist profillere (@arif, @guvencgiller, @nazli) hub/park pinlerine çoklu foto ekle.
            Pin başına en fazla {maxPhotos} foto.
          </p>
        </div>
      </header>

      <section className="yp-panel__section">
        <div className="yp-field yp-field--wide">
          <label htmlFor="yp-upload-user">Profil</label>
          <select
            id="yp-upload-user"
            className="yp-input"
            value={username}
            disabled={loading || uploading}
            onChange={(e) => {
              setUsername(e.target.value);
              setPinId("");
              setPendingFiles([]);
            }}
          >
            {YP_INSTAGRAM_IMPORT_USERNAMES.map((u) => (
              <option key={u} value={u}>
                @{u}
              </option>
            ))}
          </select>
        </div>

        <div className="yp-field yp-field--wide" style={{ marginTop: "0.65rem" }}>
          <label htmlFor="yp-upload-filter">Pin ara</label>
          <input
            id="yp-upload-filter"
            className="yp-input"
            type="search"
            placeholder="Şehir veya park adı…"
            value={filter}
            disabled={loading || uploading}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="yp-form-actions" style={{ paddingTop: "0.65rem", gap: "0.5rem" }}>
          <button
            type="button"
            className={`yp-btn${pinKind === "" ? " yp-btn--primary" : ""}`}
            disabled={loading || uploading}
            onClick={() => setPinKind("")}
          >
            Tümü
          </button>
          <button
            type="button"
            className={`yp-btn${pinKind === "city" ? " yp-btn--primary" : ""}`}
            disabled={loading || uploading}
            onClick={() => setPinKind("city")}
          >
            Şehir
          </button>
          <button
            type="button"
            className={`yp-btn${pinKind === "park" ? " yp-btn--primary" : ""}`}
            disabled={loading || uploading}
            onClick={() => setPinKind("park")}
          >
            Park
          </button>
          <button
            type="button"
            className="yp-btn"
            disabled={loading || uploading}
            onClick={() => void load()}
          >
            {loading ? "Yükleniyor…" : "Yenile"}
          </button>
        </div>
      </section>

      {snapshot ? (
        <section className="yp-panel__section">
          <h2 className="yp-panel__section-title">
            Pin seç ({filteredTargets.length})
          </h2>
          {filteredTargets.length === 0 ? (
            <p className="yp-muted">Bu profilde eşleşen pin yok.</p>
          ) : (
            <div className="yp-table-wrap">
              <table className="yp-table">
                <thead>
                  <tr>
                    <th>Pin</th>
                    <th>Tür</th>
                    <th>Foto</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredTargets.map((target) => (
                    <tr key={target.id} className={pinId === target.id ? "yp-row--selected" : undefined}>
                      <td>{target.label}</td>
                      <td className="yp-muted">{target.kind === "city" ? "Şehir" : "Park"}</td>
                      <td className="yp-muted">
                        {target.photoCount} / {maxPhotos}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="yp-btn yp-btn--primary"
                          disabled={uploading}
                          onClick={() => selectTarget(target)}
                        >
                          {pinId === target.id ? "Seçili" : "Seç"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {selectedTarget ? (
        <section className="yp-panel__section">
          <h2 className="yp-panel__section-title">
            {selectedTarget.label}
          </h2>
          <p className="yp-muted" style={{ fontSize: "0.85rem", marginBottom: "0.65rem" }}>
            Mevcut {selectedTarget.photoCount} foto ·{" "}
            <strong>{remainingSlots}</strong> slot kaldı
          </p>

          {selectedTarget.photoUrls.length > 0 ? (
            <ul className="yp-media-fix-grid" style={{ marginBottom: "0.85rem" }}>
              {selectedTarget.photoUrls.map((url) => {
                const src = resolvePublicMediaImageUrl(url);
                return (
                  <li key={url} className="yp-media-fix-card">
                    <div className="yp-media-fix-card__thumb">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" />
                      ) : (
                        <span className="yp-muted">?</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="yp-muted" style={{ marginBottom: "0.65rem" }}>
              Bu pinde henüz foto yok.
            </p>
          )}

          <div className="yp-field yp-field--wide">
            <label htmlFor="yp-upload-files">Yeni fotolar</label>
            <input
              ref={fileInputRef}
              id="yp-upload-files"
              className="yp-input"
              type="file"
              accept={PIN_PHOTO_GALLERY_ACCEPT}
              multiple
              disabled={uploading || remainingSlots === 0}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setPendingFiles(files.slice(0, remainingSlots));
                setError(null);
              }}
            />
          </div>

          {pendingFiles.length > 0 ? (
            <p className="yp-muted" style={{ marginTop: "0.5rem" }}>
              {pendingFiles.length} dosya seçildi
              {pendingFiles.length > remainingSlots
                ? ` (yalnızca ilk ${remainingSlots} yüklenecek)`
                : ""}
            </p>
          ) : null}

          <div className="yp-form-actions" style={{ paddingTop: "0.65rem" }}>
            <button
              type="button"
              className="yp-btn yp-btn--primary"
              disabled={
                uploading ||
                pendingFiles.length === 0 ||
                remainingSlots === 0
              }
              onClick={() => void handleUpload()}
            >
              {uploading
                ? uploadProgress
                  ? `Yükleniyor… ${uploadProgress}`
                  : "Yükleniyor…"
                : `Yükle (${Math.min(pendingFiles.length, remainingSlots) || "—"})`}
            </button>
          </div>
        </section>
      ) : null}

      {error ? <p className="yp-error">{error}</p> : null}
      {message ? <p className="yp-muted">{message}</p> : null}
    </div>
  );
}
