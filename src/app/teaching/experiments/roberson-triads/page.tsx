import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "Which Two Look Most Alike? — Nat Hansen",
  description:
    "A classroom replication of Roberson, Davies & Davidoff (2000), Experiment 4: triad similarity judgments across the English green–blue boundary and the Berinmo nol–wor boundary — the double-dissociation test of whether color categories are universal.",
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
