import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "What Is It Like to Be Colour-Blind? — Nat Hansen",
  description:
    "A classroom experiment built on Allen, Quinlan, Andow & Fischer (2021): what do sighted people assume a red/green colour-blind person sees — and what did colour-blind participants actually report?",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; study?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const session = (sp.session && sp.session.trim()) || today;
  // Single study; the study param is parsed for parity with the other
  // experiments but always resolves to 1.
  const study = 1 as const;
  const tag = (sp.tag && sp.tag.trim()) || null;
  return <Experiment session={session} study={study} tag={tag} />;
}
