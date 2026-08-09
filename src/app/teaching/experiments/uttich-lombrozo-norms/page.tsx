import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "Norms and Intentional Action — Nat Hansen",
  description:
    "A classroom replication of Uttich & Lombrozo's (2010) test of the side-effect effect: whether calling a foreseen side effect 'intentional' tracks norm violation rather than moral badness — using both a moral and a purely conventional (colour) norm.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; study?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const session = (sp.session && sp.session.trim()) || today;
  // This study has a single design (Experiment 1, the CEO version); the
  // ?study param is parsed for launcher-URL parity with the other experiments
  // and passed through, but there is only one study here.
  const study = sp.study === "2" ? 2 : 1;
  const tag = (sp.tag && sp.tag.trim()) || null;
  return <Experiment session={session} study={study} tag={tag} />;
}
