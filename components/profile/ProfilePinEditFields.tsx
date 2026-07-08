"use client";

import { CityVisitDatesEditor } from "@/components/dashboard/CityVisitDatesEditor";
import { PinMediaFields } from "@/components/dashboard/PinMediaFields";
import { PinNoteEditor } from "@/components/dashboard/PinNoteEditor";
import { LIMITS } from "@/lib/constants";
import { translateCity, translateCommon } from "@/lib/i18n/client-messages";

type ProfilePinEditFieldsProps = {
  visitDates: string[];
  onVisitDatesChange: (dates: string[]) => void;
  note: string;
  onNoteChange: (note: string) => void;
  savedPhotoUrl: string | null;
  photoFile: File | null;
  onPhotoFileChange: (file: File | null) => void;
  removePhoto: boolean;
  onRemovePhotoChange: (remove: boolean) => void;
  instagramUrls: string[];
  onInstagramUrlsChange: (urls: string[]) => void;
  mediaFocus?: "photo" | "instagram";
  loading: boolean;
  onCancel?: () => void;
  submitDisabled?: boolean;
};

export function ProfilePinEditFields({
  visitDates,
  onVisitDatesChange,
  note,
  onNoteChange,
  savedPhotoUrl,
  photoFile,
  onPhotoFileChange,
  removePhoto,
  onRemovePhotoChange,
  instagramUrls,
  onInstagramUrlsChange,
  mediaFocus,
  loading,
  onCancel,
  submitDisabled = false,
}: ProfilePinEditFieldsProps) {
  const t = translateCity;
  const tCommon = translateCommon;

  return (
    <div className="profile-pin-edit-fields">
      <CityVisitDatesEditor value={visitDates} onChange={onVisitDatesChange} hideHint />

      <PinMediaFields
        labels={{
          mediaHint: t("mediaHint"),
          photo: t("photo"),
          photoSaved: t("photoSaved"),
          instagram: t("instagram"),
          instagramHint: t("instagramHint"),
          addInstagram: tCommon("addLink"),
          removeInstagram: t("removeInstagram"),
          removePhoto: t("removePhoto"),
        }}
        savedPhotoUrl={savedPhotoUrl}
        photoFile={photoFile}
        onPhotoFileChange={onPhotoFileChange}
        removePhoto={removePhoto}
        onRemovePhotoChange={onRemovePhotoChange}
        instagramUrls={instagramUrls}
        onInstagramUrlsChange={onInstagramUrlsChange}
        autoFocusInstagram={mediaFocus === "instagram"}
        hideInstagramHint
        hideMediaHint
        defaultInstagramField
        equalActionButtons
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
