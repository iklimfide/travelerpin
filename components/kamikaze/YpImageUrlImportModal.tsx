"use client";

import { useState } from "react";

type YpImageUrlImportModalProps = {
  title: string;
  subtitle: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (imageUrl: string) => Promise<void>;
};

export function YpImageUrlImportModal({
  title,
  subtitle,
  busy = false,
  onClose,
  onSubmit,
}: YpImageUrlImportModalProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const imageUrl = value.trim();
    if (!imageUrl) {
      setError("Görsel linki gerekli");
      return;
    }

    setError(null);
    try {
      await onSubmit(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Görsel yüklenemedi");
    }
  }

  return (
    <div className="yp-rename-modal" role="presentation">
      <button
        type="button"
        className="yp-rename-modal__backdrop"
        aria-label="Kapat"
        disabled={busy}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="yp-image-url-import-title"
        className="yp-rename-modal__sheet"
      >
        <h2 id="yp-image-url-import-title">{title}</h2>
        <p className="yp-muted">{subtitle}</p>
        {error ? <p className="yp-error">{error}</p> : null}
        <div className="yp-field yp-field--wide" style={{ marginTop: "0.85rem" }}>
          <label htmlFor="yp-image-url-import-input">Görsel linki</label>
          <input
            id="yp-image-url-import-input"
            type="url"
            autoFocus
            value={value}
            disabled={busy}
            placeholder="https://…"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSubmit();
              }
            }}
          />
        </div>
        <p className="yp-muted" style={{ marginTop: "0.55rem", fontSize: "0.82rem" }}>
          Doğrudan görsel dosyası linki kullanın (.jpg, .png, .webp, .avif). Google Photos
          (photos.google.com, /pw/ linkleri) oturum ister — indirip «Foto yükle» kullanın.
        </p>
        <div className="yp-form-actions" style={{ padding: "0.9rem 0 0" }}>
          <button type="button" className="yp-btn" disabled={busy} onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className="yp-btn yp-btn--primary"
            disabled={busy}
            onClick={() => void handleSubmit()}
          >
            {busy ? "Yükleniyor…" : "Yükle"}
          </button>
        </div>
      </div>
    </div>
  );
}
