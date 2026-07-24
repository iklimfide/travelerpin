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
import { readInstagramUrls, readPhotoUrls, pinPhotoMediaChanged, withInstagramDraftField } from "@/lib/utils/pin-media";
import { createPinPhotoFormState } from "@/lib/client/pin-photo-form-state";
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
  const [savedPhotoUrls, setSavedPhotoUrls] = useState(
    () => createPinPhotoFormState(backingCity).savedPhotoUrls
  );
  const [removedSavedPhotoUrls, setRemovedSavedPhotoUrls] = useState<string[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [instagramUrls, setInstagramUrls] = useState(() =>
    withInstagramDraftField(readInstagramUrls(backingCity))
  );
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
        savedPhotoUrls,
        removedSavedPhotoUrls,
        newPhotoFiles,
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
        photo_urls: mediaResult.photo_urls,
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
          savedPhotoUrls,
          removedSavedPhotoUrls,
          newPhotoFiles,
          previousPhotoUrls: readPhotoUrls(backingCity),
          nextPhotoUrls: mediaResult.photo_urls,
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
        savedPhotoUrls={savedPhotoUrls}
        removedSavedPhotoUrls={removedSavedPhotoUrls}
        onRemovedSavedPhotoUrlsChange={setRemovedSavedPhotoUrls}
        newPhotoFiles={newPhotoFiles}
        onNewPhotoFilesChange={setNewPhotoFiles}
        instagramUrls={instagramUrls}
        onInstagramUrlsChange={setInstagramUrls}
        mediaFocus={mediaFocus}
        loading={loading}
        onCancel={onCancel}
      />
    </form>
  );
}
