import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Experiment admin dashboards may be framed only by ux-phi's class
        // page (the Experiments tab embeds them, locked to one class by a
        // signed link) and by the ux-phi dev server for design previews.
        // Everything else on the site keeps the browser default.
        source: "/teaching/:path*/admin",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://ux-phi.com https://www.ux-phi.com http://localhost:3000",
          },
        ],
      },
    ];
  },
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
