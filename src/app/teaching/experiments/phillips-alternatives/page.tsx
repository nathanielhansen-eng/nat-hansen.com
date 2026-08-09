import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "The Relevance of Alternative Possibilities — Nat Hansen",
  description:
    "A classroom replication of Phillips, Luguri & Knobe's (2015) Study 4a: morality shifts whether a foreseen side effect is called 'intentional' by changing which alternative possibilities seem relevant.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; study?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const session = (sp.session && sp.session.trim()) || today;
  // Single-study design. The ?study parameter is accepted for parity with the
  // other experiments' launch links, but only study 1 (Phillips et al. Study 4a)
  // exists.
  const study = 1 as const;
  const tag = (sp.tag && sp.tag.trim()) || null;
  return <Experiment session={session} study={study} tag={tag} />;
}
