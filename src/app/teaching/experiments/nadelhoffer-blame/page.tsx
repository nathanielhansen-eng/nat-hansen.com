import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "Bad Acts, Blameworthy Agents — Nat Hansen",
  description:
    "A classroom run of Nadelhoffer's (2006) between-subjects Smith study: whether a fleeing thief or an innocent driver did the same lethal swerve 'intentionally' — and a lesson in what a confounded design can and cannot show.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; study?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const session = (sp.session && sp.session.trim()) || today;
  // Only one study exists for this experiment; the param is accepted for parity
  // with the other classroom experiments but always resolves to Study 1.
  const study = 1 as const;
  const tag = (sp.tag && sp.tag.trim()) || null;
  return <Experiment session={session} study={study} tag={tag} />;
}
