import type { Metadata } from "next";
import Experiment from "./Experiment";

export const metadata: Metadata = {
  title: "Distributive Justice Experiment — Nat Hansen",
  description:
    "A playable solo version of Frohlich, Oppenheimer & Eavey's (1987) experimental test of Rawlsian distributive justice, with four simulated co-participants.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Experiment />;
}
