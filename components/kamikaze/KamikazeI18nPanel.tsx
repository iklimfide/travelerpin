"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { I18nEntry } from "@/lib/kamikaze/i18n-messages";

type Stats = {
  total: number;
  sameAsEn: number;
  missingTr: number;
  translated: number;
};

type FilterMode = "all" | "same" | "missing" | "dirty";

type DraftMap = Record<string, string>;

export function KamikazeI18nPanel() {
  const [entries, setEntries] = useState<I18nEntry[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [writable, setWritable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [namespace, setNamespace] = useState("all");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [drafts, setDrafts] = useState<DraftMap>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/kamikaze/i18n");
      const data = (await res.json()) as {
        entries?: I18nEntry[];
        namespaces?: string[];
        stats?: Stats;
        writable?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Çeviriler yüklenemedi");
      setEntries(data.entries ?? []);
      setNamespaces(data.namespaces ?? []);
      setStats(data.stats ?? null);
      setWritable(data.writable !== false);
      setDrafts({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Çeviriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirtyCount = useMemo(() => Object.keys(drafts).length, [drafts]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return entries.filter((row) => {
      if (namespace !== "all" && row.namespace !== namespace) return false;
      const currentTr = drafts[row.path] ?? row.tr;
      if (filter === "same" && !(currentTr.trim() && currentTr === row.en)) return false;
      if (filter === "missing" && currentTr.trim()) return false;
      if (filter === "dirty" && drafts[row.path] === undefined) return false;
      if (!q) return true;
      return (
        row.path.toLocaleLowerCase("tr").includes(q) ||
        row.en.toLocaleLowerCase("tr").includes(q) ||
        currentTr.toLocaleLowerCase("tr").includes(q)
      );
    });
  }, [drafts, entries, filter, namespace, query]);

  function setDraft(path: string, value: string, original: string) {
    setDrafts((prev) => {
      const next = { ...prev };
      if (value === original) {
        delete next[path];
      } else {
        next[path] = value;
      }
      return next;
    });
    setSuccess(null);
  }

  async function handleSave() {
    const updates = Object.entries(drafts).map(([path, value]) => ({ path, value }));
    if (updates.length === 0) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/kamikaze/i18n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = (await res.json()) as {
        entries?: I18nEntry[];
        stats?: Stats;
        appliedCount?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Kayıt başarısız");
      setEntries(data.entries ?? []);
      setStats(data.stats ?? null);
      setDrafts({});
      setSuccess(`${data.appliedCount ?? updates.length} çeviri kaydedildi → messages/tr.json`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1>EN–TR çeviriler</h1>
      <p className="yp-main__lead">
        İngilizce kaynak metinleri solda; Türkçe karşılıklarını sağda düzenle. Kayıt{" "}
        <code>messages/tr.json</code> dosyasına yazılır — commit etmeyi unutma.
      </p>

      {!writable ? (
        <p className="yp-error" role="status">
          Bu ortamda dosya yazımı kapalı (Vercel). Yerelde düzenleyip commit edin.
        </p>
      ) : null}

      <div className="yp-toolbar yp-i18n-toolbar">
        <div className="yp-field" style={{ flex: "1 1 16rem" }}>
          <label htmlFor="yp-i18n-q">Ara</label>
          <div className="yp-field__input-wrap">
            <input
              id="yp-i18n-q"
              type="search"
              value={query}
              placeholder="Anahtar, EN veya TR…"
              onChange={(e) => setQuery(e.target.value)}
              className={query ? "yp-field__input--has-clear" : undefined}
            />
            {query ? (
              <button
                type="button"
                className="yp-field__clear"
                aria-label="Aramayı temizle"
                onClick={() => setQuery("")}
              >
                ×
              </button>
            ) : null}
          </div>
        </div>

        <div className="yp-field">
          <label htmlFor="yp-i18n-ns">Namespace</label>
          <select
            id="yp-i18n-ns"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
          >
            <option value="all">Tümü</option>
            {namespaces.map((ns) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))}
          </select>
        </div>

        <div className="yp-field">
          <label htmlFor="yp-i18n-filter">Filtre</label>
          <select
            id="yp-i18n-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterMode)}
          >
            <option value="all">Tümü</option>
            <option value="same">TR = EN (gözden geçir)</option>
            <option value="missing">TR boş</option>
            <option value="dirty">Düzenlenenler ({dirtyCount})</option>
          </select>
        </div>

        <div className="yp-i18n-actions">
          <button
            type="button"
            className="yp-btn"
            disabled={loading || saving}
            onClick={() => void load()}
          >
            Yenile
          </button>
          <button
            type="button"
            className="yp-btn yp-btn--primary"
            disabled={!writable || saving || dirtyCount === 0}
            onClick={() => void handleSave()}
          >
            {saving ? "Kaydediliyor…" : `Kaydet (${dirtyCount})`}
          </button>
        </div>
      </div>

      {stats ? (
        <p className="yp-muted yp-i18n-stats">
          {stats.total} anahtar · {stats.translated} çevrilmiş · {stats.sameAsEn} TR=EN ·{" "}
          {stats.missingTr} boş · gösterilen {visible.length}
        </p>
      ) : null}

      {error ? (
        <p className="yp-error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="yp-muted" role="status">
          {success}
        </p>
      ) : null}

      {loading ? (
        <p className="yp-muted">Yükleniyor…</p>
      ) : visible.length === 0 ? (
        <p className="yp-empty">Eşleşen çeviri yok.</p>
      ) : (
        <div className="yp-panel yp-i18n-list">
          {visible.map((row) => {
            const value = drafts[row.path] ?? row.tr;
            const dirty = drafts[row.path] !== undefined;
            const sameAsEn = Boolean(value.trim() && value === row.en);
            const multiline = row.en.length > 72 || value.length > 72 || row.en.includes("\n");

            return (
              <article
                key={row.path}
                className={`yp-i18n-row${dirty ? " yp-i18n-row--dirty" : ""}${
                  sameAsEn ? " yp-i18n-row--same" : ""
                }`}
              >
                <div className="yp-i18n-row__meta">
                  <code className="yp-i18n-row__key">{row.path}</code>
                  <span className="yp-i18n-row__badges">
                    {dirty ? <span className="yp-badge">düzenlendi</span> : null}
                    {sameAsEn ? <span className="yp-badge yp-badge--warn">TR=EN</span> : null}
                  </span>
                </div>
                <div className="yp-i18n-row__cols">
                  <div className="yp-i18n-row__en">
                    <span className="yp-i18n-row__label">EN</span>
                    <p>{row.en}</p>
                  </div>
                  <label className="yp-i18n-row__tr">
                    <span className="yp-i18n-row__label">TR</span>
                    {multiline ? (
                      <textarea
                        rows={Math.min(6, Math.max(2, Math.ceil(value.length / 60)))}
                        value={value}
                        disabled={!writable || saving}
                        onChange={(e) => setDraft(row.path, e.target.value, row.tr)}
                      />
                    ) : (
                      <input
                        type="text"
                        value={value}
                        disabled={!writable || saving}
                        onChange={(e) => setDraft(row.path, e.target.value, row.tr)}
                      />
                    )}
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
