import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Metadata } from "next";
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      marquee: DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          scrollamount?: number | string;
          scrollAmount?: number | string;
          behavior?: string;
          direction?: string;
        },
        HTMLElement
      >;
    }
  }
}

export const metadata: Metadata = {
  title: "Nat Hansen's Home Page",
};

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

function renderInline(text: string): string {
  let s = text.replace(/\\"/g, '"');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) =>
    `<a href="${href}">${label}</a>`,
  );
  s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  s = s.replace(/\*([^*]+)\*/g, "<i>$1</i>");
  return s;
}

function isNew(year: string): boolean {
  return /forthcoming/i.test(year);
}

export default function Nineties() {
  const site = getSiteContent();
  const emailLink = site.links.find((l) => l.href.startsWith("mailto"));
  const cvLink = site.links.find((l) => l.label.toLowerCase() === "cv");
  const otherLinks = site.links.filter(
    (l) => l !== emailLink && l !== cvLink,
  );

  return (
    <>
      <style>{`
        html, body { background: #ffffff !important; }
        .nineties, .nineties * {
          font-family: "Times New Roman", Times, serif;
          color: #000000;
        }
        .nineties {
          background: #ffffff;
          min-height: 100vh;
          width: 100%;
          padding: 20px 28px 48px 28px;
          margin: 0;
          max-width: 820px;
          font-size: 16px;
          line-height: 1.35;
          box-sizing: border-box;
        }
        .nineties a { color: #0000ee; text-decoration: underline; }
        .nineties a:visited { color: #551a8b; }
        .nineties a:active { color: #ff0000; }
        .nineties h1 {
          font-size: 30px;
          font-weight: bold;
          margin: 0 0 4px 0;
          text-align: center;
        }
        .nineties h2 {
          font-size: 18px;
          font-weight: bold;
          margin: 22px 0 6px 0;
          color: #000080;
        }
        .nineties hr {
          border: 0;
          border-top: 1px solid #000000;
          margin: 14px 0;
        }
        .nineties .subtitle {
          font-style: italic;
          margin: 0 0 12px 0;
          text-align: center;
        }
        .nineties .headshot {
          display: block;
          margin: 8px auto 12px auto;
          border: 2px ridge #808080;
          padding: 3px;
          background: #ffffff;
        }
        .nineties ul { margin: 4px 0 8px 0; padding-left: 28px; }
        .nineties li { margin-bottom: 4px; }
        .nineties table.pubtable {
          border-collapse: collapse;
          width: 100%;
        }
        .nineties table.pubtable td {
          vertical-align: top;
          padding: 2px 0 6px 0;
        }
        .nineties table.pubtable td.year {
          width: 110px;
          font-style: italic;
          white-space: nowrap;
          padding-right: 12px;
        }
        .nineties .new {
          color: #ff0000;
          font-weight: bold;
          font-family: Verdana, Arial, sans-serif !important;
          font-size: 11px;
          margin-right: 4px;
          animation: blinker 1.1s step-start infinite;
        }
        @keyframes blinker { 50% { opacity: 0; } }
        .nineties .marqueewrap {
          border: 1px inset #c0c0c0;
          background: #ffffe0;
          padding: 3px 0;
          margin-bottom: 10px;
        }
        .nineties marquee { color: #000080; font-weight: bold; }
        .nineties .constructiongif {
          display: inline-block;
          vertical-align: middle;
          margin-left: 8px;
          image-rendering: pixelated;
        }
        .nineties .whatsnew {
          border: 2px ridge #c0c0c0;
          background: #f8f8ff;
          padding: 6px 12px;
          margin: 12px 0;
        }
        .nineties .whatsnew h2 { margin-top: 4px; }
        .nineties .counter {
          display: inline-block;
          background: #000000;
          color: #00ff00 !important;
          font-family: "Courier New", monospace !important;
          padding: 2px 8px;
          border: 1px solid #808080;
          letter-spacing: 2px;
        }
        .nineties .badges {
          margin: 8px 0;
          font-family: Verdana, Arial, sans-serif !important;
          font-size: 11px;
        }
        .nineties .badge {
          display: inline-block;
          border: 1px outset #c0c0c0;
          background: #c0c0c0;
          color: #000000 !important;
          padding: 1px 6px;
          margin-right: 4px;
          text-decoration: none !important;
        }
        .nineties .footer {
          margin-top: 24px;
          padding-top: 8px;
          border-top: 1px solid #000000;
          font-size: 13px;
          text-align: center;
        }
        .nineties .nav { font-size: 14px; margin-bottom: 4px; text-align: center; }
        .nineties .webring {
          text-align: center;
          margin: 10px 0;
          font-size: 13px;
          font-family: Verdana, Arial, sans-serif !important;
        }
      `}</style>
      <div className="nineties">
        <div className="marqueewrap">
          {/* eslint-disable-next-line @next/next/no-element-with-marquee */}
          <marquee scrollAmount={4}>
            *** Welcome to my home page on the World Wide Web! *** Welcome
            to my home page on the World Wide Web! *** Welcome to my home
            page on the World Wide Web! ***
          </marquee>
        </div>

        <div className="nav">
          [ <a href="/">Home</a> |{" "}
          <a href="#research">Research</a> |{" "}
          <a href="#papers">Papers</a> |{" "}
          <a href="#talks">Talks</a> |{" "}
          <a href={cvLink?.href}>CV</a> |{" "}
          <a href="mailto:n.d.hansen@reading.ac.uk">Email</a> ]
        </div>
        <hr />

        <h1>Nat Hansen&apos;s Home Page</h1>
        <p className="subtitle">
          {site.title}
          <br />
          Department of Philosophy &middot; {site.institution}
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={site.photo}
          alt="Nat Hansen"
          width={160}
          height={160}
          className="headshot"
        />

        <p style={{ textAlign: "center" }}>
          <b>Email:</b>{" "}
          <a href={emailLink?.href}>{emailLink?.label}</a>
          <span style={{ margin: "0 8px" }}>&middot;</span>
          <b>Office hours:</b> by appointment
        </p>

        <div className="whatsnew">
          <h2>What&apos;s New?</h2>
          <ul>
            <li>
              <span className="new">NEW!</span> Just out in <i>Ergo</i> (2026){" "}
              with Shen-yi Liao:{" "}
              <a href="https://philpapers.org/archive/HANMCI.pdf">
                &ldquo;Measuring Conceptual Inflation: The Case of
                &lsquo;Racist&rsquo;&rdquo;
              </a>.
            </li>
            <li>
              <span className="new">NEW!</span> Upcoming talk at the{" "}
              <a href="https://www.stanleycavellat100.com/event-details/paris-cavell-conference-4-6-june-2026">
                Stanley Cavell at 100
              </a>{" "}
              conference in Paris, June 2026.
            </li>
            <li>
              Book under contract with OUP:{" "}
              <i>Must We Measure What We Mean?</i>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/under-construction.png"
                alt="under construction"
                width={54}
                height={49}
                className="constructiongif"
              />
            </li>
          </ul>
        </div>

        <hr />

        <h2 id="research">Research</h2>
        <p>
          My research lies at the intersection of ordinary language
          philosophy and experimental approaches to meaning. I also have
          interests in aesthetics, the history of analytic philosophy,
          epistemology, and philosophy of mind. I am an editor at{" "}
          <i>Mind &amp; Language</i>. Most papers below are available as
          PDFs &mdash; just click the title.
        </p>

        <h2>Book</h2>
        <table className="pubtable">
          <tbody>
            <tr>
              <td className="year">[{site.book.status}]</td>
              <td
                dangerouslySetInnerHTML={{
                  __html: renderInline(site.book.display),
                }}
              />
            </tr>
          </tbody>
        </table>

        <h2 id="papers">Papers</h2>
        <table className="pubtable">
          <tbody>
            {site.publications.map((pub, i) => (
              <tr key={i}>
                <td className="year">[{pub.year}]</td>
                <td>
                  {isNew(pub.year) && <span className="new">NEW!</span>}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: renderInline(pub.display),
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 id="talks">Upcoming Talks</h2>
        <ul>
          {site.events.map((ev) => (
            <li key={ev.title}>
              {ev.link ? <a href={ev.link}>{ev.title}</a> : ev.title}
              , {ev.venue}
              {ev.date ? `, ${ev.date}` : ""}.
            </li>
          ))}
        </ul>

        <h2>Links</h2>
        <ul>
          {otherLinks.map((l) => (
            <li key={l.href}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
          <li>
            <a href={cvLink?.href}>Curriculum Vitae (PDF)</a>
          </li>
        </ul>

        <div className="footer">
          <p>
            Last updated: 17 May 2026.
            <br />
            Maintained by Nat Hansen &lt;
            <a href="mailto:n.d.hansen@reading.ac.uk">
              n.d.hansen@reading.ac.uk
            </a>
            &gt;.
          </p>
        </div>
      </div>
    </>
  );
}
