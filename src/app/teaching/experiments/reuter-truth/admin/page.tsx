import type { Metadata } from "next";
import InstructorGate from "@/lib/xphi/InstructorGate";
import { isInstructor } from "@/lib/xphi/routes";
import AdminDashboard from "./AdminDashboard";

export const metadata: Metadata = {
  title: "Is It True? — Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const sp = await searchParams;
  if (!(await isInstructor())) {
    return <InstructorGate slug="reuter-truth" heading="Is It True? — class data" err={!!sp.err} />;
  }
  return <AdminDashboard />;
}
