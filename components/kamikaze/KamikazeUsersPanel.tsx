"use client";

import { useCallback, useEffect, useState } from "react";
import { useModal } from "@/components/ui/ModalProvider";
import { YP_CACHE_KEYS, ypCacheGet, ypCacheInvalidate, ypCacheSet } from "@/lib/kamikaze/yp-client-cache";
import { profilePath } from "@/lib/seo/site";

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

type UsersCachePayload = {
  users: YpUser[];
  hasMore: boolean;
  nextOffset: number;
  activeQuery: string;
};

const PAGE_SIZE = 20;

export function KamikazeUsersPanel() {
  const modal = useModal();
  const [q, setQ] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [users, setUsers] = useState<YpUser[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");

  const [editTarget, setEditTarget] = useState<YpUser | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const applyUsersState = useCallback((payload: UsersCachePayload) => {
    setUsers(payload.users);
    setHasMore(payload.hasMore);
    setNextOffset(payload.nextOffset);
    setActiveQuery(payload.activeQuery);
    setQ(payload.activeQuery);
  }, []);

  const fetchUsers = useCallback(
    async (
      query: string,
      offset: number,
      mode: "replace" | "append",
      options?: { force?: boolean }
    ) => {
      const cacheKey = YP_CACHE_KEYS.users(query);

      if (mode === "replace" && !options?.force) {
        const cached = ypCacheGet<UsersCachePayload>(cacheKey);
        if (cached) {
          applyUsersState(cached);
          setLoading(false);
          setError(null);
          return;
        }
      }

      if (mode === "replace") setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          offset: String(offset),
        });
        if (query) params.set("q", query);
        const res = await fetch(`/api/kamikaze/users?${params}`);
        const data = (await res.json()) as {
          users?: YpUser[];
          hasMore?: boolean;
          nextOffset?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Yükleme başarısız");
        const page = data.users ?? [];
        const nextHasMore = Boolean(data.hasMore);
        const nextOff = data.nextOffset ?? offset + page.length;

        setUsers((prev) => {
          const nextUsers = mode === "append" ? [...prev, ...page] : page;
          ypCacheSet(cacheKey, {
            users: nextUsers,
            hasMore: nextHasMore,
            nextOffset: nextOff,
            activeQuery: query,
          } satisfies UsersCachePayload);
          return nextUsers;
        });
        setHasMore(nextHasMore);
        setNextOffset(nextOff);
        setActiveQuery(query);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Yükleme başarısız");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [applyUsersState]
  );

  useEffect(() => {
    void fetchUsers("", 0, "replace");
  }, [fetchUsers]);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    await fetchUsers(q.trim(), 0, "replace");
  }

  async function loadMore() {
    if (!hasMore || loadingMore || loading) return;
    await fetchUsers(activeQuery, nextOffset, "append");
  }

  async function refreshUsers() {
    ypCacheInvalidate("users:");
    // Ban/delete changes active recipient count for broadcasts.
    ypCacheInvalidate(YP_CACHE_KEYS.notifications);
    await fetchUsers(activeQuery, 0, "replace", { force: true });
  }

  function openEdit(user: YpUser) {
    setEditTarget(user);
    setEditUsername(user.username);
    setEditDisplayName(user.displayName ?? "");
    setEditEmail(user.email ?? "");
    setEditError(null);
  }

  function closeEdit() {
    if (editSaving) return;
    setEditTarget(null);
    setEditError(null);
  }

  async function saveEdit() {
    if (!editTarget) return;
    const username = editUsername.trim();
    const displayName = editDisplayName.trim();
    const email = editEmail.trim();
    if (!username) {
      setEditError("Kullanıcı adı gerekli");
      return;
    }
    if (!email) {
      setEditError("E-posta gerekli");
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch("/api/kamikaze/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          userId: editTarget.id,
          username,
          displayName: displayName || null,
          email,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Kaydetme başarısız");
      setEditTarget(null);
      await refreshUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Kaydetme başarısız");
    } finally {
      setEditSaving(false);
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
      await refreshUsers();
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
          {loading ? "Yükleniyor…" : "Ara"}
        </button>
      </form>

      <div className="yp-panel">
        <div className="yp-panel__title">
          <span className="yp-panel__title-label">Sonuçlar</span>
          {!loading && users.length > 0 ? (
            <span className="yp-muted" style={{ fontWeight: 500, fontSize: "0.78rem" }}>
              {users.length}
              {hasMore ? "+" : ""} kullanıcı
            </span>
          ) : null}
        </div>
        {loading && users.length === 0 ? (
          <div className="yp-empty">Kullanıcılar yükleniyor…</div>
        ) : users.length === 0 ? (
          <div className="yp-empty">
            {activeQuery ? "Eşleşen kullanıcı yok." : "Henüz kullanıcı yok."}
          </div>
        ) : (
          <>
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
                        <a
                          className="yp-link"
                          href={profilePath(user.username)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <strong>@{user.username}</strong>
                        </a>
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
                          <button
                            type="button"
                            className="yp-btn"
                            onClick={() => openEdit(user)}
                          >
                            Değiştir
                          </button>
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
            {hasMore ? (
              <div className="yp-form-actions">
                <button
                  type="button"
                  className="yp-btn"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? "Yükleniyor…" : `Daha fazla yükle (+${PAGE_SIZE})`}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {editTarget ? (
        <div className="yp-rename-modal" role="presentation">
          <button
            type="button"
            className="yp-rename-modal__backdrop"
            aria-label="Kapat"
            onClick={closeEdit}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="yp-user-edit-title"
            className="yp-rename-modal__sheet"
          >
            <h2 id="yp-user-edit-title">Kullanıcıyı değiştir</h2>
            <p className="yp-muted">@{editTarget.username}</p>
            {editError ? <p className="yp-error">{editError}</p> : null}
            <div className="yp-form-grid" style={{ padding: "0.85rem 0 0" }}>
              <div className="yp-field yp-field--wide">
                <label htmlFor="yp-edit-username">Kullanıcı adı</label>
                <input
                  id="yp-edit-username"
                  autoFocus
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  disabled={editSaving}
                />
              </div>
              <div className="yp-field yp-field--wide">
                <label htmlFor="yp-edit-display-name">Görünen ad</label>
                <input
                  id="yp-edit-display-name"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  disabled={editSaving}
                  placeholder="İsteğe bağlı"
                />
              </div>
              <div className="yp-field yp-field--wide">
                <label htmlFor="yp-edit-email">E-posta</label>
                <input
                  id="yp-edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={editSaving}
                />
              </div>
            </div>
            <div className="yp-form-actions" style={{ padding: "0.9rem 0 0" }}>
              <button type="button" className="yp-btn" onClick={closeEdit} disabled={editSaving}>
                Vazgeç
              </button>
              <button
                type="button"
                className="yp-btn yp-btn--primary"
                disabled={editSaving}
                onClick={() => void saveEdit()}
              >
                {editSaving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
