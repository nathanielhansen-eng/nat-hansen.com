import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "content", "book-chat");

export type BookMeta = {
  title: string;
  author: string;
  [key: string]: unknown;
};

export type Chapter = {
  title: string;
  summary?: string;
  key_claims?: string[];
  glossary?: string[];
  opener?: string;
  voice_reminder?: string;
  text?: string;
};

export type LightChapter = Omit<Chapter, "text" | "voice_reminder">;

export async function listBooks(): Promise<Array<BookMeta & { slug: string }>> {
  let entries: string[];
  try {
    entries = await fs.readdir(ROOT);
  } catch {
    return [];
  }
  const out: Array<BookMeta & { slug: string }> = [];
  for (const slug of entries.sort()) {
    const dir = path.join(ROOT, slug);
    const stat = await fs.stat(dir).catch(() => null);
    if (!stat?.isDirectory()) continue;
    const metaPath = path.join(dir, "meta.json");
    const chaptersPath = path.join(dir, "chapters.json");
    try {
      await fs.access(metaPath);
      await fs.access(chaptersPath);
    } catch {
      continue;
    }
    const meta = JSON.parse(await fs.readFile(metaPath, "utf8")) as BookMeta;
    out.push({ slug, ...meta });
  }
  return out;
}

export async function loadBook(
  slug: string,
): Promise<{ meta: BookMeta; persona: string; chapters: Chapter[] } | null> {
  const dir = path.join(ROOT, slug);
  try {
    const meta = JSON.parse(await fs.readFile(path.join(dir, "meta.json"), "utf8")) as BookMeta;
    const chapters = JSON.parse(await fs.readFile(path.join(dir, "chapters.json"), "utf8")) as Chapter[];
    let persona = "";
    try {
      persona = await fs.readFile(path.join(dir, "persona.md"), "utf8");
    } catch {}
    return { meta, persona, chapters };
  } catch {
    return null;
  }
}

export function lightChapters(chapters: Chapter[]): LightChapter[] {
  return chapters.map((c) => ({
    title: c.title,
    summary: c.summary ?? "",
    key_claims: c.key_claims ?? [],
    glossary: c.glossary ?? [],
    opener: c.opener ?? "",
  }));
}
