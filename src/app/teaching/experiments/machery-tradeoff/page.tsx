import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "The Trade-Off Hypothesis — Nat Hansen",
  description:
    "A classroom replication of Machery's (2008) smoothie study: whether people call a foreseen side effect 'intentional' turns on whether it reads as a cost or a bonus — even with no moral content.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; study?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const session = (sp.session && sp.session.trim()) || today;
  // Machery's flagship is a single two-arm study; the study param is parsed for
  // parity with the other experiments but always resolves to 1.
  const study = 1 as const;
  const tag = (sp.tag && sp.tag.trim()) || null;
  return <Experiment session={session} study={study} tag={tag} />;
}
