import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "The Side-Effect Effect — Nat Hansen",
  description:
    "A classroom replication of Knobe's (2003) side-effect effect: whether people call a foreseen side effect 'intentional' turns on whether they think it was bad.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; study?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const session = (sp.session && sp.session.trim()) || today;
  const study = sp.study === "2" ? 2 : 1;
  const tag = (sp.tag && sp.tag.trim()) || null;
  return <Experiment session={session} study={study} tag={tag} />;
}
