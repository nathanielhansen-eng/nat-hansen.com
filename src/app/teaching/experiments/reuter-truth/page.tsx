import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "Is It True? — a three-part classroom experiment",
  description:
    "A classroom replication of Reuter & Brun's studies on whether 'true' is ambiguous between correspondence and coherence.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const session = (sp.session && sp.session.trim()) || today;
  const tag = (sp.tag && sp.tag.trim()) || null;
  return <Experiment session={session} tag={tag} />;
}
