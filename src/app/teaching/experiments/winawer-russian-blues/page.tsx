import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "Russian Blues — Nat Hansen",
  description:
    "A classroom replication of Winawer et al. (2007): a speeded colour-matching task across the Russian siniy/goluboy border, with verbal and spatial interference, measuring whether the words you have change how fast you tell two blues apart.",
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
