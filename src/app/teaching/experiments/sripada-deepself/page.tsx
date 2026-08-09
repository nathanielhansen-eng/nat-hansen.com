import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "The Deep Self and Intentional Action — Nat Hansen",
  description:
    "A classroom replication of Sripada's (2010) Deep Self Concordance study: whether people call a foreseen outcome 'intentional' turns on whether it fits the agent's settled values, not on whether it is good or bad.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; study?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const session = (sp.session && sp.session.trim()) || today;
  // Single-study design (two-arm Rifle vs. Policeman). ?study is parsed for
  // parity with the other cold experiments but there is only one study here.
  const study = 1 as const;
  const tag = (sp.tag && sp.tag.trim()) || null;
  return <Experiment session={session} study={study} tag={tag} />;
}
