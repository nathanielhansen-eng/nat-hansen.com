import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "Four words, four questions — a classroom survey",
  description: "A short anonymous classroom survey on how four words strike you.",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const session = (sp.session && sp.session.trim()) || today;
  const tag = (sp.tag && sp.tag.trim()) || null;
  return <Experiment session={session} tag={tag} />;
}
