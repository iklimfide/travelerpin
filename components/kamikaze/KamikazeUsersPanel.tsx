"use client";

import { useState } from "react";
import { useModal } from "@/components/ui/ModalProvider";

type YpUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  bannedAt: string | null;
  banReason: string | null;
  email: string | null;
  isMaster: boolean;
};

export function KamikazeUsersPanel() {
  const modal = useModal();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<YpUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) {
      setUsers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kamikaze/users?q=${encodeURIComponent(q.trim())}`);
      const data = (await res.json()) as { users?: YpUser[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Arama başarısız");
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Arama başarısız");
    } finally {
      setLoading(false);
    }
  }

  async function act(action: "ban" | "unban" | "delete", userId: string) {
    if (action === "delete") {
      const ok = await modal.confirm(
        "Bu kullanıcı kalıcı olarak silinsin mi? Tüm pinler ve profil verisi kalkar.",
        {
          title: "Kullanıcı silinsin mi?",
          variant: "error",
          destructive: true,
          confirmLabel: "Sil",
          cancelLabel: "Vazgeç",
        }
      );
      if (!ok) return;
    }
    if (action === "ban") {
      const ok = await modal.confirm(
        "Bu kullanıcı banlansın mı? Giriş yapamaz.",
        {
          title: "Kullanıcı banlansın mı?",
          variant: "error",
          destructive: true,
          confirmLabel: "Banla",
          cancelLabel: "Vazgeç",
        }
      );
      if (!ok) return;
    }

    setBusyId(`${action}:${userId}`);
    setError(null);
    try {
      const res = await fetch("/api/kamikaze/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId,
          reason: action === "ban" ? banReason.trim() || undefined : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "İşlem başarısız");
      await search();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1>Kullanıcılar</h1>
      <p className="yp-main__lead">
        Kullanıcı adı, görünen ad veya e-posta ile ara. Ban girişi engeller; silme hesabı kaldırır.
      </p>

      {error ? <p className="yp-error">{error}</p> : null}

      <form className="yp-toolbar" onSubmit={(e) => void search(e)}>
        <div className="yp-field" style={{ flex: 1, minWidth: "14rem" }}>
          <label htmlFor="yp-user-q">Ara</label>
          <input
            id="yp-user-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="kullanıcı adı, ad veya e-posta"
          />
        </div>
        <div className="yp-field" style={{ minWidth: "12rem" }}>
          <label htmlFor="yp-ban-reason">Ban nedeni (isteğe bağlı)</label>
          <input
            id="yp-ban-reason"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Yalnızca master görür"
          />
        </div>
        <button type="submit" className="yp-btn yp-btn--primary" disabled={loading}>
          {loading ? "Aranıyor…" : "Ara"}
        </button>
      </form>

      <div className="yp-panel">
        <div className="yp-panel__title">Sonuçlar</div>
        {users.length === 0 ? (
          <div className="yp-empty">Henüz kullanıcı yok. Eşleşmeleri görmek için ara.</div>
        ) : (
          <table className="yp-table">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>E-posta</th>
                <th>Durum</th>
                <th>Kayıt</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div>
                      <strong>@{user.username}</strong>
                      {user.isMaster ? (
                        <>
                          {" "}
                          <span className="yp-badge">Master</span>
                        </>
                      ) : null}
                    </div>
                    <div className="yp-muted">{user.displayName ?? "—"}</div>
                  </td>
                  <td>{user.email ?? "—"}</td>
                  <td>
                    {user.bannedAt ? (
                      <span className="yp-badge yp-badge--danger">Banlı</span>
                    ) : (
                      "Aktif"
                    )}
                    {user.banReason ? (
                      <div className="yp-muted">{user.banReason}</div>
                    ) : null}
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString("tr-TR")}</td>
                  <td>
                    {user.isMaster ? (
                      <span className="yp-muted">Korumalı</span>
                    ) : (
                      <div className="yp-actions">
                        {user.bannedAt ? (
                          <button
                            type="button"
                            className="yp-btn"
                            disabled={busyId === `unban:${user.id}`}
                            onClick={() => void act("unban", user.id)}
                          >
                            Banı kaldır
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="yp-btn yp-btn--danger"
                            disabled={busyId === `ban:${user.id}`}
                            onClick={() => void act("ban", user.id)}
                          >
                            Banla
                          </button>
                        )}
                        <button
                          type="button"
                          className="yp-btn yp-btn--danger"
                          disabled={busyId === `delete:${user.id}`}
                          onClick={() => void act("delete", user.id)}
                        >
                          Sil
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
