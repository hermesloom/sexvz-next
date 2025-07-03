import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL("https://sexvz.net/**")],
  },
};

export default nextConfig;
