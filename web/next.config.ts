import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TF.js runs client-side only — keep it out of the server bundle
  serverExternalPackages: ["@tensorflow/tfjs"],

  // Empty turbopack config silences the webpack/turbopack conflict warning
  // (Next.js 16 defaults to Turbopack)
  turbopack: {},

  // Security headers for Vercel deployment
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
