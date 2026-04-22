import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "Heider — Focal Colours & Memory — Nat Hansen",
  description:
    "A classroom replication of Eleanor Rosch Heider's 1972 experiments on focal colours, codability, and recognition memory.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const session = (sp.session && sp.session.trim()) || today;
  return <Experiment session={session} />;
}
