import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type MessageTree = { [key: string]: string | MessageTree };

export type I18nEntry = {
  path: string;
  namespace: string;
  en: string;
  tr: string;
};

const MESSAGES_DIR = path.join(process.cwd(), "messages");

export function messagesFilePath(locale: "en" | "tr"): string {
  return path.join(MESSAGES_DIR, `${locale}.json`);
}

export async function readMessagesFile(locale: "en" | "tr"): Promise<MessageTree> {
  const raw = await readFile(messagesFilePath(locale), "utf8");
  return JSON.parse(raw) as MessageTree;
}

export function flattenMessages(
  tree: MessageTree,
  prefix = ""
): { path: string; value: string }[] {
  const out: { path: string; value: string }[] = [];
  for (const [key, value] of Object.entries(tree)) {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out.push({ path: nextPath, value });
    } else if (value && typeof value === "object") {
      out.push(...flattenMessages(value, nextPath));
    }
  }
  return out;
}

export function getMessageAtPath(tree: MessageTree, messagePath: string): string | undefined {
  const parts = messagePath.split(".");
  let current: string | MessageTree | undefined = tree;
  for (const part of parts) {
    if (!current || typeof current === "string") return undefined;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function setMessageAtPath(
  tree: MessageTree,
  messagePath: string,
  value: string
): boolean {
  const parts = messagePath.split(".");
  let current: MessageTree = tree;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const next = current[part];
    if (!next || typeof next === "string") return false;
    current = next;
  }
  const leaf = parts[parts.length - 1]!;
  if (typeof current[leaf] !== "string") return false;
  current[leaf] = value;
  return true;
}

export function buildI18nEntries(en: MessageTree, tr: MessageTree): I18nEntry[] {
  return flattenMessages(en).map(({ path: messagePath, value: enValue }) => {
    const namespace = messagePath.split(".")[0] ?? "";
    const trValue = getMessageAtPath(tr, messagePath);
    return {
      path: messagePath,
      namespace,
      en: enValue,
      tr: trValue ?? "",
    };
  });
}

export async function writeTrMessagesFile(tree: MessageTree): Promise<void> {
  const payload = `${JSON.stringify(tree, null, 2)}\n`;
  await writeFile(messagesFilePath("tr"), payload, "utf8");
}

export function listNamespaces(tree: MessageTree): string[] {
  return Object.keys(tree).sort((a, b) => a.localeCompare(b));
}
