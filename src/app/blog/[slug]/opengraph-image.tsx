import { ImageResponse } from "next/og";
import { getAllPosts, getPost } from "@/lib/blog";

export const alt = "Nat Hansen — blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  const title = post?.title ?? "Nat Hansen";
  const subtitle = post?.book
    ? `Review · ${post.book.title}${post.book.author ? ` — ${post.book.author}` : ""}`
    : "nat-hansen.com";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f5f5f4",
          color: "#1c1917",
          padding: "80px",
          fontFamily: "monospace",
        }}
      >
        <div style={{ fontSize: 28, color: "#78716c", letterSpacing: 2 }}>
          nat hansen
        </div>
        <div
          style={{
            fontSize: 64,
            lineHeight: 1.1,
            fontWeight: 600,
            maxWidth: "90%",
            display: "flex",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 28, color: "#78716c" }}>{subtitle}</div>
      </div>
    ),
    { ...size },
  );
}
