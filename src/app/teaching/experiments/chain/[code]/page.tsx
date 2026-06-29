import type { Metadata } from "next";
import ChainPlayer from "./ChainPlayer";

export const metadata: Metadata = {
  title: "Transmission chain — Nat Hansen",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <ChainPlayer code={code.toUpperCase()} />;
}
