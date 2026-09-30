import type { Metadata } from "next";
import Atlas from "./Atlas";

export const metadata: Metadata = {
  title: "World Color Survey Atlas — Nat Hansen",
  description:
    "How speakers of 130 languages named the 330 Munsell chips of the World Color Survey and Berlin & Kay (1969), with your own chart from the classroom experiment beside them.",
};

export default function Page() {
  return <Atlas />;
}
