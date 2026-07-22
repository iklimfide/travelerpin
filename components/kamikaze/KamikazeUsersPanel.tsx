"use client";

import { useCallback, useEffect, useState } from "react";
import { useModal } from "@/components/ui/ModalProvider";
import { YP_CACHE_KEYS, ypCacheGet, ypCacheInvalidate, ypCacheSet } from "@/lib/kamikaze/yp-client-cache";
import { resolvePublicMediaImageUrl } from "@/lib/storage/hub-photo-url";
import { profilePath } from "@/lib/seo/site";

type YpUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  residence: string | null;
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

function usersCacheIsFresh(payload: UsersCachePayload): boolean {
  return payload.users.every((user) => "residence" in user);
}

function userInitials(displayName: string | null, username: string): string {
  const source = (displayName ?? "").trim() || username;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function UserAvatarCell({ user }: { user: YpUser }) {
  const imageSrc = resolvePublicMediaImageUrl(user.avatarUrl) ?? user.avatarUrl;

  return (
    <a
      className="yp-user-avatar-link"
      href={profilePath(user.username)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`@${user.username} profili`}
    >
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="yp-user-avatar" src={imageSrc} alt="" />
      ) : (
        <span className="yp-user-avatar yp-user-avatar--fallback" aria-hidden>
          {userInitials(user.displayName, user.username)}
        </span>
      )}
    </a>
  );
}

function UserIdentity({ user }: { user: YpUser }) {
  return (
    <>
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
    </>
  );
}

function UserStatus({ user }: { user: YpUser }) {
  return (
    <>
      {user.bannedAt ? (
        <span className="yp-badge yp-badge--danger">Banlı</span>
      ) : (
        "Aktif"
      )}
      {user.banReason ? <div className="yp-muted">{user.banReason}</div> : null}
    </>
  );
}

function UserActions({
  user,
  busyId,
  onEdit,
  onAct,
}: {
  user: YpUser;
  busyId: string | null;
  onEdit: (user: YpUser) => void;
  onAct: (action: "ban" | "unban" | "delete", userId: string) => void;
}) {
  if (user.isMaster) {
    return <span className="yp-muted">Korumalı</span>;
  }

  return (
    <div className="yp-actions">
      <button type="button" className="yp-btn" onClick={() => onEdit(user)}>
        Değiştir
      </button>
      {user.bannedAt ? (
        <button
          type="button"
          className="yp-btn"
          disabled={busyId === `unban:${user.id}`}
          onClick={() => void onAct("unban", user.id)}
        >
          Banı kaldır
        </button>
      ) : (
        <button
          type="button"
          className="yp-btn yp-btn--danger"
          disabled={busyId === `ban:${user.id}`}
          onClick={() => void onAct("ban", user.id)}
        >
          Banla
        </button>
      )}
      <button
        type="button"
        className="yp-btn yp-btn--danger"
        disabled={busyId === `delete:${user.id}`}
        onClick={() => void onAct("delete", user.id)}
      >
        Sil
      </button>
    </div>
  );
}

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
        if (cached && usersCacheIsFresh(cached)) {
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

      <form className="yp-toolbar yp-toolbar--inline yp-toolbar--users" onSubmit={(e) => void search(e)}>
        <div className="yp-field yp-field--filter-q">
          <label htmlFor="yp-user-q">Ara</label>
          <input
            id="yp-user-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="kullanıcı adı, ad veya e-posta"
          />
        </div>
        <div className="yp-field yp-field--ban-reason">
          <label htmlFor="yp-ban-reason">Ban nedeni (isteğe bağlı)</label>
          <input
            id="yp-ban-reason"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Yalnızca master görür"
          />
        </div>
        <div className="yp-toolbar__actions">
          <button type="submit" className="yp-btn yp-btn--primary" disabled={loading}>
            {loading ? "Yükleniyor…" : "Ara"}
          </button>
          <button
            type="button"
            className="yp-btn"
            disabled={loading}
            onClick={() => void refreshUsers()}
          >
            Yenile
          </button>
        </div>
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
            <div className="yp-user-cards" aria-label="Kullanıcı listesi">
              {users.map((user) => (
                <article key={user.id} className="yp-user-card">
                  <div className="yp-user-card__head">
                    <UserAvatarCell user={user} />
                    <div className="yp-user-card__identity">
                      <UserIdentity user={user} />
                    </div>
                  </div>
                  <dl className="yp-user-card__meta">
                    <div className="yp-user-card__meta-row">
                      <dt>Yaşadığı yer</dt>
                      <dd>{user.residence?.trim() || "—"}</dd>
                    </div>
                    <div className="yp-user-card__meta-row">
                      <dt>E-posta</dt>
                      <dd>{user.email ?? "—"}</dd>
                    </div>
                    <div className="yp-user-card__meta-row">
                      <dt>Durum</dt>
                      <dd>
                        <UserStatus user={user} />
                      </dd>
                    </div>
                    <div className="yp-user-card__meta-row">
                      <dt>Kayıt</dt>
                      <dd>{new Date(user.createdAt).toLocaleDateString("tr-TR")}</dd>
                    </div>
                  </dl>
                  <div className="yp-user-card__actions">
                    <UserActions
                      user={user}
                      busyId={busyId}
                      onEdit={openEdit}
                      onAct={act}
                    />
                  </div>
                </article>
              ))}
            </div>
            <div className="yp-table-wrap yp-table-wrap--desktop-users">
              <table className="yp-table yp-table--city-images yp-table--users">
                <colgroup>
                  <col className="yp-col-avatar" />
                  <col className="yp-col-user" />
                  <col className="yp-col-residence" />
                  <col className="yp-col-email" />
                  <col className="yp-col-status" />
                  <col className="yp-col-created" />
                  <col className="yp-col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="yp-table__avatar">Profil</th>
                    <th className="yp-table__user">Kullanıcı</th>
                    <th className="yp-table__residence">Yaşadığı yer</th>
                    <th className="yp-table__email">E-posta</th>
                    <th className="yp-table__status">Durum</th>
                    <th className="yp-table__created">Kayıt</th>
                    <th className="yp-table__actions">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="yp-table__avatar">
                        <UserAvatarCell user={user} />
                      </td>
                      <td className="yp-table__user">
                        <UserIdentity user={user} />
                      </td>
                      <td className="yp-table__residence">{user.residence?.trim() || "—"}</td>
                      <td className="yp-table__email">{user.email ?? "—"}</td>
                      <td className="yp-table__status">
                        <UserStatus user={user} />
                      </td>
                      <td className="yp-table__created">
                        {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="yp-table__actions">
                        <UserActions
                          user={user}
                          busyId={busyId}
                          onEdit={openEdit}
                          onAct={act}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
