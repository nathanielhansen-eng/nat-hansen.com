import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts, formatDate } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Nat Hansen",
  description:
    "Essays, notes, and book reviews by Nat Hansen — philosophy of language, experimental philosophy, ordinary language philosophy.",
  openGraph: {
    title: "Blog — Nat Hansen",
    description: "Essays, notes, and book reviews by Nat Hansen.",
    type: "website",
    url: "/blog",
  },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-300 px-6 py-4">
        <Link href="/" className="text-xl tracking-wide text-stone-900 hover:text-stone-600 transition-colors">
          nat hansen
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
        <h2 className="text-2xl tracking-tight text-stone-900 mb-1">Blog</h2>
        <p className="text-stone-500 text-sm mb-12">
          Essays, notes, and book reviews.
        </p>

        {posts.length === 0 ? (
          <p className="text-stone-500 text-sm">Nothing published yet.</p>
        ) : (
          <ul className="space-y-8">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">
                    {formatDate(post.date)}
                    {post.draft && (
                      <span className="ml-2 text-amber-600">· draft</span>
                    )}
                  </p>
                  <h3 className="text-lg text-stone-900 group-hover:text-stone-600 underline underline-offset-2 decoration-stone-300 group-hover:decoration-stone-500 transition-colors">
                    {post.title}
                  </h3>
                  {post.book && (
                    <p className="text-stone-500 text-xs mt-1 italic">
                      Review of {post.book.title}
                      {post.book.author && ` — ${post.book.author}`}
                    </p>
                  )}
                  {post.summary && (
                    <p className="text-stone-600 text-sm mt-2 leading-relaxed">
                      {post.summary}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-300 px-6 py-6">
        <div className="max-w-3xl mx-auto text-center text-stone-400 text-xs">
          Nat Hansen &middot; University of Reading &middot; Department of Philosophy
        </div>
      </footer>
    </div>
  );
}
