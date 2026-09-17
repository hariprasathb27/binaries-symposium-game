import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["node:sqlite", "firebase-admin"],
  images: {
    domains: [
      "upload.wikimedia.org",
      "images.unsplash.com",
      "raw.githubusercontent.com"
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
