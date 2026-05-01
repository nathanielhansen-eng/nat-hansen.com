import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "Measuring Conceptual Inflation — Nat Hansen",
  description:
    "A classroom replication of Hansen & Liao's study on the extension and intensity of 'racist' and related terms.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const sp = await searchParams;
  const session = (sp.session && sp.session.trim()) || "Edinburgh-Meaning-Sciences-2026";
  return <Experiment session={session} />;
}
