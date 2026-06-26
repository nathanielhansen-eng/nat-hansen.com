import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { marked } from "marked";
import { getAllPosts, getPost, formatDate } from "@/lib/blog";
import ShareButtons from "./ShareButtons";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const url = `/blog/${slug}`;
  const description =
    post.summary ??
    (post.book ? `A review of ${post.book.title}.` : undefined);

  return {
    title: `${post.title} — Nat Hansen`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url,
      publishedTime: post.date,
      authors: ["Nat Hansen"],
      // If a custom image is set we use it; otherwise the sibling
      // opengraph-image.tsx auto-generates one from the title.
      ...(post.image ? { images: [{ url: post.image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      ...(post.image ? { images: [post.image] } : {}),
    },
    alternates: { canonical: url },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const html = marked.parse(post.body) as string;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-300 px-6 py-4">
        <Link href="/" className="text-xl tracking-wide text-stone-900 hover:text-stone-600 transition-colors">
          nat hansen
        </Link>
      </header>

      <article className="max-w-2xl mx-auto px-6 py-12 flex-1 w-full">
        <Link
          href="/blog"
          className="text-stone-400 hover:text-stone-700 text-xs uppercase tracking-wider transition-colors"
        >
          &larr; Blog
        </Link>

        <header className="mt-6 mb-10">
          <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">
            {formatDate(post.date)}
          </p>
          <h1 className="text-3xl tracking-tight text-stone-900 leading-tight">
            {post.title}
          </h1>
          {post.book && (
            <p className="text-stone-500 text-sm mt-3 italic">
              {post.book.title}
              {post.book.author && ` — ${post.book.author}`}
              {post.book.rating != null && (
                <span className="ml-2 not-italic text-amber-600">
                  {"★".repeat(post.book.rating)}
                  <span className="text-stone-300">
                    {"★".repeat(Math.max(0, 5 - post.book.rating))}
                  </span>
                </span>
              )}
            </p>
          )}
        </header>

        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-stone-500 border border-stone-300 rounded-full px-3 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <ShareButtons title={post.title} slug={post.slug} />
      </article>

      {/* Footer */}
      <footer className="border-t border-stone-300 px-6 py-6">
        <div className="max-w-3xl mx-auto text-center text-stone-400 text-xs">
          Nat Hansen &middot; University of Reading &middot; Department of Philosophy
        </div>
      </footer>
    </div>
  );
}
