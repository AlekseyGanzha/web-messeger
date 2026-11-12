import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(process.env.NEXT_STATIC_EXPORT === "1"
    ? { output: "export" as const, trailingSlash: true }
    : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
