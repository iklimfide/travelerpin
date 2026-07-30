"use client";

import { useMemo } from "react";
import { CityVisitDatesEditor } from "@/components/dashboard/CityVisitDatesEditor";
import { PinMediaFields } from "@/components/dashboard/PinMediaFields";
import { PinNoteEditor } from "@/components/dashboard/PinNoteEditor";
import { LIMITS } from "@/lib/constants";
import { getOwnUsername } from "@/lib/client/session-page-cache";
import { maxPinPhotosForUsername } from "@/lib/utils/pin-photo-limits";
import { useTranslateCity, useTranslateCommon } from "@/lib/i18n/client-messages";
import { useModal } from "@/components/ui/ModalProvider";

type ProfilePinEditFieldsProps = {
  visitDates: string[];
  onVisitDatesChange: (dates: string[]) => void;
  note: string;
  onNoteChange: (note: string) => void;
  savedPhotoUrls: string[];
  removedSavedPhotoUrls: string[];
  onRemovedSavedPhotoUrlsChange: (urls: string[]) => void;
  newPhotoFiles: File[];
  onNewPhotoFilesChange: (files: File[]) => void;
  instagramUrls: string[];
  onInstagramUrlsChange: (urls: string[]) => void;
  mediaFocus?: "photo" | "instagram";
  loading: boolean;
  onCancel?: () => void;
  submitDisabled?: boolean;
  maxPinPhotos?: number;
};

export function ProfilePinEditFields({
  visitDates,
  onVisitDatesChange,
  note,
  onNoteChange,
  savedPhotoUrls,
  removedSavedPhotoUrls,
  onRemovedSavedPhotoUrlsChange,
  newPhotoFiles,
  onNewPhotoFilesChange,
  instagramUrls,
  onInstagramUrlsChange,
  mediaFocus,
  loading,
  onCancel,
  submitDisabled = false,
  maxPinPhotos: maxPinPhotosProp,
}: ProfilePinEditFieldsProps) {
  const t = useTranslateCity();
  const tCommon = useTranslateCommon();
  const modal = useModal();
  const maxPinPhotos = useMemo(
    () => maxPinPhotosProp ?? maxPinPhotosForUsername(getOwnUsername()),
    [maxPinPhotosProp]
  );

  return (
    <div className="profile-pin-edit-fields">
      <CityVisitDatesEditor value={visitDates} onChange={onVisitDatesChange} hideHint />

      <PinMediaFields
        labels={{
          mediaHint: t("mediaHint"),
          photo: t("photo"),
          photoLibrary: t("photoLibrary"),
          photoSaved: t("photoSaved"),
          instagram: t("instagram"),
          instagramHint: t("instagramHint"),
          addInstagram: tCommon("addLink"),
          removeInstagram: t("removeInstagram"),
          removePhoto: t("removePhoto"),
        }}
        savedPhotoUrls={savedPhotoUrls}
        removedSavedPhotoUrls={removedSavedPhotoUrls}
        onRemovedSavedPhotoUrlsChange={onRemovedSavedPhotoUrlsChange}
        newPhotoFiles={newPhotoFiles}
        onNewPhotoFilesChange={onNewPhotoFilesChange}
        instagramUrls={instagramUrls}
        onInstagramUrlsChange={onInstagramUrlsChange}
        autoFocusInstagram={mediaFocus === "instagram"}
        hideInstagramHint
        hideMediaHint
        defaultInstagramField
        equalActionButtons
        onPhotoPickError={(message) => {
          void modal.alert(message, { variant: "error" });
        }}
        photoUnsupportedFormatMessage={tCommon("photoUploadUnsupportedFormat")}
        maxPinPhotos={maxPinPhotos}
      />

      <div className="dashboard-form-city__footer dashboard-form-city__footer--before-note">
        <button
          type="submit"
          disabled={loading || submitDisabled}
          className="dashboard-form-city__btn-primary"
        >
          {loading ? tCommon("loading") : tCommon("save")}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="dashboard-form-city__btn-secondary">
            {tCommon("cancel")}
          </button>
        ) : null}
      </div>

      <PinNoteEditor
        value={note}
        onChange={onNoteChange}
        triggerLabel={t("note")}
        placeholder={t("notePlaceholder")}
        saveLabel={tCommon("save")}
        countLabel={t("noteCount")}
        maxLength={LIMITS.noteMaxLength}
      />
    </div>
  );
}
