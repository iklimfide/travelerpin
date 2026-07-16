"use client";

import { useCallback, useEffect, useState } from "react";
import { useModal } from "@/components/ui/ModalProvider";
import { YP_CACHE_KEYS, ypCacheGet, ypCacheInvalidate, ypCacheSet } from "@/lib/kamikaze/yp-client-cache";

type RecentBroadcast = {
  id: string;
  title: string | null;
  message: string;
  href: string | null;
  recipientCount: number;
  createdAt: string;
};

export function KamikazeNotificationsPanel() {
  const modal = useModal();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<RecentBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(
    async (options?: { force?: boolean }) => {
      if (!options?.force) {
        const cached = ypCacheGet<{
          activeRecipientCount: number;
          recent: RecentBroadcast[];
        }>(YP_CACHE_KEYS.notifications);
        if (cached) {
          setActiveCount(cached.activeRecipientCount);
          setRecent(cached.recent);
          setLoading(false);
          setError(null);
          return;
        }
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/kamikaze/notifications");
        const data = (await res.json()) as {
          activeRecipientCount?: number;
          recent?: RecentBroadcast[];
          error?: string;
          warning?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Yükleme başarısız");
        const activeRecipientCount = data.activeRecipientCount ?? 0;
        const recentRows = data.recent ?? [];
        setActiveCount(activeRecipientCount);
        setRecent(recentRows);
        ypCacheSet(YP_CACHE_KEYS.notifications, {
          activeRecipientCount,
          recent: recentRows,
        });
        if (data.warning) setError(data.warning);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Yükleme başarısız");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError("Mesaj gerekli");
      return;
    }

    const recipientLabel =
      activeCount == null ? "aktif üyelere" : `${activeCount} aktif üyeye`;
    const ok = await modal.confirm(
      `Bu bildirim TravelerPin.com adına ${recipientLabel} gönderilecek. Devam edilsin mi?`,
      {
        title: "Bildirim gönderilsin mi?",
        variant: "info",
        confirmLabel: "Gönder",
        cancelLabel: "Vazgeç",
      }
    );
    if (!ok) return;

    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/kamikaze/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "broadcast",
          title: title.trim() || undefined,
          message: trimmedMessage,
          href: href.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        recipientCount?: number;
        warning?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Gönderim başarısız");
      setSuccess(
        `${data.recipientCount ?? 0} aktif üyeye TravelerPin.com adına bildirim gönderildi.`
      );
      setTitle("");
      setMessage("");
      setHref("");
      ypCacheInvalidate(YP_CACHE_KEYS.notifications);
      await load({ force: true });
      if (data.warning) setError(data.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderim başarısız");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1>Bildirim gönder</h1>
      <p className="yp-main__lead">
        TravelerPin.com adına tüm aktif üyelere (banlı olmayan) bildirim gönder.
      </p>

      {error ? <p className="yp-error">{error}</p> : null}
      {success ? <p className="yp-muted">{success}</p> : null}

      <div className="yp-panel">
        <div className="yp-panel__title">
          <span className="yp-panel__title-label">Yeni bildirim</span>
          {!loading && activeCount != null ? (
            <span className="yp-muted" style={{ fontWeight: 500, fontSize: "0.78rem" }}>
              {activeCount} aktif üye
            </span>
          ) : null}
        </div>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="yp-form-grid">
            <div className="yp-field yp-field--wide">
              <label htmlFor="yp-broadcast-title">Başlık (isteğe bağlı)</label>
              <input
                id="yp-broadcast-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                disabled={sending}
                placeholder="Örn. Yeni özellik"
              />
            </div>
            <div className="yp-field yp-field--wide">
              <label htmlFor="yp-broadcast-message">Mesaj</label>
              <textarea
                id="yp-broadcast-message"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                disabled={sending}
                rows={4}
                placeholder="Üyelere gösterilecek metin"
              />
            </div>
            <div className="yp-field yp-field--wide">
              <label htmlFor="yp-broadcast-href">Link (isteğe bağlı)</label>
              <input
                id="yp-broadcast-href"
                value={href}
                onChange={(e) => setHref(e.target.value)}
                disabled={sending}
                placeholder="/explore"
              />
            </div>
          </div>
          <div className="yp-form-actions">
            <button
              type="submit"
              className="yp-btn yp-btn--primary"
              disabled={sending || loading}
            >
              {sending ? "Gönderiliyor…" : "TravelerPin.com olarak gönder"}
            </button>
          </div>
        </form>
      </div>

      <div className="yp-panel">
        <div className="yp-panel__title">Son gönderimler</div>
        {loading && recent.length === 0 ? (
          <div className="yp-empty">Yükleniyor…</div>
        ) : recent.length === 0 ? (
          <div className="yp-empty">Henüz sistem bildirimi gönderilmedi.</div>
        ) : (
          <table className="yp-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Başlık / mesaj</th>
                <th>Alıcı</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString("tr-TR")}</td>
                  <td>
                    {row.title ? <strong>{row.title}</strong> : null}
                    {row.title ? <br /> : null}
                    <span className="yp-muted">{row.message}</span>
                    {row.href ? (
                      <>
                        <br />
                        <span className="yp-muted">{row.href}</span>
                      </>
                    ) : null}
                  </td>
                  <td>{row.recipientCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
