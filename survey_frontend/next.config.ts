import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
  // Allow `npm run dev` to be opened through the Cloudflare tunnel domain.
  allowedDevOrigins: ["survey.intech.io.vn"],
};

export default nextConfig;
