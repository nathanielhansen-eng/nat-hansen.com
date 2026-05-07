import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "Unbelieving the Unbelievable — Nat Hansen",
  description:
    "A classroom replication of Gilbert, Krull & Malone's Study 1 (1990) on whether comprehension already carries belief.",
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
