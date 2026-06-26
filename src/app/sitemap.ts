import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

const SITE_URL = "https://nat-hansen.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts().map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  return [
    { url: SITE_URL },
    { url: `${SITE_URL}/blog` },
    { url: `${SITE_URL}/teaching` },
    ...posts,
  ];
}
