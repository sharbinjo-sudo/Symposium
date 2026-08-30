import { NextRequest, NextResponse } from "next/server";

const LOCAL_API_BASE_URL = "http://127.0.0.1:8000";
const DEPLOYED_API_BASE_URL = "https://symposium-k9ox.onrender.com";
const DEPLOYED_FALLBACK_API_BASE_URL = "https://symposium-a4uq.onrender.com";
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);
const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

type ApiRouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

function cleanUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function uniqueValues(values: string[]) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

function resolveBackendBaseUrls() {
  const primary =
    process.env.BACKEND_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    (process.env.NETLIFY === "true" ? DEPLOYED_API_BASE_URL : LOCAL_API_BASE_URL);
  const fallback =
    process.env.BACKEND_API_FALLBACK_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_FALLBACK_API_BASE_URL?.trim() ||
    (process.env.NETLIFY === "true" ? DEPLOYED_FALLBACK_API_BASE_URL : "");

  return uniqueValues([cleanUrl(primary), cleanUrl(fallback)]);
}

function createProxyHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);

  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header));
  headers.delete("host");
  return headers;
}

function copyResponseHeaders(response: Response) {
  const headers = new Headers();

  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  return headers;
}

async function proxyRequest(request: NextRequest, context: ApiRouteContext) {
  const { path = [] } = await context.params;
  const backendBaseUrls = resolveBackendBaseUrls();
  const apiPath = `/api/${path.join("/")}`;
  const requestBody = METHODS_WITHOUT_BODY.has(request.method) ? undefined : await request.arrayBuffer();
  let lastError: unknown = null;

  for (const [index, backendBaseUrl] of backendBaseUrls.entries()) {
    const backendUrl = `${backendBaseUrl}${apiPath}${request.nextUrl.search}`;

    try {
      const response = await fetch(backendUrl, {
        method: request.method,
        headers: createProxyHeaders(request),
        body: requestBody,
        cache: "no-store",
        redirect: "manual"
      });

      if (RETRYABLE_STATUS_CODES.has(response.status) && index < backendBaseUrls.length - 1) {
        continue;
      }

      const responseHeaders = copyResponseHeaders(response);
      responseHeaders.set("x-cp26-api-backend", index === 0 ? "primary" : "fallback");

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (error) {
      lastError = error;
      if (index < backendBaseUrls.length - 1) {
        continue;
      }
    }
  }

  console.error("All backend API targets failed.", lastError);
  return NextResponse.json(
    { detail: "The registration service is temporarily unavailable. Please try again in a moment." },
    { status: 503 }
  );
}

export const dynamic = "force-dynamic";

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
