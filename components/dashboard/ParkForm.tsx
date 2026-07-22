"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LIMITS } from "@/lib/constants";
import { useTranslateCommon, useTranslatePark } from "@/lib/i18n/client-messages";
import { addPark } from "@/lib/client/park-actions";
import { notifyProfileDataChanged } from "@/lib/client/session-page-cache";
import { CityVisitDatesEditor } from "@/components/dashboard/CityVisitDatesEditor";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { formatPhotoUploadError } from "@/lib/utils/photo-upload-error";
import { buildPinMediaPayload, PinMediaFields } from "@/components/dashboard/PinMediaFields";
import { ProfilePinEditFields } from "@/components/profile/ProfilePinEditFields";
import { readInstagramUrls, readPhotoUrl, pinPhotoMediaChanged, withInstagramDraftField } from "@/lib/utils/pin-media";
import { isValidInstagramUrl } from "@/lib/utils/instagram";
import { useModal } from "@/components/ui/ModalProvider";
import { useToast } from "@/components/ui/ToastProvider";
import type { ParkType, VisitedCountry, VisitedPark } from "@/types/database";

type SearchPark = {
  parkType: ParkType;
  name: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
  country_code: string;
  country_name: string;
};

const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;
const CUSTOM_PARK_TOAST_DELAY_MS = 500;
const ALL_COUNTRIES = "ALL";

function encodeCountries(countries: VisitedCountry[]): string {
  return countries
    .map((c) => `${c.country_code}|${encodeURIComponent(c.country_name)}`)
    .join(",");
}

type ParkFormProps = {
  park?: VisitedPark;
  visitedCountries: VisitedCountry[];
  existingParks?: VisitedPark[];
  onSuccess?: () => void;
  onCancel?: () => void;
  mediaFocus?: "photo" | "instagram";
  hideHeader?: boolean;
};

export function ParkForm({
  park,
  visitedCountries,
  existingParks = [],
  onSuccess,
  onCancel,
  mediaFocus,
  hideHeader = false,
}: ParkFormProps) {
  const isEdit = Boolean(park);
  const t = useTranslatePark();
  const tCommon = useTranslateCommon();
  const modal = useModal();
  const toast = useToast();
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const lastPromptKeyRef = useRef<string | null>(null);

  const [countryCode, setCountryCode] = useState(
    park?.country_code ?? visitedCountries[0]?.country_code ?? ""
  );
  const [parkType, setParkType] = useState<ParkType>(park?.park_type ?? "national_park");
  const [parkName, setParkName] = useState(
    park?.park_name ? formatCityDisplayName(park.park_name) : ""
  );
  const [searchCountryFilter, setSearchCountryFilter] = useState(ALL_COUNTRIES);
  const [customCountryCode] = useState(
    park?.country_code ?? visitedCountries[0]?.country_code ?? ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchPark[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [note, setNote] = useState(park?.note ?? "");
  const [visitDates, setVisitDates] = useState<string[]>(park?.visit_dates ?? []);
  const [savedPhotoUrl, setSavedPhotoUrl] = useState(() => readPhotoUrl(park));
  const [removePhoto, setRemovePhoto] = useState(false);
  const [instagramUrls, setInstagramUrls] = useState(() => {
    const urls = readInstagramUrls(park);
    if (hideHeader) return withInstagramDraftField(urls);
    return mediaFocus === "instagram" ? withInstagramDraftField(urls) : urls;
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCountry =
    visitedCountries.find((c) => c.country_code === countryCode) ??
    (park && park.country_code.toUpperCase() === countryCode.toUpperCase()
      ? {
          id: park.country_code,
          user_id: park.user_id,
          country_code: park.country_code,
          country_name: park.country_name,
          created_at: park.created_at,
        }
      : undefined);

  const customTargetCountryCode =
    searchCountryFilter !== ALL_COUNTRIES ? searchCountryFilter : customCountryCode;

  const customTargetCountry = visitedCountries.find(
    (c) => c.country_code === customTargetCountryCode
  );

  const searchCountries = useMemo(() => {
    if (searchCountryFilter === ALL_COUNTRIES) {
      return visitedCountries;
    }
    return visitedCountries.filter((c) => c.country_code === searchCountryFilter);
  }, [searchCountryFilter, visitedCountries]);

  const existingKeys = useMemo(
    () =>
      new Set(
        existingParks.map(
          (p) => `${p.country_code.toUpperCase()}:${p.park_type}:${p.park_name.toLowerCase()}`
        )
      ),
    [existingParks]
  );

  const trimmedQuery = searchQuery.trim();
  const needsCountryPicker = searchCountryFilter === ALL_COUNTRIES;

  const canPromptCustomPark = useMemo(() => {
    if (isEdit || trimmedQuery.length < MIN_QUERY_LENGTH) return false;
    if (loadingSearch) return false;
    if (searchResults.length > 0) return false;
    if (parkName) return false;
    if (needsCountryPicker) return visitedCountries.length > 0;
    if (!customTargetCountryCode) return false;

    return true;
  }, [
    customTargetCountryCode,
    isEdit,
    loadingSearch,
    needsCountryPicker,
    parkName,
    searchResults.length,
    trimmedQuery,
    visitedCountries.length,
  ]);

  const parkTypeField = useMemo(
    () => ({
      type: "select" as const,
      id: "parkType",
      label: t("parkType"),
      options: [
        { value: "national_park", label: t("nationalPark") },
        { value: "theme_park", label: t("themePark") },
      ],
      defaultValue: "national_park",
    }),
    [t]
  );

  const handleAddCustomPark = useCallback(
    async (fieldValues?: Record<string, string>) => {
      const resolvedCountryCode = needsCountryPicker
        ? (fieldValues?.country ?? customCountryCode)
        : customTargetCountryCode;
      const resolvedParkType = (fieldValues?.parkType ?? "national_park") as ParkType;
      const country = visitedCountries.find((c) => c.country_code === resolvedCountryCode);

      if (!country || trimmedQuery.length < MIN_QUERY_LENGTH) return;

      const key = `${resolvedCountryCode.toUpperCase()}:${resolvedParkType}:${trimmedQuery.toLowerCase()}`;
      if (existingKeys.has(key)) {
        await modal.alert(t("alreadyOnMap"), { variant: "info" });
        return;
      }

      setLoading(true);
      try {
        const result = await addPark({
          park_name: trimmedQuery,
          park_type: resolvedParkType,
          country_code: country.country_code,
          country_name: country.country_name,
          note: note || undefined,
        });

        if (!result.ok) {
          await modal.alert(result.error, { variant: "error" });
          throw new Error(result.error);
        }

        toast.show(t("parkAdded"));
        lastPromptKeyRef.current = null;
        setSearchQuery("");
        setParkName("");
        setSearchResults([]);
        onSuccess?.();
      } finally {
        setLoading(false);
      }
    },
    [
      customCountryCode,
      customTargetCountryCode,
      existingKeys,
      modal,
      needsCountryPicker,
      note,
      onSuccess,
      t,
      toast,
      trimmedQuery,
      visitedCountries,
    ]
  );

  const runSearch = useCallback(
    async (q: string, countries: VisitedCountry[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (q.length < MIN_QUERY_LENGTH || countries.length === 0) {
        setSearchResults([]);
        setLoadingSearch(false);
        return;
      }

      setLoadingSearch(true);

      try {
        const params = new URLSearchParams({
          countries: encodeCountries(countries),
          q,
        });
        const res = await fetch(`/api/parks/search?${params}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          setSearchResults([]);
          await modal.alert("Could not search parks. Try again in a moment.", {
            variant: "error",
          });
          return;
        }

        const data = await res.json();
        setSearchResults(data.parks ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSearchResults([]);
        await modal.alert("Could not search parks. Try again in a moment.", {
          variant: "error",
        });
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSearch(false);
        }
      }
    },
    [modal]
  );

  useEffect(() => {
    if (isEdit) return;

    const q = searchQuery.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }

    setLoadingSearch(true);
    const timer = window.setTimeout(() => {
      runSearch(q, searchCountries);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [isEdit, runSearch, searchCountries, searchQuery]);

  useEffect(() => {
    if (isEdit || loadingSearch || loading || !canPromptCustomPark) {
      return;
    }

    const promptKey = needsCountryPicker
      ? trimmedQuery.toLowerCase()
      : `${customTargetCountryCode}:${trimmedQuery.toLowerCase()}`;
    const timer = window.setTimeout(() => {
      if (lastPromptKeyRef.current === promptKey) return;
      lastPromptKeyRef.current = promptKey;

      const fields = needsCountryPicker
        ? [
            {
              type: "select" as const,
              id: "country",
              label: t("country"),
              options: visitedCountries.map((country) => ({
                value: country.country_code,
                label: country.country_name,
              })),
              defaultValue: customCountryCode,
            },
            parkTypeField,
          ]
        : [parkTypeField];

      toast.showAction({
        message: needsCountryPicker
          ? t("customParkNotFound", {
              park: formatCityDisplayName(trimmedQuery),
            })
          : t("customParkNotFoundInCountry", {
              park: formatCityDisplayName(trimmedQuery),
              country: customTargetCountry?.country_name ?? "",
            }),
        fields,
        actionLabel: t("customParkAdd"),
        dismissLabel: tCommon("no"),
        accent: "emerald",
        onAction: handleAddCustomPark,
      });
    }, CUSTOM_PARK_TOAST_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    canPromptCustomPark,
    customCountryCode,
    customTargetCountry?.country_name,
    customTargetCountryCode,
    handleAddCustomPark,
    isEdit,
    loading,
    loadingSearch,
    needsCountryPicker,
    parkTypeField,
    t,
    tCommon,
    toast,
    trimmedQuery,
    visitedCountries,
  ]);

  useEffect(() => {
    if (!canPromptCustomPark) {
      lastPromptKeyRef.current = null;
      toast.dismiss();
    }
  }, [canPromptCustomPark, toast]);

  function handleSearchCountryFilterChange(value: string) {
    setSearchCountryFilter(value);
    if (value !== ALL_COUNTRIES) {
      setCountryCode(value);
    }
    setParkName("");
    setSearchQuery("");
    setSearchResults([]);
    lastPromptKeyRef.current = null;
  }

  function pickPark(result: SearchPark) {
    setParkName(result.name);
    setParkType(result.parkType);
    setCountryCode(result.country_code);
    setSearchQuery("");
    setSearchResults([]);
    lastPromptKeyRef.current = null;
  }

  async function handleSave() {
    if (!selectedCountry || !parkName.trim()) {
      toast.show(t("pickParkFirst"));
      return;
    }

    setLoading(true);

    try {
      const mediaResult = await buildPinMediaPayload({
        photoFile,
        savedPhotoUrl,
        removePhoto,
        instagramUrls,
        isValidInstagramUrl,
        formatPhotoUploadError,
      });

      if (!mediaResult.ok) {
        toast.show(mediaResult.error);
        await modal.alert(mediaResult.error, { variant: "error" });
        return;
      }

      const payload = {
        park_name: parkName,
        park_type: parkType,
        country_code: selectedCountry.country_code,
        country_name: selectedCountry.country_name,
        note: note || null,
        photo_url: mediaResult.photo_url,
        instagram_urls: mediaResult.instagram_urls,
        visit_dates: visitDates,
      };

      const res = await fetch(isEdit ? `/api/parks/${park!.id}` : "/api/parks", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        const message = (data.error as string) ?? "Failed to save park";
        if (res.status === 404 && isEdit) {
          notifyProfileDataChanged();
          onSuccess?.();
          return;
        }
        toast.show(message);
        await modal.alert(message, { variant: "error" });
        return;
      }

      toast.show(isEdit ? t("saveSuccess") : t("parkAdded"));
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

  function handlePhotoFileChange(file: File | null) {
    setPhotoFile(file);
    if (file) {
      setRemovePhoto(false);
      toast.show(t("photoSelected"));
    }
  }

  function renderMediaFields() {
    return (
      <PinMediaFields
        labels={{
          mediaHint: t("mediaHint"),
          photo: t("photo"),
          photoSaved: t("photoSaved"),
          instagram: t("instagram"),
          instagramHint: t("instagramHint"),
          addInstagram: hideHeader ? tCommon("addLink") : t("addInstagram"),
          removeInstagram: t("removeInstagram"),
          removePhoto: t("removePhoto"),
        }}
        savedPhotoUrl={savedPhotoUrl}
        photoFile={photoFile}
        onPhotoFileChange={handlePhotoFileChange}
        removePhoto={removePhoto}
        onRemovePhotoChange={setRemovePhoto}
        instagramUrls={instagramUrls}
        onInstagramUrlsChange={setInstagramUrls}
        autoFocusInstagram={mediaFocus === "instagram"}
        hideInstagramHint={hideHeader}
        defaultInstagramField={hideHeader}
        equalActionButtons={hideHeader}
      />
    );
  }

  if (isEdit && hideHeader && park) {
    async function handleFormSubmit(e: React.FormEvent) {
      e.preventDefault();
      await handleSave();
    }

    return (
      <form onSubmit={handleFormSubmit} className="dashboard-form-city profile-pin-edit-form">
        <ProfilePinEditFields
          visitDates={visitDates}
          onVisitDatesChange={setVisitDates}
          note={note}
          onNoteChange={setNote}
          savedPhotoUrl={savedPhotoUrl}
          photoFile={photoFile}
          onPhotoFileChange={handlePhotoFileChange}
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

  if (isEdit) {
    return (
      <div className="dashboard-form-park">
        <div className="dashboard-form-park__header">
          <h3 className="dashboard-form-park__title">{t("edit")}</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="dashboard-form-park__label">{t("parkName")}</label>
            <input
              value={parkName}
              onChange={(e) => setParkName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="dashboard-form-park__label">{t("parkType")}</label>
            <select
              value={parkType}
              onChange={(e) => setParkType(e.target.value as ParkType)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="national_park">{t("nationalPark")}</option>
              <option value="theme_park">{t("themePark")}</option>
            </select>
          </div>

          <div>
            <label className="dashboard-form-park__label">{t("country")}</label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              {visitedCountries.map((country) => (
                <option key={country.id} value={country.country_code}>
                  {country.country_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="dashboard-form-park__label">{t("note")}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={LIMITS.noteMaxLength}
              rows={3}
              placeholder={t("notePlaceholder")}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>

          <CityVisitDatesEditor
            key={park?.id}
            value={visitDates}
            onChange={setVisitDates}
          />

          {renderMediaFields()}

        </div>

        <div className="dashboard-form-park__footer">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="dashboard-form-park__btn-primary"
          >
            {loading ? tCommon("loading") : tCommon("save")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="dashboard-form-park__btn-secondary"
          >
            {tCommon("cancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-form-park">
      <div className="dashboard-form-park__header">
        <h3 className="dashboard-form-park__title">{t("add")}</h3>
      </div>

      <div className="space-y-4">
        {visitedCountries.length > 1 && (
          <div>
            <label className="dashboard-form-park__label">{t("searchIn")}</label>
            <select
              value={searchCountryFilter}
              onChange={(e) => handleSearchCountryFilterChange(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value={ALL_COUNTRIES}>{t("allMyCountries")}</option>
              {visitedCountries.map((country) => (
                <option key={country.id} value={country.country_code}>
                  {country.country_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="dashboard-form-park__label">{t("searchParks")}</label>
          <input
            value={searchQuery}
            onChange={(e) => {
              lastPromptKeyRef.current = null;
              setSearchQuery(e.target.value);
              setParkName("");
            }}
            placeholder={t("searchParksPlaceholder")}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </div>

        {trimmedQuery.length >= MIN_QUERY_LENGTH && (
          <>
            {(loadingSearch || searchResults.length > 0) && !parkName && (
              <ul className="max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950">
                {loadingSearch ? (
                  <li className="px-3 py-4 text-sm text-slate-500">{tCommon("loading")}</li>
                ) : (
                  searchResults.map((result) => {
                    const key = `${result.country_code}:${result.parkType}:${result.name.toLocaleLowerCase("tr")}`;
                    const onMap = existingKeys.has(
                      `${result.country_code.toUpperCase()}:${result.parkType}:${result.name.toLowerCase()}`
                    );

                    return (
                      <li key={key} className="border-b border-slate-800 last:border-b-0">
                        <button
                          type="button"
                          disabled={onMap}
                          onClick={() => pickPark(result)}
                          className="block w-full px-3 py-2.5 text-left hover:bg-slate-900 disabled:cursor-default disabled:opacity-50"
                        >
                          <span className="text-sm text-white">{result.name}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {result.subtitle ?? result.country_name}
                            {onMap ? ` · ${t("alreadyOnMap")}` : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            )}

            {!loadingSearch && searchResults.length === 0 && !canPromptCustomPark && (
              <p className="text-sm text-slate-500">{t("noParkResults")}</p>
            )}
          </>
        )}

        {trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH && (
          <p className="text-sm text-slate-500">{t("searchMinChars")}</p>
        )}

        {parkName && selectedCountry ? (
          <p className="text-sm text-emerald-300">
            {t("selectedPark", {
              park: parkName,
              country: selectedCountry.country_name,
            })}
          </p>
        ) : null}

        {parkName ? (
          <>
            <CityVisitDatesEditor
              key={parkName}
              value={visitDates}
              onChange={setVisitDates}
            />

            {renderMediaFields()}

            <div>
              <label className="dashboard-form-park__label">{t("note")}</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={LIMITS.noteMaxLength}
                rows={3}
                placeholder={t("notePlaceholder")}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="dashboard-form-park__footer">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || !parkName}
          className="dashboard-form-park__btn-primary"
        >
          {tCommon("save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="dashboard-form-park__btn-secondary"
        >
          {tCommon("cancel")}
        </button>
      </div>
    </div>
  );
}
