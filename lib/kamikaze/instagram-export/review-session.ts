import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import type { ImportCityMeta, CityResolveSource } from "@/lib/kamikaze/instagram-export/resolve-city";
import { removeTempDir } from "@/lib/kamikaze/instagram-export/extract-zip";

const SESSION_TTL_MS = 3 * 60 * 60 * 1000;

export type InstagramImportSessionItem = {
  id: string;
  frameUri: string;
  absPath: string;
  permalink: string | null;
  locationLabel: string | null;
  hashtags: string[];
  captionPreview: string | null;
  resolveSource: CityResolveSource;
  city: ImportCityMeta;
  hasFile: boolean;
};

export type InstagramImportSession = {
  sessionId: string;
  createdAt: number;
  tempParent: string;
  exportRoot: string;
  targetUsername: string;
  targetUserId: string;
  items: InstagramImportSessionItem[];
};

function sessionsRoot() {
  return path.join(os.tmpdir(), "tp-ig-import-sessions");
}

function sessionPath(sessionId: string) {
  const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(sessionsRoot(), `${safe}.json`);
}

export function reviewItemIdForFrameUri(frameUri: string): string {
  const key = frameUri.replace(/^\.\//, "").replace(/\\/g, "/").toLowerCase();
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 20);
}

export function saveInstagramImportSession(session: InstagramImportSession): void {
  fs.mkdirSync(sessionsRoot(), { recursive: true });
  fs.writeFileSync(sessionPath(session.sessionId), JSON.stringify(session), "utf8");
}

function readSessionFile(sessionId: string): InstagramImportSession | null {
  const file = sessionPath(sessionId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as InstagramImportSession;
  } catch {
    return null;
  }
}

export function loadInstagramImportSession(sessionId: string): InstagramImportSession | null {
  const session = readSessionFile(sessionId);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    destroyInstagramImportSession(sessionId);
    return null;
  }
  if (!session.tempParent || !fs.existsSync(session.exportRoot)) {
    destroyInstagramImportSession(sessionId);
    return null;
  }
  return session;
}

export function destroyInstagramImportSession(sessionId: string): void {
  const session = readSessionFile(sessionId);
  try {
    fs.unlinkSync(sessionPath(sessionId));
  } catch {
    // ignore
  }
  if (session?.tempParent) {
    removeTempDir(session.tempParent);
  }
}

export function createInstagramImportSessionId(): string {
  return crypto.randomBytes(12).toString("hex");
}

export type InstagramImportReviewItemPublic = Omit<InstagramImportSessionItem, "absPath"> & {
  suggestedApproved: boolean;
};

export function toPublicReviewItems(items: InstagramImportSessionItem[]): InstagramImportReviewItemPublic[] {
  return items.map((item) => {
    const { absPath: _abs, ...rest } = item;
    return {
      ...rest,
      suggestedApproved: item.hasFile && item.city.bucket !== "__unassigned__",
    };
  });
}

export type InstagramImportReviewDecision = {
  id: string;
  approved: boolean;
  city_name: string;
  country_code: string;
  country_name?: string;
};
