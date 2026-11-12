import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Covers unmatched URLs across the separate site and admin root layouts.
  experimental: { globalNotFound: true },
};

export default nextConfig;
