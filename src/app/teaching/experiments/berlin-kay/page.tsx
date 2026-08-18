import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "Mapping Your Colour Words — Nat Hansen",
  description:
    "A classroom version of Berlin & Kay (1969): mark the extension and the best example of each basic colour word of your language on the 330-chip World Color Survey Munsell array, and compare focal choices across the languages in the room.",
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
