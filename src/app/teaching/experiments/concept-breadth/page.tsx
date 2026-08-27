import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "How far do concepts extend? — a two-part concept-breadth experiment",
  description:
    "Respond to two of the instruments Haslam's team uses to measure concept creep: the depression severity scale (Tse & Haslam 2023) and the trauma subscale of the Harm Concept Breadth Scale (McGrath & Haslam 2020).",
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
