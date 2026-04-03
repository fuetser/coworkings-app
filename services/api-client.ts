import { API_BASE_URL } from "@/constants/api";
import { translate } from "@/constants/i18n";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  updateSessionTokens,
} from "@/services/auth-session";
import { ApiClientError, createApiError } from "@/services/api-errors";
import type { RefreshSessionResponse } from "@/types/api";

type QueryPrimitive = string | number | boolean;
type QueryValue =
  | QueryPrimitive
  | null
  | undefined
  | Array<QueryPrimitive | null | undefined>;

type ApiQueryParams = Record<string, QueryValue>;

type ApiRequestOptions = {
  method?: string;
  query?: ApiQueryParams;
  body?: unknown;
  headers?: HeadersInit;
  auth?: boolean;
  timeoutMs?: number;
  fallbackMessage?: string;
};

type RequestExecutionOptions = ApiRequestOptions & {
  allowRefresh?: boolean;
  accessTokenOverride?: string | null;
};

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const REFRESH_PATH = "/auth/refresh";
const LOGOUT_PATH = "/auth/logout";

function buildUrl(path: string, query?: ApiQueryParams) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (!query) {
    return url.toString();
  }

  for (const [key, rawValue] of Object.entries(query)) {
    if (Array.isArray(rawValue)) {
      for (const item of rawValue) {
        appendQueryValue(url.searchParams, key, item);
      }
      continue;
    }

    appendQueryValue(url.searchParams, key, rawValue);
  }

  return url.toString();
}

function appendQueryValue(
  params: URLSearchParams,
  key: string,
  value: QueryPrimitive | null | undefined,
) {
  if (value === null || value === undefined) {
    return;
  }

  const normalizedValue =
    typeof value === "string" ? value.trim() : String(value);

  if (!normalizedValue) {
    return;
  }

  params.append(key, normalizedValue);
}

async function parseResponseBody(response: Response) {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const raw = await response.text();
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function buildHeaders(
  options: RequestExecutionOptions,
  normalizedPath: string,
) {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!options.auth) {
    return headers;
  }

  const accessToken =
    options.accessTokenOverride === undefined
      ? await getAccessToken()
      : options.accessTokenOverride;

  if (!accessToken) {
    throw new ApiClientError({
      kind: "unauthorized",
      message: translate("service.api.loginRequired"),
      status: 401,
      payload: { path: normalizedPath },
    });
  }

  headers.set("Authorization", `Bearer ${accessToken}`);

  return headers;
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function canRefreshRequest(path: string) {
  return path !== REFRESH_PATH && path !== LOGOUT_PATH;
}

async function performRefresh(timeoutMs: number) {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    await clearSession();
    return null;
  }

  let response: Response;

  try {
    response = await fetchWithTimeout(
      buildUrl(REFRESH_PATH),
      {
        method: "POST",
        headers: new Headers({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ refreshToken }),
      },
      timeoutMs,
    );
  } catch (error) {
    throw mapRequestError(error);
  }

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    await clearSession();
    return null;
  }

  const nextTokens = payload as RefreshSessionResponse;

  if (
    !nextTokens ||
    typeof nextTokens.accessToken !== "string" ||
    typeof nextTokens.refreshToken !== "string"
  ) {
    await clearSession();
    return null;
  }

  await updateSessionTokens(nextTokens);

  return nextTokens;
}

function mapRequestError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (error instanceof Error && error.name === "AbortError") {
    return new ApiClientError({
      kind: "timeout_error",
      message: translate("service.api.timeout"),
    });
  }

  return new ApiClientError({
    kind: "network_error",
    message: translate("service.api.network"),
  });
}

async function executeRequest<TResponse>(
  path: string,
  options: RequestExecutionOptions = {},
): Promise<TResponse> {
  const normalizedPath = normalizePath(path);
  const {
    auth = false,
    body,
    fallbackMessage,
    method = "GET",
    query,
    allowRefresh = true,
  } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const headers = await buildHeaders(options, normalizedPath);

  let response: Response;

  try {
    response = await fetchWithTimeout(
      buildUrl(normalizedPath, query),
      {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      timeoutMs,
    );
  } catch (error) {
    throw mapRequestError(error);
  }

  const payload = await parseResponseBody(response);

  if (
    !response.ok &&
    auth &&
    response.status === 401 &&
    allowRefresh &&
    canRefreshRequest(normalizedPath)
  ) {
    const refreshedTokens = await performRefresh(timeoutMs);

    if (refreshedTokens?.accessToken) {
      return executeRequest<TResponse>(normalizedPath, {
        ...options,
        allowRefresh: false,
        accessTokenOverride: refreshedTokens.accessToken,
      });
    }
  }

  if (!response.ok) {
    throw createApiError({
      status: response.status,
      payload,
      fallbackMessage: fallbackMessage ?? translate("service.api.network"),
    });
  }

  return payload as TResponse;
}

export function get<TResponse>(path: string, options?: ApiRequestOptions) {
  return executeRequest<TResponse>(path, {
    ...options,
    method: "GET",
  });
}

export function post<TResponse>(path: string, options?: ApiRequestOptions) {
  return executeRequest<TResponse>(path, {
    ...options,
    method: "POST",
  });
}

export function put<TResponse>(path: string, options?: ApiRequestOptions) {
  return executeRequest<TResponse>(path, {
    ...options,
    method: "PUT",
  });
}

export function patch<TResponse>(path: string, options?: ApiRequestOptions) {
  return executeRequest<TResponse>(path, {
    ...options,
    method: "PATCH",
  });
}

export function deleteRequest<TResponse>(
  path: string,
  options?: ApiRequestOptions,
) {
  return executeRequest<TResponse>(path, {
    ...options,
    method: "DELETE",
  });
}
