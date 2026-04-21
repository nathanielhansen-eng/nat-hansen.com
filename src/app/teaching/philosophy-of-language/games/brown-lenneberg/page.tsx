import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "Brown & Lenneberg Replication — Nat Hansen",
  description:
    "A classroom replication of Brown & Lenneberg's 1954 experiment on language and memory for colour.",
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
