import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Short join link for the Warsaw workshop run of the concept-breadth
      // experiment (Sept 2026) — easy to say aloud from a lectern.
      {
        source: "/warsaw",
        destination: "/teaching/experiments/concept-breadth?session=warsaw-2026",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
