import type { Metadata } from "next";
import LiveView from "./LiveView";

export const metadata: Metadata = {
  title: "Where Do the Concepts Stop? — live results",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const session = (sp.session && sp.session.trim()) || today;
  return <LiveView session={session} />;
}
