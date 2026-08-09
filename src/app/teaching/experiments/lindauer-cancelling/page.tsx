import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "How to Cancel the Knobe Effect — Nat Hansen",
  description:
    "A classroom replication of Lindauer & Southwood's (2021) study: the Knobe-effect asymmetry disappears once people can deny intentional harm while still strongly condemning the chairman.",
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
  // other experiments' launch links, but only study 1 exists.
  const study = 1 as const;
  const tag = (sp.tag && sp.tag.trim()) || null;
  return <Experiment session={session} study={study} tag={tag} />;
}
