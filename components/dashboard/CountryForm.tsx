"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { addVisitedCountry } from "@/lib/client/country-actions";
import { buildPinMediaPayload } from "@/components/dashboard/PinMediaFields";
import { ProfilePinEditFields } from "@/components/profile/ProfilePinEditFields";
import { useModal } from "@/components/ui/ModalProvider";
import { getCountryName } from "@/lib/data/countries";
import { formatPhotoUploadError } from "@/lib/utils/photo-upload-error";
import { isValidInstagramUrl } from "@/lib/utils/instagram";
import { notifyProfileDataChanged } from "@/lib/client/session-page-cache";
import { readInstagramUrls, readPhotoUrl, pinPhotoMediaChanged, withInstagramDraftField } from "@/lib/utils/pin-media";
import type { VisitedCity, VisitedCountry } from "@/types/database";

type CountryFormProps = {
  countryCode: string;
  backingCity?: VisitedCity | null;
  visitedCountries: VisitedCountry[];
  onSuccess?: () => void;
  onCancel?: () => void;
  mediaFocus?: "photo" | "instagram";
};

export function CountryForm({
  countryCode,
  backingCity = null,
  visitedCountries,
  onSuccess,
  onCancel,
  mediaFocus,
}: CountryFormProps) {
  const modal = useModal();
  const router = useRouter();
  const locale = useLocale() === "tr" ? "tr" : "en";
  const countryName = getCountryName(countryCode, locale);

  const [note, setNote] = useState(backingCity?.note ?? "");
  const [visitDates, setVisitDates] = useState<string[]>(backingCity?.visit_dates ?? []);
  const [savedPhotoUrl, setSavedPhotoUrl] = useState(() => readPhotoUrl(backingCity));
  const [removePhoto, setRemovePhoto] = useState(false);
  const [instagramUrls, setInstagramUrls] = useState(() =>
    withInstagramDraftField(readInstagramUrls(backingCity))
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const hasVisitedCountry = visitedCountries.some(
        (country) => country.country_code.toUpperCase() === countryCode.toUpperCase()
      );

      if (!hasVisitedCountry) {
        const countryResult = await addVisitedCountry(countryCode);
        if (!countryResult.ok) {
          await modal.alert(countryResult.error, { variant: "error" });
          return;
        }
      }

      const mediaResult = await buildPinMediaPayload({
        photoFile,
        savedPhotoUrl,
        removePhoto,
        instagramUrls,
        isValidInstagramUrl,
        formatPhotoUploadError,
      });

      if (!mediaResult.ok) {
        await modal.alert(mediaResult.error, { variant: "error" });
        return;
      }

      const payload = {
        city_name: countryName,
        country_code: countryCode,
        country_name: countryName,
        note: note || null,
        photo_url: mediaResult.photo_url,
        instagram_urls: mediaResult.instagram_urls,
        visit_dates: visitDates,
      };

      const url = backingCity ? `/api/cities/${backingCity.id}` : "/api/cities";
      const method = backingCity ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        await modal.alert(data.error ?? "Failed to save country", { variant: "error" });
        return;
      }

      notifyProfileDataChanged();
      if (
        pinPhotoMediaChanged({
          photoFile,
          removePhoto,
          previousPhotoUrl: savedPhotoUrl,
          nextPhotoUrl: mediaResult.photo_url,
        })
      ) {
        router.refresh();
      }
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="dashboard-form-city profile-pin-edit-form">
      <ProfilePinEditFields
        visitDates={visitDates}
        onVisitDatesChange={setVisitDates}
        note={note}
        onNoteChange={setNote}
        savedPhotoUrl={savedPhotoUrl}
        photoFile={photoFile}
        onPhotoFileChange={(file) => {
          setPhotoFile(file);
          if (file) setRemovePhoto(false);
        }}
        removePhoto={removePhoto}
        onRemovePhotoChange={setRemovePhoto}
        instagramUrls={instagramUrls}
        onInstagramUrlsChange={setInstagramUrls}
        mediaFocus={mediaFocus}
        loading={loading}
        onCancel={onCancel}
      />
    </form>
  );
}
