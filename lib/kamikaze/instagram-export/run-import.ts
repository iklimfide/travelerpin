import fs from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { revalidateCityHubForPin } from "@/lib/cache/revalidate-city-hub";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { getCountryName } from "@/lib/data/countries";
import {
  parseInstagramExportDirectory,
  resolveMediaAbsolutePath,
  type ParsedInstagramPost,
} from "@/lib/kamikaze/instagram-export/parse";
import {
  mergeHashtagJsonIntoLocationMap,
  topHashtagCounts,
  type HashtagFrequency,
} from "@/lib/kamikaze/instagram-export/hashtags";
import { parseIgnoreLocationLabels } from "@/lib/kamikaze/instagram-export/location-ignore";
import {
  createInstagramImportSessionId,
  reviewItemIdForFrameUri,
  saveInstagramImportSession,
  toPublicReviewItems,
  type InstagramImportReviewDecision,
  type InstagramImportReviewItemPublic,
  type InstagramImportSession,
  type InstagramImportSessionItem,
  loadInstagramImportSession,
  destroyInstagramImportSession,
} from "@/lib/kamikaze/instagram-export/review-session";
import {
  resolveCityForPost,
  cityBucket,
  type ImportCityMeta,
  type LocationMap,
  type CityResolveSource,
} from "@/lib/kamikaze/instagram-export/resolve-city";
import { ensureVisitedCountry } from "@/lib/supabase/ensure-visited-country";
import { isR2Configured, uploadPhotoToR2 } from "@/lib/storage/r2";
import { normalizeCityKey } from "@/lib/utils/city-name";
import { getPinPhotoObjectKey, optimizeImage } from "@/lib/utils/image";
import { normalizeInstagramPostUrl } from "@/lib/utils/instagram";
import { LIMITS } from "@/lib/constants";

export type InstagramImportPreviewRow = {
  bucket: string;
  label: string;
  city: ImportCityMeta;
  posts: number;
  photosOnDisk: number;
  instagramLinks: number;
  missingFiles: number;
};

export type InstagramImportApplyRow = {
  city: string;
  mode: "inserted" | "updated";
  cityId: string;
  photoCount: number;
  igCount: number;
  uploadedThisRun: number;
};

export type InstagramImportHashtagStats = {
  postsWithHashtags: number;
  resolvedByHashtagMap: number;
  resolvedByHashtagGeocode: number;
  ignoredPostingLocationPosts: number;
  unassignedTopHashtags: HashtagFrequency[];
};

export type InstagramImportResult = {
  jsonFiles: number;
  postCount: number;
  preview: InstagramImportPreviewRow[];
  skippedUnassignedPhotos: number;
  hashtagStats?: InstagramImportHashtagStats;
  sessionId?: string;
  reviewItems?: InstagramImportReviewItemPublic[];
  cityOptions?: Array<{ bucket: string; label: string; city_name: string; country_code: string }>;
  applied?: InstagramImportApplyRow[];
};

type CityGroup = {
  city: ImportCityMeta;
  posts: ParsedInstagramPost[];
  frames: { abs: string; uri: string }[];
  permalinks: string[];
  missingFiles: number;
  seenFrameUris: Set<string>;
};

function mergeUniqueUrls(existing: string[], added: string[]): string[] {
  const seen = new Set(existing.map((u) => u.toLowerCase()));
  const out = [...existing];
  for (const raw of added) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

async function findVisitedCity(
  supabase: SupabaseClient,
  userId: string,
  countryCode: string,
  cityName: string
) {
  const code = countryCode.toUpperCase();
  const key = normalizeCityKey(cityName);
  const { data, error } = await supabase
    .from("visited_cities")
    .select("*")
    .eq("user_id", userId)
    .eq("country_code", code);
  if (error) throw new Error(error.message);
  return (data ?? []).find((row) => normalizeCityKey(row.city_name) === key) ?? null;
}

async function uploadPinPhotoFromFile(userId: string, filePath: string): Promise<string> {
  const inputBuffer = fs.readFileSync(filePath);
  if (inputBuffer.byteLength > LIMITS.maxPinPhotoBytes) {
    throw new Error("Image file too large");
  }
  const optimized = await optimizeImage(inputBuffer, "image/jpeg");
  const ext = optimized.extension === "jpeg" ? "jpg" : optimized.extension;
  const key = getPinPhotoObjectKey(userId, filePath.split(/[/\\]/).pop() ?? "photo", ext);
  return uploadPhotoToR2(key, optimized.buffer, optimized.contentType);
}

async function upsertCityPinMedia(options: {
  supabase: SupabaseClient;
  userId: string;
  cityMeta: ImportCityMeta;
  photoUrls: string[];
  instagramUrls: string[];
}) {
  const { supabase, userId, cityMeta, photoUrls, instagramUrls } = options;
  const countryName =
    cityMeta.country_name || getCountryName(cityMeta.country_code, "en") || cityMeta.country_code;

  await ensureVisitedCountry(supabase, userId, cityMeta.country_code, countryName);

  const existing = await findVisitedCity(
    supabase,
    userId,
    cityMeta.country_code,
    cityMeta.city_name
  );

  const mergedPhotos = mergeUniqueUrls(
    Array.isArray(existing?.photo_urls)
      ? (existing.photo_urls as string[])
      : existing?.photo_url
        ? [existing.photo_url]
        : [],
    photoUrls
  );
  const mergedIg = mergeUniqueUrls(
    Array.isArray(existing?.instagram_urls) ? (existing.instagram_urls as string[]) : [],
    instagramUrls
  );

  const photo_url = mergedPhotos[0] ?? null;
  const payload = {
    photo_url,
    photo_urls: mergedPhotos,
    instagram_urls: mergedIg,
    media_type: photo_url ? "photo" : mergedIg.length > 0 ? "instagram" : null,
    media_url: photo_url ?? mergedIg[0] ?? null,
    media_preview_url: photo_url,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("visited_cities")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { mode: "updated" as const, cityId: existing.id as string, photoCount: mergedPhotos.length, igCount: mergedIg.length };
  }

  const insertRow = {
    user_id: userId,
    city_name: cityMeta.city_name,
    country_code: cityMeta.country_code.toUpperCase(),
    country_name: countryName,
    latitude: cityMeta.latitude ?? null,
    longitude: cityMeta.longitude ?? null,
    note: null,
    visit_dates: [],
    ...payload,
  };

  const { data, error } = await supabase
    .from("visited_cities")
    .insert(insertRow)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { mode: "inserted" as const, cityId: data.id as string, photoCount: mergedPhotos.length, igCount: mergedIg.length };
}

async function buildGroups(
  exportRoot: string,
  posts: ParsedInstagramPost[],
  locationMap: LocationMap,
  geocodeHashtags: boolean,
  geocodeGps: boolean,
  ignoreLocationLabels: Set<string>
): Promise<{
  groups: Map<string, CityGroup>;
  resolveSources: Map<ParsedInstagramPost, CityResolveSource>;
  postCities: Map<ParsedInstagramPost, ImportCityMeta>;
}> {
  const groups = new Map<string, CityGroup>();
  const resolveSources = new Map<ParsedInstagramPost, CityResolveSource>();
  const postCities = new Map<ParsedInstagramPost, ImportCityMeta>();

  for (const post of posts) {
    const { city, source } = await resolveCityForPost(post, locationMap, {
      geocodeHashtags,
      geocodeGps,
      ignoreLocationLabels,
    });
    resolveSources.set(post, source);
    postCities.set(post, city);
    const bucket = city.bucket;
    if (!groups.has(bucket)) {
      groups.set(bucket, {
        city,
        posts: [],
        frames: [],
        permalinks: [],
        missingFiles: 0,
        seenFrameUris: new Set(),
      });
    }
    const group = groups.get(bucket)!;
    group.posts.push(post);
    if (post.permalink) {
      group.permalinks.push(normalizeInstagramPostUrl(post.permalink));
    }
    for (const frame of post.frames) {
      const abs = resolveMediaAbsolutePath(exportRoot, frame.uri);
      const uriKey = frame.uri.replace(/^\.\//, "").replace(/\\/g, "/").toLowerCase();
      if (group.seenFrameUris.has(uriKey)) continue;
      group.seenFrameUris.add(uriKey);
      if (abs) {
        group.frames.push({ abs, uri: frame.uri });
      } else {
        group.missingFiles += 1;
      }
    }
  }

  return { groups, resolveSources, postCities };
}

function buildSessionItemsFromPosts(
  exportRoot: string,
  posts: ParsedInstagramPost[],
  postCities: Map<ParsedInstagramPost, ImportCityMeta>,
  resolveSources: Map<ParsedInstagramPost, CityResolveSource>
): InstagramImportSessionItem[] {
  const items: InstagramImportSessionItem[] = [];
  const seenUri = new Set<string>();

  for (const post of posts) {
    const city = postCities.get(post) ?? {
      city_name: "",
      country_code: "",
      country_name: "",
      latitude: null,
      longitude: null,
      bucket: "__unassigned__",
    };
    const resolveSource = resolveSources.get(post) ?? "unassigned";
    const captionPreview = post.caption
      ? post.caption.length > 140
        ? `${post.caption.slice(0, 140)}…`
        : post.caption
      : null;

    for (const frame of post.frames) {
      const uriKey = frame.uri.replace(/^\.\//, "").replace(/\\/g, "/").toLowerCase();
      if (seenUri.has(uriKey)) continue;
      seenUri.add(uriKey);

      const abs = resolveMediaAbsolutePath(exportRoot, frame.uri);
      items.push({
        id: reviewItemIdForFrameUri(frame.uri),
        frameUri: frame.uri,
        absPath: abs ?? "",
        permalink: post.permalink,
        locationLabel: post.locationLabel,
        hashtags: post.hashtags,
        captionPreview,
        resolveSource,
        city,
        hasFile: Boolean(abs),
      });
    }
  }

  return items;
}

function cityOptionsFromReviewItems(items: InstagramImportSessionItem[]) {
  const map = new Map<string, { bucket: string; label: string; city_name: string; country_code: string }>();
  for (const item of items) {
    if (item.city.bucket === "__unassigned__" || !item.city.city_name || !item.city.country_code) {
      continue;
    }
    if (!map.has(item.city.bucket)) {
      map.set(item.city.bucket, {
        bucket: item.city.bucket,
        label: `${item.city.city_name}, ${item.city.country_code}`,
        city_name: item.city.city_name,
        country_code: item.city.country_code,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function cityMetaFromDecision(
  decision: InstagramImportReviewDecision,
  fallback: ImportCityMeta
): ImportCityMeta | null {
  const city_name = decision.city_name.trim() || fallback.city_name;
  const country_code = (decision.country_code.trim() || fallback.country_code).toUpperCase();
  const country_name = decision.country_name?.trim() || fallback.country_name || country_code;
  if (!city_name || !country_code) return null;
  return {
    city_name,
    country_code,
    country_name,
    latitude: fallback.latitude,
    longitude: fallback.longitude,
    bucket: cityBucket({ city_name, country_code }),
  };
}

export async function applyInstagramImportReview(options: {
  sessionId: string;
  decisions: InstagramImportReviewDecision[];
  supabase: SupabaseClient;
  targetUserId: string;
  targetUsername?: string;
}): Promise<InstagramImportResult> {
  const session = loadInstagramImportSession(options.sessionId);
  if (!session) {
    throw new Error("Önizleme oturumu bulunamadı veya süresi doldu — ZIP ile yeniden önizle.");
  }
  if (session.targetUserId !== options.targetUserId) {
    throw new Error("Session profile mismatch");
  }
  if (!isR2Configured()) {
    throw new Error("R2 is not configured");
  }

  const decisionById = new Map(options.decisions.map((d) => [d.id, d]));

  type UploadGroup = {
    city: ImportCityMeta;
    frames: { absPath: string }[];
    permalinks: string[];
  };
  const uploadGroups = new Map<string, UploadGroup>();

  for (const item of session.items) {
    const decision = decisionById.get(item.id);
    if (!decision?.approved) continue;
    if (!item.hasFile || !item.absPath) continue;

    const city = cityMetaFromDecision(decision, item.city);
    if (!city) continue;

    if (!uploadGroups.has(city.bucket)) {
      uploadGroups.set(city.bucket, { city, frames: [], permalinks: [] });
    }
    const group = uploadGroups.get(city.bucket)!;
    group.frames.push({ absPath: item.absPath });
    if (item.permalink) {
      group.permalinks.push(normalizeInstagramPostUrl(item.permalink));
    }
  }

  const applied: InstagramImportApplyRow[] = [];
  const touchedCities: ImportCityMeta[] = [];
  let skippedUnassignedPhotos = 0;

  for (const item of session.items) {
    const decision = decisionById.get(item.id);
    if (!decision?.approved) {
      if (item.hasFile) skippedUnassignedPhotos += 1;
    }
  }

  for (const group of uploadGroups.values()) {
    const uploadedUrls: string[] = [];
    for (const frame of group.frames) {
      try {
        uploadedUrls.push(await uploadPinPhotoFromFile(options.targetUserId, frame.absPath));
      } catch (err) {
        console.warn("Instagram import upload failed:", frame.absPath, err);
      }
    }

    const uniqueIg = [...new Set(group.permalinks)];
    if (uploadedUrls.length === 0 && uniqueIg.length === 0) continue;

    const saved = await upsertCityPinMedia({
      supabase: options.supabase,
      userId: options.targetUserId,
      cityMeta: group.city,
      photoUrls: uploadedUrls,
      instagramUrls: uniqueIg,
    });

    touchedCities.push(group.city);
    applied.push({
      city: `${group.city.city_name}, ${group.city.country_code}`,
      uploadedThisRun: uploadedUrls.length,
      ...saved,
    });
  }

  await revalidateProfileForPin(options.supabase, options.targetUserId);
  for (const city of touchedCities) {
    await revalidateCityHubForPin(city.country_code, city.city_name);
  }
  if (options.targetUsername?.trim().toLowerCase() === "guvencgiller") {
    revalidateTag("jennifer-demo-guvenc-pins-v4", "max");
  }

  destroyInstagramImportSession(options.sessionId);

  return {
    jsonFiles: 0,
    postCount: session.items.length,
    preview: [],
    skippedUnassignedPhotos,
    applied,
  };
}

export function persistInstagramImportReviewSession(options: {
  tempParent: string;
  exportRoot: string;
  targetUsername: string;
  targetUserId: string;
  items: InstagramImportSessionItem[];
}): { sessionId: string; reviewItems: InstagramImportReviewItemPublic[]; cityOptions: InstagramImportResult["cityOptions"] } {
  const sessionId = createInstagramImportSessionId();
  const session: InstagramImportSession = {
    sessionId,
    createdAt: Date.now(),
    tempParent: options.tempParent,
    exportRoot: options.exportRoot,
    targetUsername: options.targetUsername,
    targetUserId: options.targetUserId,
    items: options.items,
  };
  saveInstagramImportSession(session);
  return {
    sessionId,
    reviewItems: toPublicReviewItems(options.items),
    cityOptions: cityOptionsFromReviewItems(options.items),
  };
}

function previewFromGroups(groups: Map<string, CityGroup>): InstagramImportPreviewRow[] {
  const rows: InstagramImportPreviewRow[] = [];
  for (const [bucket, group] of groups) {
    const label =
      bucket === "__unassigned__"
        ? "(atanmamış — konum/GPS yok)"
        : `${group.city.city_name}, ${group.city.country_code}`;
    rows.push({
      bucket,
      label,
      city: group.city,
      posts: group.posts.length,
      photosOnDisk: group.frames.length,
      instagramLinks: new Set(group.permalinks).size,
      missingFiles: group.missingFiles,
    });
  }
  rows.sort((a, b) => b.photosOnDisk - a.photosOnDisk);
  return rows;
}

function hashtagStatsFromBuild(
  posts: ParsedInstagramPost[],
  resolveSources: Map<ParsedInstagramPost, CityResolveSource>
): InstagramImportHashtagStats {
  let postsWithHashtags = 0;
  let resolvedByHashtagMap = 0;
  let resolvedByHashtagGeocode = 0;
  let ignoredPostingLocationPosts = 0;
  const unassignedPosts: ParsedInstagramPost[] = [];

  for (const post of posts) {
    if (post.hashtags.length > 0) postsWithHashtags += 1;
    const source = resolveSources.get(post);
    if (source === "hashtag_map") resolvedByHashtagMap += 1;
    if (source === "hashtag_geocode") resolvedByHashtagGeocode += 1;
    if (source === "location_ignored") ignoredPostingLocationPosts += 1;
    if (source === "unassigned" || source === "location_ignored") unassignedPosts.push(post);
  }

  return {
    postsWithHashtags,
    resolvedByHashtagMap,
    resolvedByHashtagGeocode,
    ignoredPostingLocationPosts,
    unassignedTopHashtags: topHashtagCounts(unassignedPosts),
  };
}

export async function runInstagramImport(options: {
  exportRoot: string;
  limit?: number;
  locationMap?: LocationMap;
  hashtagMapJson?: string;
  ignoreLocationLabelsRaw?: string;
  geocodeHashtags?: boolean;
  geocodeGps?: boolean;
  apply: boolean;
  persistReviewSession?: boolean;
  supabase?: SupabaseClient;
  targetUserId?: string;
  targetUsername?: string;
  tempParent?: string;
}): Promise<InstagramImportResult> {
  const { exportRoot, apply, supabase, targetUserId } = options;
  const limit = options.limit ?? Infinity;
  const geocodeHashtags = options.geocodeHashtags !== false;
  const geocodeGps = options.geocodeGps !== false;
  const ignoreLocationLabels = parseIgnoreLocationLabels(options.ignoreLocationLabelsRaw);
  const locationMap = mergeHashtagJsonIntoLocationMap(
    options.locationMap ?? {},
    options.hashtagMapJson ?? ""
  );

  let posts = parseInstagramExportDirectory(exportRoot);
  const jsonFiles = new Set(posts.map((p) => p.sourceFile)).size;
  posts = posts.slice(0, limit);

  if (posts.length === 0) {
    return {
      jsonFiles,
      postCount: 0,
      preview: [],
      skippedUnassignedPhotos: 0,
    };
  }

  const { groups, resolveSources, postCities } = await buildGroups(
    exportRoot,
    posts,
    locationMap,
    geocodeHashtags,
    geocodeGps,
    ignoreLocationLabels
  );
  const preview = previewFromGroups(groups);
  const hashtagStats = hashtagStatsFromBuild(posts, resolveSources);
  const sessionItems = buildSessionItemsFromPosts(exportRoot, posts, postCities, resolveSources);

  if (!apply) {
    const unassigned = groups.get("__unassigned__");
    const base = {
      jsonFiles,
      postCount: posts.length,
      preview,
      skippedUnassignedPhotos: unassigned?.frames.length ?? 0,
      hashtagStats,
    };

    if (options.persistReviewSession && options.targetUserId && options.targetUsername) {
      const persisted = persistInstagramImportReviewSession({
        tempParent: options.tempParent ?? "",
        exportRoot,
        targetUsername: options.targetUsername,
        targetUserId: options.targetUserId,
        items: sessionItems,
      });
      return {
        ...base,
        sessionId: persisted.sessionId,
        reviewItems: persisted.reviewItems,
        cityOptions: persisted.cityOptions,
      };
    }

    return base;
  }

  if (!supabase || !targetUserId) {
    throw new Error("Apply requires Supabase admin client and target user id");
  }
  if (!isR2Configured()) {
    throw new Error("R2 is not configured");
  }

  const applied: InstagramImportApplyRow[] = [];
  let skippedUnassignedPhotos = 0;
  const touchedCities: ImportCityMeta[] = [];

  for (const [bucket, group] of groups) {
    if (bucket === "__unassigned__") {
      skippedUnassignedPhotos += group.frames.length;
      continue;
    }
    if (!group.city.city_name || !group.city.country_code) continue;

    const uploadedUrls: string[] = [];
    for (const frame of group.frames) {
      try {
        uploadedUrls.push(await uploadPinPhotoFromFile(targetUserId, frame.abs));
      } catch (err) {
        console.warn("Instagram import upload failed:", frame.uri, err);
      }
    }

    const uniqueIg = [...new Set(group.permalinks)];
    if (uploadedUrls.length === 0 && uniqueIg.length === 0) continue;

    const saved = await upsertCityPinMedia({
      supabase,
      userId: targetUserId,
      cityMeta: group.city,
      photoUrls: uploadedUrls,
      instagramUrls: uniqueIg,
    });

    touchedCities.push(group.city);
    applied.push({
      city: `${group.city.city_name}, ${group.city.country_code}`,
      uploadedThisRun: uploadedUrls.length,
      ...saved,
    });
  }

  await revalidateProfileForPin(supabase, targetUserId);
  for (const city of touchedCities) {
    await revalidateCityHubForPin(city.country_code, city.city_name);
  }
  if (options.targetUsername?.trim().toLowerCase() === "guvencgiller") {
    revalidateTag("jennifer-demo-guvenc-pins-v4", "max");
  }

  return {
    jsonFiles,
    postCount: posts.length,
    preview,
    skippedUnassignedPhotos,
    hashtagStats,
    applied,
  };
}
