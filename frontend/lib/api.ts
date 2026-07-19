import { siteConfig } from "@/lib/config/site";
import type {
  AdminRegistrationRow,
  DashboardSummary,
  EventConfig,
  RegistrationPaymentOrder,
  RegistrationPaymentOrderPayload,
  RegistrationPayload,
  RegistrationResponse
} from "@/lib/types";

const DEFAULT_API_BASE = "http://127.0.0.1:8000";
const EXPLICIT_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const FALLBACK_EVENTS = siteConfig.technicalEvents;
const ACCENT_ROTATION: EventConfig["accent"][] = ["blue-violet", "cyan-blue", "violet-teal", "teal-blue"];
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type CsrfResponse = {
  csrfToken: string;
};

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

function fallbackId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cp26-${Date.now()}`;
}

function resolveApiBase() {
  if (EXPLICIT_API_BASE) {
    return EXPLICIT_API_BASE.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return "";
  }

  return DEFAULT_API_BASE;
}

function createApiUrl(path: string) {
  return `${resolveApiBase()}${path}`;
}

function isUnsafeMethod(method?: string) {
  return UNSAFE_METHODS.has((method ?? "GET").toUpperCase());
}

async function ensureCsrfToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && csrfTokenCache) {
    return csrfTokenCache;
  }

  if (!forceRefresh && csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = fetch(createApiUrl("/api/security/csrf"), {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`CSRF bootstrap failed with status ${response.status}`);
      }

      const payload = (await response.json()) as CsrfResponse;
      csrfTokenCache = payload.csrfToken;
      return payload.csrfToken;
    })
    .finally(() => {
      csrfTokenPromise = null;
    });

  return csrfTokenPromise;
}

async function performRequest(path: string, init?: RequestInit, forceFreshCsrf = false) {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers ?? {});

  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (isUnsafeMethod(method)) {
    headers.set("X-CSRFToken", await ensureCsrfToken(forceFreshCsrf));
  }

  return fetch(createApiUrl(path), {
    ...init,
    method,
    cache: "no-store",
    headers,
    credentials: "include"
  });
}

function formatErrorFieldLabel(path: string) {
  const readable = path
    .replace(/\.(\d+)\./g, " $1 ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._]/g, " ")
    .trim();

  if (!readable) {
    return "";
  }

  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

function collectApiErrors(
  value: unknown,
  path = "",
  fieldErrors: Record<string, string> = {},
  messages: string[] = []
) {
  if (typeof value === "string") {
    if (path && !fieldErrors[path]) {
      fieldErrors[path] = value;
    }

    if (path && path !== "detail") {
      messages.push(`${formatErrorFieldLabel(path)}: ${value}`);
      return { fieldErrors, messages };
    }

    messages.push(value);
    return { fieldErrors, messages };
  }

  if (Array.isArray(value)) {
    if (value.every((entry) => typeof entry === "string")) {
      const message = value.join(" ");

      if (path && !fieldErrors[path]) {
        fieldErrors[path] = message;
      }

      if (path && path !== "detail") {
        messages.push(`${formatErrorFieldLabel(path)}: ${message}`);
      } else if (message) {
        messages.push(message);
      }

      return { fieldErrors, messages };
    }

    value.forEach((entry, index) => {
      const nextPath = path ? `${path}.${index}` : `${index}`;
      collectApiErrors(entry, nextPath, fieldErrors, messages);
    });
    return { fieldErrors, messages };
  }

  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      const nextPath = key === "detail" ? "detail" : path ? `${path}.${key}` : key;
      collectApiErrors(entry, nextPath, fieldErrors, messages);
    });
  }

  return { fieldErrors, messages };
}

async function createApiError(response: Response, fallbackMessage: string) {
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const { fieldErrors, messages } = collectApiErrors(payload);
  const message = messages.find(Boolean) ?? fallbackMessage;

  return new ApiError(message, response.status, fieldErrors);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response = await performRequest(path, init);

  if (response.status === 403 && isUnsafeMethod(init?.method)) {
    response = await performRequest(path, init, true);
  }

  if (!response.ok) {
    throw await createApiError(response, `Request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

function normalizeFeeAmount(value: EventConfig["feeAmount"] | `${number}` | string | number | undefined, fallback: number) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function mergeTechnicalEvents(events: Partial<EventConfig>[]) {
  const incomingByCode = new Map(events.map((event) => [event.code, event]));

  const configuredEvents = FALLBACK_EVENTS.map((fallbackEvent) => {
    const incoming = incomingByCode.get(fallbackEvent.code);

    if (!incoming) {
      return {
        ...fallbackEvent,
        registrationOpen: false
      };
    }

    return {
      ...fallbackEvent,
      ...incoming,
      order: fallbackEvent.order,
      track: fallbackEvent.track,
      summary: fallbackEvent.summary,
      description: fallbackEvent.description,
      accent: fallbackEvent.accent,
      visualTitle: fallbackEvent.visualTitle,
      visualTags: fallbackEvent.visualTags,
      prizes: fallbackEvent.prizes,
      rules: fallbackEvent.rules,
      importantNotes: fallbackEvent.importantNotes,
      feeAmount: normalizeFeeAmount(incoming.feeAmount, fallbackEvent.feeAmount),
      registrationOpen: incoming.registrationOpen ?? fallbackEvent.registrationOpen
    } satisfies EventConfig;
  });

  const extraEvents = events
    .filter((event) => event.code && !FALLBACK_EVENTS.some((fallbackEvent) => fallbackEvent.code === event.code))
    .map((event, index) => {
      const eventCode = event.code ?? `EXT-${index + 1}`;
      const eventName = event.name ?? eventCode;
      return {
        order: configuredEvents.length + index + 1,
        code: eventCode,
        name: eventName,
        track: "Technical",
        summary: event.summary ?? `${eventName} registration details.`,
        description: event.description ?? `Registration flow for ${eventName}.`,
        visualTitle: `${eventName} spotlight`,
        accent: ACCENT_ROTATION[index % ACCENT_ROTATION.length],
        visualTags: [],
        minTeamSize: event.minTeamSize ?? 1,
        maxTeamSize: event.maxTeamSize ?? 1,
        feeType: event.feeType ?? "per_participant",
        feeAmount: normalizeFeeAmount(event.feeAmount, 250),
        prizes: event.prizes ?? [],
        rules: event.rules ?? [],
        importantNotes: event.importantNotes ?? [],
        registrationOpen: event.registrationOpen ?? false
      } satisfies EventConfig;
    });

  return [...configuredEvents, ...extraEvents];
}

export async function getEvents(): Promise<EventConfig[]> {
  try {
    const events = await requestJson<Partial<EventConfig>[]>("/api/events");
    return mergeTechnicalEvents(events);
  } catch {
    return FALLBACK_EVENTS;
  }
}

export async function submitRegistration(payload: RegistrationPayload): Promise<RegistrationResponse> {
  return requestJson<RegistrationResponse>("/api/registrations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function createRegistrationPaymentOrder(
  payload: RegistrationPaymentOrderPayload
): Promise<RegistrationPaymentOrder> {
  return requestJson<RegistrationPaymentOrder>("/api/registrations/payment-order", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function uploadScreenshot(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  let response = await performRequest("/api/uploads/screenshot", {
    method: "POST",
    body: formData
  });

  if (response.status === 403) {
    response = await performRequest("/api/uploads/screenshot", {
      method: "POST",
      body: formData
    }, true);
  }

  if (!response.ok) {
    throw await createApiError(response, `Upload failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as { uploadToken: string };
  return payload.uploadToken;
}

export async function adminLogin(email: string, password: string) {
  return requestJson<{ ok: boolean }>("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function getAdminSummary(): Promise<DashboardSummary> {
  return requestJson<DashboardSummary>("/api/admin/dashboard/summary");
}

export async function getAdminRegistrations(): Promise<AdminRegistrationRow[]> {
  return requestJson<AdminRegistrationRow[]>("/api/admin/registrations");
}

export function createIdempotencyKey() {
  return fallbackId();
}
