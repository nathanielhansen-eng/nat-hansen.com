import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import Link from "next/link";
import type { Metadata } from "next";

interface ScheduleItem {
  time: string;
  title: string;
  speaker?: string;
}

interface Speaker {
  name: string;
  affiliation: string;
  title?: string;
}

interface EventData {
  title: string;
  date: string;
  venue: string;
  location: string;
  organizer: string;
  logo: string;
  description: string;
  schedule: ScheduleItem[];
  speakers: Speaker[];
  practicalInfo: string;
  contact: string;
  showSchedule: boolean;
  registrationOpen: boolean;
  registrationLink: string;
}

function getEventContent() {
  const filePath = path.join(process.cwd(), "content", "aesthetic-judgment.md");
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data } = matter(raw);
  return data as EventData;
}

export async function generateMetadata(): Promise<Metadata> {
  const event = getEventContent();
  return {
    title: `${event.title} — Nat Hansen`,
    description: event.description,
  };
}

function md(text: string): string {
  return marked.parseInline(text) as string;
}

export default function AestheticJudgmentWorkshop() {
  const event = getEventContent();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Header */}
      <header className="relative overflow-hidden bg-gradient-to-b from-red-600 via-orange-500 to-amber-400 text-[#c8e6a0]">
        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-8 sm:py-12">
          <Link
            href="/"
            className="text-[#c8e6a0]/70 text-sm hover:text-[#c8e6a0] transition-colors mb-6 inline-block"
          >
            &larr; nat-hansen.com
          </Link>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-mono tracking-wider leading-[1.1] mb-6 uppercase">
            <span className="block">Aesthetic</span>
            <span className="block">Judgment,</span>
            <span className="block">Criticism,</span>
            <span className="block">&amp; Conversation</span>
          </h1>

          <div>
            <p className="font-mono text-xl sm:text-2xl font-bold">{event.date}</p>
            <p className="font-mono text-xl sm:text-2xl font-bold">{event.venue}</p>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-6 py-12 flex-1">
        {/* Description */}
        <section className="mb-12">
          <p
            className="text-stone-600 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: md(event.description) }}
          />
        </section>

        {/* Registration */}
        {event.registrationOpen && event.registrationLink && (
          <section className="mb-12">
            <a
              href={event.registrationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-stone-800 text-stone-100 px-6 py-3 rounded-lg text-sm hover:bg-stone-700 transition-colors"
            >
              Register &rarr;
            </a>
          </section>
        )}

        {/* Speakers */}
        {event.speakers.length > 0 && (
          <section className="mb-12">
            <h2 className="text-sm text-stone-500 mb-4 uppercase tracking-wider">
              Speakers
            </h2>
            <div className="space-y-3">
              {event.speakers.map((speaker) => (
                <div
                  key={speaker.name}
                  className="border border-stone-300 rounded-lg p-4"
                >
                  <p className="text-stone-800 text-sm font-medium">
                    {speaker.name}
                  </p>
                  <p className="text-stone-500 text-xs mt-1">
                    {speaker.affiliation}
                  </p>
                  {speaker.title && (
                    <p
                      className="text-stone-600 text-sm mt-2"
                      dangerouslySetInnerHTML={{
                        __html: `&ldquo;${md(speaker.title)}&rdquo;`,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-stone-500 text-sm mt-6">
              Organized by{" "}
              <a
                href="https://www.nat-hansen.com"
                className="text-stone-600 hover:text-stone-900 underline underline-offset-2 transition-colors"
              >
                {event.organizer}
              </a>
            </p>
          </section>
        )}

        {/* Schedule — set showSchedule: true in the content file to display */}
        {event.showSchedule && <section className="mb-12">
          <h2 className="text-sm text-stone-500 mb-4 uppercase tracking-wider">
            Schedule
          </h2>
          <div className="space-y-1">
            {event.schedule.map((item, i) => {
              const isBreak = !item.speaker;
              return (
                <div
                  key={i}
                  className={`flex gap-4 py-2 ${
                    isBreak
                      ? "text-stone-400 text-xs"
                      : "border-b border-stone-200"
                  }`}
                >
                  <span className="text-stone-400 text-xs w-12 flex-shrink-0 pt-0.5">
                    {item.time}
                  </span>
                  <div>
                    <p
                      className={
                        isBreak
                          ? "text-stone-400 text-xs"
                          : "text-stone-700 text-sm"
                      }
                    >
                      {item.title}
                    </p>
                    {item.speaker && (
                      <p className="text-stone-500 text-xs">{item.speaker}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>}

        {/* Practical Info */}
        <section className="mb-12">
          <h2 className="text-sm text-stone-500 mb-4 uppercase tracking-wider">
            Practical Information
          </h2>
          <p
            className="text-stone-600 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: md(event.practicalInfo) }}
          />
        </section>

        {/* Contact */}
        <section className="mb-12">
          <h2 className="text-sm text-stone-500 mb-4 uppercase tracking-wider">
            Contact
          </h2>
          <p className="text-sm">
            <a
              href={`mailto:${event.contact}`}
              className="text-stone-500 hover:text-stone-900 underline underline-offset-2 transition-colors"
            >
              {event.contact}
            </a>
          </p>
        </section>
      </main>

      {/* Footer */}
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
