import { redirect } from "next/navigation";
import { getId } from "@/lib/turing/identity";
import { loadSession } from "@/lib/turing/session";
import JudgeClient from "./JudgeClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Turing Test — Judge" };

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const id = await getId(code, "judge");
  if (!id) redirect("/turing");
  const s = await loadSession(code);
  if (!s) redirect("/turing");
  return <JudgeClient code={code} />;
}
