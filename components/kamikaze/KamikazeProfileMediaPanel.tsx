"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resolvePublicMediaImageUrl } from "@/lib/storage/hub-photo-url";
import type { YpProfileMediaSnapshot, YpProfilePhotoItem } from "@/lib/kamikaze/profile-media-fix";
import { YP_INSTAGRAM_IMPORT_USERNAMES } from "@/lib/kamikaze/instagram-import-targets";

function countUrlDuplicates(items: YpProfilePhotoItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.photoUrl.trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function KamikazeProfileMediaPanel() {
  const [username, setUsername] = useState("guvencgiller");
  const [snapshot, setSnapshot] = useState<YpProfileMediaSnapshot | null>(null);
  const [moveTargetByItem, setMoveTargetByItem] = useState<Record<string, string>>({});
  const [bulkFromCityId, setBulkFromCityId] = useState("");
  const [bulkToCityId, setBulkToCityId] = useState("");
  const [bulkMergeIg, setBulkMergeIg] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/kamikaze/profile-media?username=${encodeURIComponent(username)}`
      );
      const data = (await res.json()) as YpProfileMediaSnapshot & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Yüklenemedi");
      setSnapshot(data);
      setMoveTargetByItem({});
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

  const urlDupCounts = useMemo(
    () => countUrlDuplicates(snapshot?.photoItems ?? []),
    [snapshot?.photoItems]
  );

  async function postAction(action: string, extra: Record<string, string> = {}) {
    setBusyAction(action);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/kamikaze/profile-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, username, ...extra }),
      });
      const data = (await res.json()) as {
        error?: string;
        removedUrls?: number;
        updatedCities?: number;
        removedPhotoUrls?: number;
        clearedCities?: number;
        movedPhotoCount?: number;
        mergedInstagramCount?: number;
        cityName?: string;
        countryCode?: string;
        countryRemoved?: boolean;
      };
      if (!res.ok) throw new Error(data.error ?? "İşlem başarısız");
      if (typeof data.movedPhotoCount === "number") {
        setMessage(
          `${data.movedPhotoCount} foto taşındı` +
            (data.mergedInstagramCount ? ` · ${data.mergedInstagramCount} IG link birleşti` : "") +
            "."
        );
      } else if (typeof data.removedUrls === "number") {
        setMessage(`${data.removedUrls} çift URL silindi (${data.updatedCities ?? 0} pin güncellendi).`);
      } else if (typeof data.removedPhotoUrls === "number") {
        setMessage(
          `${data.removedPhotoUrls} foto kaldırıldı (${data.clearedCities ?? 0} pin temizlendi).`
        );
      } else if (typeof data.cityName === "string") {
        setMessage(
          `Pin silindi: ${data.cityName}, ${data.countryCode}` +
            (data.countryRemoved ? " (ülke pin’i de kalktı)" : "") +
            "."
        );
      } else {
        setMessage("Kaydedildi.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setBusyAction(null);
    }
  }

  const cities = snapshot?.cities ?? [];
  const items = snapshot?.photoItems ?? [];

  const citiesWithPhotos = useMemo(
    () => cities.filter((c) => c.photo_urls.length > 0),
    [cities]
  );

  const bulkFromCity = cities.find((c) => c.id === bulkFromCityId);
  const bulkPhotoCount = bulkFromCity?.photo_urls.length ?? 0;

  return (
    <div className="yp-panel">
      <header className="yp-panel__title">
        <div className="yp-panel__title-start">
          <h1 className="yp-panel__title-label">Pin foto düzelt</h1>
          <p className="yp-muted">
            Çoklu foto + şehir taşıma. Katalogda görünmeyen profil pinlerini de buradan silebilirsin.
          </p>
        </div>
      </header>

      <section className="yp-panel__section">
        <div className="yp-field yp-field--wide">
          <label htmlFor="yp-media-fix-user">Profil</label>
          <select
            id="yp-media-fix-user"
            className="yp-input"
            value={username}
            disabled={loading || Boolean(busyAction)}
            onChange={(e) => setUsername(e.target.value)}
          >
            {YP_INSTAGRAM_IMPORT_USERNAMES.map((u) => (
              <option key={u} value={u}>
                @{u}
              </option>
            ))}
          </select>
        </div>
        <div className="yp-form-actions" style={{ paddingTop: "0.65rem" }}>
          <button type="button" className="yp-btn" disabled={loading || Boolean(busyAction)} onClick={() => void load()}>
            {loading ? "Yükleniyor…" : "Yenile"}
          </button>
          <button
            type="button"
            className="yp-btn"
            disabled={!snapshot || Boolean(busyAction)}
            onClick={() => void postAction("dedupe_urls")}
          >
            {busyAction === "dedupe_urls" ? "…" : "Aynı URL çiftlerini sil"}
          </button>
          <button
            type="button"
            className="yp-btn yp-btn--primary"
            disabled={!snapshot || Boolean(busyAction)}
            onClick={() => void postAction("dedupe_bytes")}
          >
            {busyAction === "dedupe_bytes" ? "Hash taranıyor…" : "Aynı görsel (byte) çiftlerini sil"}
          </button>
          <button
            type="button"
            className="yp-btn"
            disabled={!snapshot || Boolean(busyAction)}
            onClick={() => {
              if (
                !window.confirm(
                  "Tüm pin’lerdeki hosted fotolar silinir. IG linkleri kalır. Sıfırdan import için uygun. Emin misin?"
                )
              ) {
                return;
              }
              void postAction("clear_all_hosted_photos");
            }}
          >
            {busyAction === "clear_all_hosted_photos" ? "…" : "Tüm hosted fotoları temizle"}
          </button>
        </div>
      </section>

      {snapshot && cities.length > 0 ? (
        <section className="yp-panel__section">
          <h2 className="yp-panel__section-title">Profil şehir pinleri ({cities.length})</h2>
          <p className="yp-muted" style={{ fontSize: "0.85rem", marginBottom: "0.65rem" }}>
            Instagram/Tayca isim gibi YP Şehirler listesinde olmayan kayıtlar sadece profilde durur —{" "}
            <strong>Pin sil</strong> ile kaldır.
          </p>
          <div className="yp-table-wrap">
            <table className="yp-table">
              <thead>
                <tr>
                  <th>Şehir</th>
                  <th>Medya</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cities.map((city) => (
                  <tr key={city.id}>
                    <td>
                      <strong>{city.city_name}</strong>
                      <div className="yp-muted">
                        {city.country_name} ({city.country_code})
                      </div>
                    </td>
                    <td className="yp-muted">
                      {city.photo_urls.length} foto · {city.instagram_urls.length} IG
                    </td>
                    <td>
                      <button
                        type="button"
                        className="yp-btn yp-btn--danger"
                        disabled={Boolean(busyAction)}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `“${city.city_name}” pin’i @${username} profilinden tamamen silinsin mi? (foto + IG)`
                            )
                          ) {
                            return;
                          }
                          void postAction("delete_city_pin", { cityId: city.id });
                        }}
                      >
                        {busyAction === "delete_city_pin" ? "…" : "Pin sil"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {snapshot && citiesWithPhotos.length > 0 ? (
        <section className="yp-panel__section">
          <h2 className="yp-panel__section-title">Toplu taşıma</h2>
          <p className="yp-muted" style={{ fontSize: "0.85rem", marginBottom: "0.65rem" }}>
            Bir şehir pin’indeki <strong>tüm fotoları</strong> başka pine taşı (Milano → Milan gibi).
            Tek tek kart kullanmana gerek yok.
          </p>
          <div className="yp-field yp-field--wide">
            <label htmlFor="yp-bulk-from">Kaynak pin</label>
            <select
              id="yp-bulk-from"
              className="yp-input"
              value={bulkFromCityId}
              disabled={Boolean(busyAction)}
              onChange={(e) => setBulkFromCityId(e.target.value)}
            >
              <option value="">— seç —</option>
              {citiesWithPhotos.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.city_name}, {city.country_code} ({city.photo_urls.length} foto)
                </option>
              ))}
            </select>
          </div>
          <div className="yp-field yp-field--wide" style={{ marginTop: "0.5rem" }}>
            <label htmlFor="yp-bulk-to">Hedef pin</label>
            <select
              id="yp-bulk-to"
              className="yp-input"
              value={bulkToCityId}
              disabled={Boolean(busyAction)}
              onChange={(e) => setBulkToCityId(e.target.value)}
            >
              <option value="">— seç —</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id} disabled={city.id === bulkFromCityId}>
                  {city.city_name}, {city.country_code} ({city.photo_urls.length} foto)
                </option>
              ))}
            </select>
          </div>
          <label className="yp-check" style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
            <input
              type="checkbox"
              checked={bulkMergeIg}
              disabled={Boolean(busyAction)}
              onChange={(e) => setBulkMergeIg(e.target.checked)}
            />
            <span>Kaynak pin’deki Instagram linklerini de hedefe birleştir</span>
          </label>
          <div className="yp-form-actions" style={{ paddingTop: "0.65rem" }}>
            <button
              type="button"
              className="yp-btn yp-btn--primary"
              disabled={
                Boolean(busyAction) ||
                !bulkFromCityId ||
                !bulkToCityId ||
                bulkFromCityId === bulkToCityId ||
                bulkPhotoCount === 0
              }
              onClick={() => {
                const from = cities.find((c) => c.id === bulkFromCityId);
                const to = cities.find((c) => c.id === bulkToCityId);
                if (
                  !window.confirm(
                    `${from?.city_name} pin’indeki ${bulkPhotoCount} foto ${to?.city_name} pin’ine taşınsın mı?`
                  )
                ) {
                  return;
                }
                void postAction("move_all_photos", {
                  fromCityId: bulkFromCityId,
                  toCityId: bulkToCityId,
                  mergeInstagramUrls: bulkMergeIg ? "true" : "false",
                });
              }}
            >
              {busyAction === "move_all_photos"
                ? "Taşınıyor…"
                : `Tüm fotoları taşı (${bulkPhotoCount || "—"})`}
            </button>
          </div>
        </section>
      ) : null}

      {error ? <p className="yp-error">{error}</p> : null}
      {message ? <p className="yp-muted">{message}</p> : null}

      {snapshot ? (
        <section className="yp-panel__section">
          <h2 className="yp-panel__section-title">
            {items.length} foto · {cities.length} şehir pin
          </h2>
          {items.length === 0 ? (
            <p className="yp-muted">Bu profilde hosted foto yok.</p>
          ) : (
            <ul className="yp-media-fix-grid">
              {items.map((item) => {
                const src = resolvePublicMediaImageUrl(item.photoUrl);
                const dup =
                  (urlDupCounts.get(item.photoUrl.trim().toLowerCase()) ?? 0) > 1;
                const moveTo = moveTargetByItem[item.itemId] ?? item.cityId;

                return (
                  <li key={item.itemId} className={`yp-media-fix-card${dup ? " yp-media-fix-card--dup" : ""}`}>
                    <div className="yp-media-fix-card__thumb">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" />
                      ) : (
                        <span className="yp-muted">?</span>
                      )}
                    </div>
                    <p className="yp-media-fix-card__place">
                      {item.cityName}, {item.countryCode}
                      {dup ? <span className="yp-badge">URL çift</span> : null}
                    </p>
                    <label className="yp-media-fix-card__label">
                      Taşı →
                      <select
                        className="yp-input"
                        value={moveTo}
                        disabled={Boolean(busyAction)}
                        onChange={(e) =>
                          setMoveTargetByItem((prev) => ({
                            ...prev,
                            [item.itemId]: e.target.value,
                          }))
                        }
                      >
                        {cities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.city_name}, {city.country_code} ({city.photo_urls.length})
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="yp-media-fix-card__actions">
                      <button
                        type="button"
                        className="yp-btn"
                        disabled={Boolean(busyAction) || moveTo === item.cityId}
                        onClick={() =>
                          void postAction("move_photo", {
                            fromCityId: item.cityId,
                            toCityId: moveTo,
                            photoUrl: item.photoUrl,
                          })
                        }
                      >
                        Taşı
                      </button>
                      <button
                        type="button"
                        className="yp-btn"
                        disabled={Boolean(busyAction)}
                        onClick={() =>
                          void postAction("remove_photo", {
                            cityId: item.cityId,
                            photoUrl: item.photoUrl,
                          })
                        }
                      >
                        Sil
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
