import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools — Nat Hansen",
  description: "Interactive writing tools",
};

const tools = [
  {
    slug: "private/orwell-workshop",
    title: "Orwell Workshop",
    blurb:
      "Paste any prose — an essay, a chapter, an email — and walk through it paragraph by paragraph. For each paragraph the tool suggests concrete edits drawn from the five rules George Orwell sets out in “Politics and the English Language” (1946); accept, edit, or skip each one, then download the revised text as Markdown.",
    note: "Password required.",
  },
  {
    slug: "minitrue",
    title: "Ministry of Truth — Document Compliance Office",
    blurb:
      "Submit any document to the Ministry of Truth for thoughtcrime screening. Suspect passages are excised, the text is rewritten in approved Newspeak per the Eleventh Edition of the Newspeak Dictionary, and a Certified Thoughtcrime-Free version is returned for printing. A teaching companion to the Orwell Workshop — the cure and the disease.",
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="border-b border-stone-300 px-6 py-4">
        <Link
          href="/"
          className="text-stone-400 text-sm hover:text-stone-700 transition-colors"
        >
          &larr; nat-hansen.com
        </Link>
        <h1 className="text-3xl tracking-tight text-stone-900 mt-2">Tools</h1>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="space-y-4">
          {tools.map((t) => (
            <Link
              key={t.slug}
              href={`/${t.slug}`}
              className="block border border-stone-300 rounded-lg p-5 hover:border-stone-400 transition-colors"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-lg text-stone-800">{t.title}</h3>
                {t.note && (
                  <span className="text-stone-400 text-xs">{t.note}</span>
                )}
              </div>
              <p className="text-stone-600 text-sm leading-relaxed mt-2">
                {t.blurb}
              </p>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-stone-300 px-6 py-6">
        <div className="max-w-3xl mx-auto text-center text-stone-400 text-xs">
          <Link href="/" className="hover:text-stone-600 transition-colors">
            nat-hansen.com
          </Link>
        </div>
      </footer>
    </div>
  );
}
