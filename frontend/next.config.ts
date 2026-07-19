import type { NextConfig } from "next";

const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendBaseUrl}/api/:path*/`
      },
      {
        source: "/media/:path*",
        destination: `${backendBaseUrl}/media/:path*`
      }
    ];
  }
};

export default nextConfig;
