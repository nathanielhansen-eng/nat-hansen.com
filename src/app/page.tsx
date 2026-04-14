import Image from "next/image";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

/** Parse inline markdown (bold, italic, links) — no wrapping <p> tags. */
function md(text: string): string {
  return marked.parseInline(text) as string;
}

interface SiteLink {
  label: string;
  href: string;
}

interface SiteEvent {
  title: string;
  venue: string;
  date?: string;
  link?: string;
}

interface Publication {
  year: string;
  display: string;
}

interface SiteData {
  name: string;
  title: string;
  institution: string;
  photo: string;
  links: SiteLink[];
  events: SiteEvent[];
  book: {
    status: string;
    display: string;
  };
  publications: Publication[];
}

function getSiteContent() {
  const filePath = path.join(process.cwd(), "content", "site.md");
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    ...(data as SiteData),
    bio: content.trim(),
  };
}

export default function Home() {
  const site = getSiteContent();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-300 px-6 py-4">
        <h1 className="text-xl tracking-wide text-stone-900">nat hansen</h1>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 flex-1">
        {/* Hero */}
        <section className="flex flex-col sm:flex-row gap-8 mb-16">
          <div className="sm:w-56 flex-shrink-0">
            <Image
              src={site.photo}
              alt={site.name}
              width={450}
              height={450}
              className="rounded-lg w-56 aspect-square object-cover object-[40%_center]"
              priority
            />
            <p className="text-stone-400 text-[10px] mt-1">
              Photo by{" "}
              <a
                href="https://photos.justinkhoo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-stone-600 transition-colors"
              >
                Justin Khoo
              </a>
            </p>
          </div>
          <div>
            <h2 className="text-2xl tracking-tight text-stone-900 mb-1">
              {site.name}
            </h2>
            <p className="text-stone-500 text-sm mb-4">
              {site.title}
              <br />
              {site.institution}
            </p>
            <p
              className="text-stone-600 text-sm leading-relaxed mb-4"
              dangerouslySetInnerHTML={{ __html: md(site.bio) }}
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {site.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={
                    link.href.startsWith("mailto") ? undefined : "_blank"
                  }
                  rel="noopener noreferrer"
                  className="text-sm text-stone-500 hover:text-stone-900 underline underline-offset-2 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="mb-16">
          <h3 className="text-sm text-stone-500 mb-4 uppercase tracking-wider">
            Upcoming Events
          </h3>
          <div className="space-y-3">
            {site.events.map((event) => (
              <div
                key={event.title}
                className="border border-stone-300 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-stone-800 text-sm">{event.title}</p>
                    <p className="text-stone-500 text-xs mt-1">
                      {event.venue}
                      {event.date && (
                        <>
                          <span className="text-stone-300 mx-2">&middot;</span>
                          <span>{event.date}</span>
                        </>
                      )}
                    </p>
                  </div>
                  {event.link && (
                    <a
                      href={event.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-stone-400 hover:text-stone-700 underline underline-offset-2 transition-colors flex-shrink-0"
                    >
                      details &rarr;
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Publications */}
        <section className="mb-16">
          <h3 className="text-sm text-stone-500 mb-6 uppercase tracking-wider">
            Recent &amp; Forthcoming Publications
          </h3>

          {/* Book */}
          <div className="mb-8">
            <h4 className="text-xs text-stone-400 uppercase tracking-wider mb-3">
              Book
            </h4>
            <div
              className="text-sm text-stone-700 [&_em]:text-stone-700"
              dangerouslySetInnerHTML={{
                __html: `<span class="text-stone-400 text-xs mr-3">${site.book.status}</span>${md(site.book.display)}`,
              }}
            />
          </div>

          {/* Articles & Chapters */}
          <div>
            <h4 className="text-xs text-stone-400 uppercase tracking-wider mb-3">
              Articles &amp; Chapters
            </h4>
            <div className="space-y-3">
              {site.publications.map((pub) => (
                <div
                  key={pub.year + pub.display.slice(0, 40)}
                  className="text-sm text-stone-500 [&_a]:text-stone-700 [&_a:hover]:text-stone-900 [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition-colors"
                  dangerouslySetInnerHTML={{
                    __html: `<span class="text-stone-400 text-xs mr-3">${pub.year}</span>${md(pub.display)}`,
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-300 px-6 py-6">
        <div className="max-w-3xl mx-auto text-center text-stone-400 text-xs">
          {site.name} &middot; {site.institution} &middot; Department of
          Philosophy
        </div>
      </footer>
    </div>
  );
}
