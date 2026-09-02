import type { NextConfig } from "next";

const LOCAL_API_BASE_URL = "http://127.0.0.1:8000";
const DEPLOYED_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.BACKEND_API_BASE_URL ?? "";

function cleanUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function getUrlHost(value?: string) {
  if (!value) {
    return "";
  }

  try {
    return new URL(cleanUrl(value)).host;
  } catch {
    return "";
  }
}

function isFrontendHost(value?: string) {
  const host = getUrlHost(value);
  const netlifyHost = getUrlHost(process.env.URL);
  const deployPreviewHost = getUrlHost(process.env.DEPLOY_PRIME_URL);
  const configuredSiteHost = getUrlHost(process.env.NEXT_PUBLIC_SITE_URL);

  return Boolean(
    host &&
      (host === netlifyHost ||
        host === deployPreviewHost ||
        host === configuredSiteHost ||
        host === "vvcoe-symposium.netlify.app")
  );
}

function resolveBackendBaseUrl() {
  const configuredUrl = process.env.BACKEND_API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configuredUrl && !isFrontendHost(configuredUrl)) {
    return cleanUrl(configuredUrl);
  }

  if (configuredUrl && isFrontendHost(configuredUrl)) {
    console.warn(
      "Ignoring frontend URL in API base config. Netlify /api rewrites must point to the Render backend."
    );
  }

  return process.env.NETLIFY === "true" ? DEPLOYED_API_BASE_URL : LOCAL_API_BASE_URL;
}

const backendBaseUrl = resolveBackendBaseUrl();

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope()"
  },
  {
    key: "X-XSS-Protection",
    value: "0"
  }
];

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders
      }
    ];
  },
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: `${backendBaseUrl}/media/:path*`
      }
    ];
  }
};

export default nextConfig;
