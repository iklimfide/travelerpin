"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/ui/ModalProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { invalidateCachedHeroImages } from "@/lib/client/hero-images-cache";
import { DEFAULT_CITY_HERO_IMAGE } from "@/lib/constants";
import { toCityHeroDisplayUrl } from "@/lib/city/city-hero-images";
import { toParkHeroDisplayUrl } from "@/lib/park/park-hero-images";
import {
  StockPhotoSearchModal,
  type StockPhotoSearchModalLabels,
} from "@/components/kamikaze/StockPhotoSearchModal";
import { formatPhotoUploadError } from "@/lib/utils/photo-upload-error";
import { getDefaultParkHeroImage } from "@/lib/utils/park-hero-image";
import type { ParkType } from "@/types/database";

type HubHeroKind = "city" | "park";

export type HubHeroImageMasterModerationLabels = {
  uploadPhoto: string;
  importUrl: string;
  removePhoto: string;
  importTitle: string;
  importSubtitle: string;
  importFieldLabel: string;
  importHint: string;
  importUrlRequired: string;
  cancel: string;
  submit: string;
  removeConfirm: string;
  uploadSuccess: string;
  removeSuccess: string;
  searchStock: string;
  stockTitle: string;
  stockSubtitle: string;
  stockSearch: StockPhotoSearchModalLabels;
};

type HubHeroImageMasterModerationProps = {
  kind: HubHeroKind;
  countryCode: string;
  placeName: string;
  parkType?: ParkType;
  initialImageUrl: string;
  canModerate: boolean;
  imageWidth?: number;
  labels: HubHeroImageMasterModerationLabels;
};

function defaultHeroUrl(kind: HubHeroKind, parkType: ParkType | undefined): string {
  if (kind === "city") return DEFAULT_CITY_HERO_IMAGE;
  return getDefaultParkHeroImage(parkType ?? "national_park");
}

function isDefaultHeroDisplayUrl(
  url: string,
  kind: HubHeroKind,
  parkType: ParkType | undefined
): boolean {
  const target = defaultHeroUrl(kind, parkType);
  if (url === target) return true;
  try {
    const parsed = new URL(url, "http://local");
    const targetParsed = new URL(target, "http://local");
    return parsed.pathname === targetParsed.pathname;
  } catch {
    return false;
  }
}

export function HubHeroImageMasterModeration({
  kind,
  countryCode,
  placeName,
  parkType,
  initialImageUrl,
  canModerate,
  imageWidth = 220,
  labels,
}: HubHeroImageMasterModerationProps) {
  const router = useRouter();
  const modal = useModal();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayUrl, setDisplayUrl] = useState(initialImageUrl);
  const [hasCustomHero, setHasCustomHero] = useState(
    !isDefaultHeroDisplayUrl(initialImageUrl, kind, parkType)
  );
  const [busy, setBusy] = useState(false);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  const apiBase = kind === "city" ? "/api/kamikaze/city-images" : "/api/kamikaze/park-images";

  function applyStoredHero(storedUrl: string | undefined) {
    if (!storedUrl?.trim()) {
      const fallback = defaultHeroUrl(kind, parkType);
      setDisplayUrl(fallback);
      setHasCustomHero(false);
      return;
    }
    const next =
      kind === "city"
        ? toCityHeroDisplayUrl(storedUrl)
        : toParkHeroDisplayUrl(storedUrl, parkType ?? "national_park");
    setDisplayUrl(next);
    setHasCustomHero(true);
  }

  async function postHero(payload: { file?: File; imageUrl?: string }) {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("countryCode", countryCode);
      if (kind === "city") {
        formData.set("cityName", placeName);
      } else {
        formData.set("parkName", placeName);
        formData.set("parkType", parkType ?? "national_park");
      }
      if (payload.file) formData.set("file", payload.file);
      else if (payload.imageUrl) formData.set("imageUrl", payload.imageUrl);

      const res = await fetch(apiBase, { method: "POST", body: formData });
      const data = (await res.json()) as { image?: { imageUrl?: string }; error?: string };
      if (!res.ok) {
        throw new Error(formatPhotoUploadError(data.error ?? "Upload failed"));
      }

      invalidateCachedHeroImages();
      applyStoredHero(data.image?.imageUrl);
      toast.show(labels.uploadSuccess);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeHero() {
    const ok = await modal.confirm(labels.removeConfirm, { destructive: true });
    if (!ok) return;

    setBusy(true);
    try {
      const body: Record<string, string> = { countryCode, };
      if (kind === "city") body.cityName = placeName;
      else {
        body.parkName = placeName;
        body.parkType = parkType ?? "national_park";
      }

      const res = await fetch(apiBase, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(formatPhotoUploadError(data.error ?? "Remove failed"));
      }

      invalidateCachedHeroImages();
      applyStoredHero(undefined);
      toast.show(labels.removeSuccess);
      router.refresh();
    } catch (err) {
      await modal.alert(err instanceof Error ? err.message : "Remove failed", { variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      await postHero({ file });
    } catch (err) {
      await modal.alert(err instanceof Error ? err.message : "Upload failed", { variant: "error" });
    }
  }

  async function submitUrlImport() {
    const imageUrl = urlValue.trim();
    if (!imageUrl) {
      setUrlError(labels.importUrlRequired);
      return;
    }
    setUrlError(null);
    try {
      await postHero({ imageUrl });
      setUrlModalOpen(false);
      setUrlValue("");
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={displayUrl} alt="" width={imageWidth} />
  );

  if (!canModerate) {
    return <div className="city-page__park-card-image">{image}</div>;
  }

  return (
    <>
      <div className="city-page__park-card-image city-page__park-card-image--master">
        {image}
        <div className="city-page__hero-master-bar" aria-label="Cover photo moderation">
          <button
            type="button"
            className="city-page__hero-master-btn"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {labels.uploadPhoto}
          </button>
          <button
            type="button"
            className="city-page__hero-master-btn"
            disabled={busy}
            onClick={() => {
              setUrlError(null);
              setUrlModalOpen(true);
            }}
          >
            {labels.importUrl}
          </button>
          <button
            type="button"
            className="city-page__hero-master-btn"
            disabled={busy}
            onClick={() => setStockModalOpen(true)}
          >
            {labels.searchStock}
          </button>
          {hasCustomHero ? (
            <button
              type="button"
              className="city-page__hero-master-btn city-page__hero-master-btn--danger"
              disabled={busy}
              onClick={() => void removeHero()}
            >
              {labels.removePhoto}
            </button>
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          disabled={busy}
          onChange={(event) => void onFileChange(event)}
        />
      </div>

      {stockModalOpen ? (
        <StockPhotoSearchModal
          skin="hub"
          title={labels.stockTitle}
          subtitle={labels.stockSubtitle}
          defaultQuery={placeName}
          busy={busy}
          labels={labels.stockSearch}
          onClose={() => setStockModalOpen(false)}
          onSubmit={async (imageUrl) => {
            await postHero({ imageUrl });
            setStockModalOpen(false);
          }}
        />
      ) : null}

      {urlModalOpen ? (
        <div className="city-page__hero-master-modal" role="presentation">
          <button
            type="button"
            className="city-page__hero-master-modal-backdrop"
            aria-label={labels.cancel}
            disabled={busy}
            onClick={() => setUrlModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hub-hero-url-import-title"
            className="city-page__hero-master-modal-sheet"
          >
            <h2 id="hub-hero-url-import-title" className="city-page__hero-master-modal-title">
              {labels.importTitle}
            </h2>
            <p className="city-page__hero-master-modal-sub">{labels.importSubtitle}</p>
            {urlError ? <p className="city-page__hero-master-modal-error">{urlError}</p> : null}
            <label className="city-page__hero-master-modal-label" htmlFor="hub-hero-url-import-input">
              {labels.importFieldLabel}
            </label>
            <input
              id="hub-hero-url-import-input"
              type="url"
              className="city-page__hero-master-modal-input"
              autoFocus
              value={urlValue}
              disabled={busy}
              placeholder="https://…"
              onChange={(event) => setUrlValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitUrlImport();
                }
              }}
            />
            <p className="city-page__hero-master-modal-hint">{labels.importHint}</p>
            <div className="city-page__hero-master-modal-actions">
              <button
                type="button"
                className="city-page__hero-master-btn"
                disabled={busy}
                onClick={() => setUrlModalOpen(false)}
              >
                {labels.cancel}
              </button>
              <button
                type="button"
                className="city-page__hero-master-btn city-page__hero-master-btn--primary"
                disabled={busy}
                onClick={() => void submitUrlImport()}
              >
                {labels.submit}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
