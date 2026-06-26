import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

/** Optional book metadata for reviews (e.g. imported Goodreads reviews). */
export interface BookMeta {
  title: string;
  author?: string;
  /** 1–5, optional. */
  rating?: number;
}

export interface PostFrontmatter {
  title: string;
  /** ISO date string, e.g. "2024-05-01". */
  date: string;
  summary?: string;
  tags?: string[];
  /** Path to a custom hero/OG image under /public. Falls back to a generated card. */
  image?: string;
  /** Set true to keep a post in the repo without publishing it. */
  draft?: boolean;
  book?: BookMeta;
}

export interface Post extends PostFrontmatter {
  slug: string;
  /** Raw markdown body (not yet rendered to HTML). */
  body: string;
}

/** YAML parses an unquoted `date: 2026-06-26` into a Date; normalize to "YYYY-MM-DD". */
function normalizeDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "");
}

function readPost(fileName: string): Post {
  const slug = fileName.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(BLOG_DIR, fileName), "utf-8");
  const { data, content } = matter(raw);
  const fm = data as PostFrontmatter;
  return {
    ...fm,
    date: normalizeDate(fm.date),
    slug,
    body: content.trim(),
  };
}

/** All published posts, newest first. Drafts are excluded in production. */
export function getAllPosts(): Post[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const showDrafts = process.env.NODE_ENV !== "production";
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map(readPost)
    .filter((p) => showDrafts || !p.draft)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): Post | null {
  const file = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return readPost(`${slug}.md`);
}

/** Format an ISO date as e.g. "May 1, 2024". */
export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
