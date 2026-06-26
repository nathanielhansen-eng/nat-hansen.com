"use client";

import { useState } from "react";

const SITE_URL = "https://nat-hansen.com";

export default function ShareButtons({
  title,
  slug,
}: {
  title: string;
  slug: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}/blog/${slug}`;
  const text = `${title} — ${url}`;
  const enc = encodeURIComponent;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS) — fail quietly.
    }
  }

  const linkClass =
    "text-stone-500 hover:text-stone-900 underline underline-offset-2 transition-colors";

  return (
    <div className="mt-12 pt-6 border-t border-stone-200">
      <p className="text-xs text-stone-400 uppercase tracking-wider mb-3">
        Share
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <a
          className={linkClass}
          href={`https://bsky.app/intent/compose?text=${enc(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Bluesky
        </a>
        <a
          className={linkClass}
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
        <button type="button" onClick={copy} className={linkClass}>
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
