"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LIMITS } from "@/lib/constants";
import { useTranslateCity, useTranslateCommon } from "@/lib/i18n/client-messages";
import { addCity } from "@/lib/client/city-actions";
import { notifyProfileDataChanged } from "@/lib/client/session-page-cache";
import { executeBackgroundPinSave } from "@/lib/client/background-pin-save";
import { formatPinPhotoUploadError } from "@/lib/client/format-pin-photo-upload-error";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { formatPhotoUploadError } from "@/lib/utils/photo-upload-error";
import { isValidInstagramUrl } from "@/lib/utils/instagram";
import { useModal } from "@/components/ui/ModalProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { CityVisitDatesEditor } from "@/components/dashboard/CityVisitDatesEditor";
import { buildPinMediaPayload, PinMediaFields } from "@/components/dashboard/PinMediaFields";
import { ProfilePinEditFields } from "@/components/profile/ProfilePinEditFields";
import { readInstagramUrls, readPhotoUrls, pinPhotoMediaChanged, withInstagramDraftField } from "@/lib/utils/pin-media";
import { createPinPhotoFormState } from "@/lib/client/pin-photo-form-state";
import type { VisitedCity, VisitedCountry } from "@/types/database";

type SearchCity = {
  id: string;
  name: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  country_code: string;
  country_name: string;
};

const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;
const CUSTOM_CITY_TOAST_DELAY_MS = 500;
const ALL_COUNTRIES = "ALL";

type CityFormProps = {
  city?: VisitedCity;
  visitedCountries: VisitedCountry[];
  existingCities?: VisitedCity[];
  onSuccess?: () => void;
  onCancel?: () => void;
  onEditExisting?: (cityId: string) => void;
  mediaFocus?: "photo" | "instagram";
  hideHeader?: boolean;
};

function encodeCountries(countries: VisitedCountry[]): string {
  return countries
    .map((c) => `${c.country_code}|${encodeURIComponent(c.country_name)}`)
    .join(",");
}

export function CityForm({
  city,
  visitedCountries,
  existingCities = [],
  onSuccess,
  onCancel,
  onEditExisting,
  mediaFocus,
  hideHeader = false,
}: CityFormProps) {
  const isEdit = Boolean(city);
  const t = useTranslateCity();
  const tCommon = useTranslateCommon();
  const modal = useModal();
  const toast = useToast();
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const lastPromptKeyRef = useRef<string | null>(null);

  const [countryCode, setCountryCode] = useState(
    city?.country_code ?? visitedCountries[0]?.country_code ?? ""
  );
  const [searchCountryFilter, setSearchCountryFilter] = useState(ALL_COUNTRIES);
  const [cityName, setCityName] = useState(city?.city_name ?? "");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    city && city.latitude != null && city.longitude != null
      ? { latitude: city.latitude, longitude: city.longitude }
      : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [customCountryCode, setCustomCountryCode] = useState(
    city?.country_code ?? visitedCountries[0]?.country_code ?? ""
  );
  const [searchResults, setSearchResults] = useState<SearchCity[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [note, setNote] = useState(city?.note ?? "");
  const [visitDates, setVisitDates] = useState<string[]>(city?.visit_dates ?? []);
  const [savedPhotoUrls, setSavedPhotoUrls] = useState(() => createPinPhotoFormState(city).savedPhotoUrls);
  const [removedSavedPhotoUrls, setRemovedSavedPhotoUrls] = useState<string[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [instagramUrls, setInstagramUrls] = useState(() => {
    const urls = readInstagramUrls(city);
    if (hideHeader) return withInstagramDraftField(urls);
    return mediaFocus === "instagram" ? withInstagramDraftField(urls) : urls;
  });
  const [loading, setLoading] = useState(false);

  const selectedCountry = visitedCountries.find((c) => c.country_code === countryCode);

  const searchCountries = useMemo(() => {
    if (searchCountryFilter === ALL_COUNTRIES) {
      return visitedCountries;
    }
    return visitedCountries.filter((c) => c.country_code === searchCountryFilter);
  }, [searchCountryFilter, visitedCountries]);

  const existingKeys = useMemo(
    () =>
      new Set(
        existingCities.map(
          (c) => `${c.country_code.toUpperCase()}:${c.city_name.toLowerCase()}`
        )
      ),
    [existingCities]
  );

  const trimmedQuery = searchQuery.trim();

  const customTargetCountryCode =
    searchCountryFilter !== ALL_COUNTRIES ? searchCountryFilter : customCountryCode;

  const customTargetCountry = visitedCountries.find(
    (c) => c.country_code === customTargetCountryCode
  );

  const needsCountryPicker = searchCountryFilter === ALL_COUNTRIES;

  const canPromptCustomCity = useMemo(() => {
    if (isEdit || trimmedQuery.length < MIN_QUERY_LENGTH) return false;
    if (loadingSearch) return false;
    if (searchResults.length > 0) return false;
    if (needsCountryPicker) return visitedCountries.length > 0;
    if (!customTargetCountryCode) return false;

    const key = `${customTargetCountryCode.toUpperCase()}:${trimmedQuery.toLowerCase()}`;
    return !existingKeys.has(key);
  }, [
    customTargetCountryCode,
    existingKeys,
    isEdit,
    loadingSearch,
    needsCountryPicker,
    searchResults.length,
    trimmedQuery,
    visitedCountries.length,
  ]);

  const handleAddCustomCity = useCallback(
    async (fieldValues?: Record<string, string>) => {
      const resolvedCountryCode = needsCountryPicker
        ? (fieldValues?.country ?? customCountryCode)
        : customTargetCountryCode;
      const country = visitedCountries.find((c) => c.country_code === resolvedCountryCode);

      if (!country || trimmedQuery.length < MIN_QUERY_LENGTH) return;

      const key = `${resolvedCountryCode.toUpperCase()}:${trimmedQuery.toLowerCase()}`;
      if (existingKeys.has(key)) {
        await modal.alert(t("alreadyOnMap"), { variant: "info" });
        return;
      }

      setLoading(true);

      try {
        const result = await addCity({
          city_name: trimmedQuery,
          country_code: resolvedCountryCode,
          country_name: country.country_name,
        });

        if (!result.ok) {
          await modal.alert(result.error, { variant: "error" });
          throw new Error(result.error);
        }

        toast.show(t("cityAdded"));
        lastPromptKeyRef.current = null;
        setSearchQuery("");
        setCityName("");
        setCoords(null);
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
        const res = await fetch(`/api/cities/search?${params}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          setSearchResults([]);
          await modal.alert("Could not search cities. Try again in a moment.", {
            variant: "error",
          });
          return;
        }

        const data = await res.json();
        setSearchResults(data.cities ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSearchResults([]);
        await modal.alert("Could not search cities. Try again in a moment.", {
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

    const countries = searchCountries;
    setLoadingSearch(true);
    const timer = window.setTimeout(() => {
      runSearch(q, countries);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchQuery, searchCountries, isEdit, runSearch]);

  function handleSearchCountryFilterChange(value: string) {
    setSearchCountryFilter(value);
    setCityName("");
    setCoords(null);
    setSearchQuery("");
    setSearchResults([]);
    lastPromptKeyRef.current = null;
  }

  useEffect(() => {
    if (isEdit || loadingSearch || loading || !canPromptCustomCity) {
      return;
    }

    const promptKey = needsCountryPicker
      ? trimmedQuery.toLowerCase()
      : `${customTargetCountryCode}:${trimmedQuery.toLowerCase()}`;
    const timer = window.setTimeout(() => {
      if (lastPromptKeyRef.current === promptKey) return;
      lastPromptKeyRef.current = promptKey;

      if (needsCountryPicker) {
        toast.showAction({
          message: t("customCityNotFound", {
            city: formatCityDisplayName(trimmedQuery),
          }),
          fields: [
            {
              type: "select",
              id: "country",
              label: t("country"),
              options: visitedCountries.map((c) => ({
                value: c.country_code,
                label: c.country_name,
              })),
              defaultValue: customCountryCode,
            },
          ],
          actionLabel: t("customCityAdd"),
          dismissLabel: tCommon("no"),
          accent: "blue",
          onAction: handleAddCustomCity,
        });
        return;
      }

      toast.showAction({
        message: t("customCityNotFoundInCountry", {
          city: formatCityDisplayName(trimmedQuery),
          country: customTargetCountry!.country_name,
        }),
        actionLabel: t("customCityAdd"),
        dismissLabel: tCommon("no"),
        accent: "blue",
        onAction: handleAddCustomCity,
      });
    }, CUSTOM_CITY_TOAST_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    canPromptCustomCity,
    customCountryCode,
    customTargetCountry,
    customTargetCountryCode,
    handleAddCustomCity,
    isEdit,
    loading,
    loadingSearch,
    needsCountryPicker,
    t,
    tCommon,
    toast,
    trimmedQuery,
    visitedCountries,
  ]);

  useEffect(() => {
    if (!canPromptCustomCity) {
      lastPromptKeyRef.current = null;
      toast.dismiss();
    }
  }, [canPromptCustomCity, toast]);

  function pickSearchResult(result: SearchCity) {
    setCityName(result.name);
    setCountryCode(result.country_code);
    setCoords({ latitude: result.latitude, longitude: result.longitude });
    setSearchQuery(result.name);
    setSearchResults([]);
    setVisitDates([]);
  }

  function handleSearchResultClick(result: SearchCity) {
    const key = `${result.country_code.toUpperCase()}:${result.name.toLowerCase()}`;
    if (existingKeys.has(key)) {
      const existing = existingCities.find(
        (c) =>
          `${c.country_code.toUpperCase()}:${c.city_name.toLowerCase()}` === key
      );
      if (existing && onEditExisting) {
        onEditExisting(existing.id);
        return;
      }
      void modal.alert(t("alreadyOnMapEditHint"), { variant: "info" });
      return;
    }
    pickSearchResult(result);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!cityName.trim()) {
      await modal.alert(t("pickCityFirst"), { variant: "error" });
      return;
    }

    const resolvedCityName = cityName.trim();
    const resolvedCountryCode = countryCode;
    const resolvedCoords = coords;

    const countryName =
      visitedCountries.find((c) => c.country_code === resolvedCountryCode)?.country_name ??
      selectedCountry?.country_name;

    if (!countryName) {
      await modal.alert(t("addCountryFirst"), { variant: "error" });
      return;
    }

    if (!isEdit) {
      const key = `${resolvedCountryCode.toUpperCase()}:${resolvedCityName.toLowerCase()}`;
      if (existingKeys.has(key)) {
        await modal.alert(t("alreadyOnMap"), { variant: "info" });
        return;
      }
    }

    if (isEdit && city) {
      const key = `${resolvedCountryCode.toUpperCase()}:${resolvedCityName.toLowerCase()}`;
      const originalKey = `${city.country_code.toUpperCase()}:${city.city_name.toLowerCase()}`;
      if (key !== originalKey && existingKeys.has(key)) {
        await modal.alert(t("alreadyOnMap"), { variant: "info" });
        return;
      }
    }

    if (hideHeader && isEdit && city) {
      const mediaSnapshot = {
        savedPhotoUrls: [...savedPhotoUrls],
        removedSavedPhotoUrls: [...removedSavedPhotoUrls],
        newPhotoFiles: [...newPhotoFiles],
        instagramUrls: [...instagramUrls],
        previousPhotoUrls: readPhotoUrls(city),
      };
      const payloadBase = {
        city_name: resolvedCityName,
        country_code: resolvedCountryCode,
        country_name: countryName,
        note: note || null,
        visit_dates: visitDates,
      };
      const cityId = city.id;
      setLoading(true);
      try {
        const saved = await executeBackgroundPinSave({
          media: mediaSnapshot,
          genericSaveFailedMessage: tCommon("pinSaveFailed"),
          saveRecord: (media) =>
            fetch(`/api/cities/${cityId}`, {
              method: "PATCH",
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
      return;
    }

    setLoading(true);

    try {
      const mediaResult = await buildPinMediaPayload({
        savedPhotoUrls,
        removedSavedPhotoUrls,
        newPhotoFiles,
        instagramUrls,
        isValidInstagramUrl,
        formatPhotoUploadError: (message) => formatPinPhotoUploadError(tCommon, message),
      });

      if (!mediaResult.ok) {
        await modal.alert(mediaResult.error, { variant: "error" });
        return;
      }

      const payload = {
        city_name: resolvedCityName,
        country_code: resolvedCountryCode,
        country_name: countryName,
        ...(resolvedCoords && !isEdit
          ? { latitude: resolvedCoords.latitude, longitude: resolvedCoords.longitude }
          : {}),
        note: note || null,
        photo_url: mediaResult.photo_url,
        photo_urls: mediaResult.photo_urls,
        instagram_urls: mediaResult.instagram_urls,
        visit_dates: visitDates,
      };

      const url = city ? `/api/cities/${city.id}` : "/api/cities";
      const method = city ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        await modal.alert(data.error ?? "Failed to save city", { variant: "error" });
        return;
      }

      notifyProfileDataChanged();
      if (
        pinPhotoMediaChanged({
          savedPhotoUrls,
          removedSavedPhotoUrls,
          newPhotoFiles,
          previousPhotoUrls: readPhotoUrls(city),
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

  if (hideHeader && isEdit && city) {
    return (
      <form onSubmit={handleSubmit} className="dashboard-form-city profile-pin-edit-form">
        <div className="profile-pin-edit-fields profile-pin-edit-fields--location">
          <p className="profile-pin-edit-fields__section-title">{t("mediaEditPinLocation")}</p>
          <p className="text-xs text-slate-500">{t("mediaEditPinLocationHint")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="dashboard-form-city__label">{t("cityName")}</label>
              <input
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="dashboard-form-city__label">{t("country")}</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
              >
                {visitedCountries.map((c) => (
                  <option key={c.country_code} value={c.country_code}>
                    {c.country_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
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

  return (
    <form onSubmit={handleSubmit} className="dashboard-form-city">
      {!hideHeader ? (
        <div className="dashboard-form-city__header">
          <h3 className="dashboard-form-city__title">
            {isEdit ? t("edit") : t("add")}
          </h3>
        </div>
      ) : null}

      {!isEdit && (
        <>
          <p className="dashboard-form-city__hint">{t("searchHint")}</p>

          <div>
            <label className="dashboard-form-city__label">{t("searchIn")}</label>
            <select
              value={searchCountryFilter}
              onChange={(e) => handleSearchCountryFilterChange(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
            >
              <option value={ALL_COUNTRIES}>{t("allMyCountries")}</option>
              {visitedCountries.map((c) => (
                <option key={c.country_code} value={c.country_code}>
                  {c.country_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="dashboard-form-city__label">
              {t("searchCities")}
            </label>
            <div className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  lastPromptKeyRef.current = null;
                  setSearchQuery(e.target.value);
                  if (e.target.value !== cityName) {
                    setCityName("");
                    setCoords(null);
                  }
                }}
                placeholder={t("searchCitiesPlaceholder")}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-10 text-white outline-none focus:border-blue-500 [&::-webkit-search-cancel-button]:hidden"
                autoComplete="off"
                autoFocus
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    lastPromptKeyRef.current = null;
                    setSearchQuery("");
                    setCityName("");
                    setCoords(null);
                  }}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                  aria-label="Clear"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>

          {trimmedQuery.length >= MIN_QUERY_LENGTH && (
            <>
              {(loadingSearch || searchResults.length > 0) && (
                <ul className="max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 scrollbar-thin">
                  {loadingSearch ? (
                    <li className="px-3 py-4 text-center text-sm text-slate-500">
                      {tCommon("loading")}
                    </li>
                  ) : (
                    searchResults.map((result) => {
                      const alreadyAdded = existingKeys.has(
                        `${result.country_code.toUpperCase()}:${result.name.toLowerCase()}`
                      );

                      return (
                        <li key={result.id}>
                          <button
                            type="button"
                            onClick={() => handleSearchResultClick(result)}
                            className={`flex w-full flex-col px-3 py-2.5 text-left hover:bg-slate-800/80 ${
                              alreadyAdded ? "border-l-2 border-blue-500/70" : ""
                            }`}
                          >
                            <span className="text-sm text-slate-200">{result.name}</span>
                            {result.subtitle && (
                              <span className="truncate text-xs text-slate-500">
                                {result.subtitle}
                              </span>
                            )}
                            {alreadyAdded ? (
                              <span className="text-xs text-blue-400">{t("alreadyOnMapEdit")}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}

              {!loadingSearch && searchResults.length === 0 && !canPromptCustomCity && (
                <p className="text-sm text-slate-500">{t("noCityResults")}</p>
              )}
            </>
          )}

          {trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH && (
            <p className="text-sm text-slate-500">{t("searchMinChars")}</p>
          )}

          {cityName && (
            <p className="text-sm text-blue-400">
              {t("selectedCity", {
                city: cityName,
                country:
                  visitedCountries.find((c) => c.country_code === countryCode)?.country_name ??
                  "",
              })}
            </p>
          )}

          {cityName ? (
            <CityVisitDatesEditor
              key={cityName}
              value={visitDates}
              onChange={setVisitDates}
            />
          ) : (
            <p className="text-xs text-slate-500">{t("visitDatesPickCityFirst")}</p>
          )}
        </>
      )}

      {isEdit && !hideHeader && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="dashboard-form-city__label">{t("cityName")}</label>
            <input
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="dashboard-form-city__label">{t("country")}</label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
            >
              {visitedCountries.map((c) => (
                <option key={c.country_code} value={c.country_code}>
                  {c.country_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isEdit && !hideHeader && <p className="text-xs text-slate-500">{t("locationHint")}</p>}

      {isEdit && !hideHeader && (
        <CityVisitDatesEditor
          key={city?.id}
          value={visitDates}
          onChange={setVisitDates}
        />
      )}

      {!hideHeader ? (
        <>
          <PinMediaFields
            labels={{
              mediaHint: t("mediaHint"),
              photo: t("photo"),
              photoLibrary: t("photoLibrary"),
              photoSaved: t("photoSaved"),
              instagram: t("instagram"),
              instagramHint: t("instagramHint"),
              addInstagram: t("addInstagram"),
              removeInstagram: t("removeInstagram"),
              removePhoto: t("removePhoto"),
            }}
            savedPhotoUrls={savedPhotoUrls}
            removedSavedPhotoUrls={removedSavedPhotoUrls}
            onRemovedSavedPhotoUrlsChange={setRemovedSavedPhotoUrls}
            newPhotoFiles={newPhotoFiles}
            onNewPhotoFilesChange={setNewPhotoFiles}
            instagramUrls={instagramUrls}
            onInstagramUrlsChange={setInstagramUrls}
            autoFocusInstagram={mediaFocus === "instagram"}
            onPhotoPickError={(message) => {
              void modal.alert(message, { variant: "error" });
            }}
            photoUnsupportedFormatMessage={tCommon("photoUploadUnsupportedFormat")}
          />

          <div>
            <label className="dashboard-form-city__label">{t("note")}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, LIMITS.noteMaxLength))}
              rows={4}
              placeholder={t("notePlaceholder")}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-right text-xs text-slate-500">
              {t("noteCount", { count: note.length, max: LIMITS.noteMaxLength })}
            </p>
          </div>

          <div className="dashboard-form-city__footer">
            <button
              type="submit"
              disabled={loading || (!isEdit && !cityName.trim())}
              className="dashboard-form-city__btn-primary"
            >
              {loading ? tCommon("loading") : tCommon("save")}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="dashboard-form-city__btn-secondary"
              >
                {tCommon("cancel")}
              </button>
            )}
          </div>
        </>
      ) : null}
    </form>
  );
}
