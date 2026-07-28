"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { addVisitedCountry } from "@/lib/client/country-actions";
import { ProfilePinEditFields } from "@/components/profile/ProfilePinEditFields";
import { useModal } from "@/components/ui/ModalProvider";
import { getCountryName } from "@/lib/data/countries";
import { useTranslateCommon } from "@/lib/i18n/client-messages";
import { formatPinPhotoUploadError } from "@/lib/client/format-pin-photo-upload-error";
import { executeBackgroundPinSave } from "@/lib/client/background-pin-save";
import { readInstagramUrls, readPhotoUrls, withInstagramDraftField } from "@/lib/utils/pin-media";
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
  const tCommon = useTranslateCommon();
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

    const hasVisitedCountry = visitedCountries.some(
      (country) => country.country_code.toUpperCase() === countryCode.toUpperCase()
    );

    if (!hasVisitedCountry) {
      setLoading(true);
      try {
        const countryResult = await addVisitedCountry(countryCode);
        if (!countryResult.ok) {
          await modal.alert(countryResult.error, { variant: "error" });
          return;
        }
      } finally {
        setLoading(false);
      }
    }

    const mediaSnapshot = {
      savedPhotoUrls: [...savedPhotoUrls],
      removedSavedPhotoUrls: [...removedSavedPhotoUrls],
      newPhotoFiles: [...newPhotoFiles],
      instagramUrls: [...instagramUrls],
      previousPhotoUrls: readPhotoUrls(backingCity),
    };
    const payloadBase = {
      city_name: countryName,
      country_code: countryCode,
      country_name: countryName,
      note: note || null,
      visit_dates: visitDates,
    };
    const url = backingCity ? `/api/cities/${backingCity.id}` : "/api/cities";
    const method = backingCity ? "PATCH" : "POST";

    setLoading(true);
    try {
      const saved = await executeBackgroundPinSave({
        media: mediaSnapshot,
        genericSaveFailedMessage: tCommon("pinSaveFailed"),
        saveRecord: (media) =>
          fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payloadBase, ...media }),
          }),
        onError: (message) => modal.alert(message, { variant: "error" }),
        onPhotoChanged: () => router.refresh(),
        formatPhotoUploadError: (message) => formatPinPhotoUploadError(tCommon, message),
      });
      if (saved) onSuccess?.();
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
