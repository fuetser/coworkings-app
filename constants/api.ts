const PRODUCTION_API_BASE_URL = "https://mobback.emptycloud.space";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveApiBaseUrl() {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return trimTrailingSlash(explicitBaseUrl);
  }

  return PRODUCTION_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
export const AUTH_API_BASE_URL = API_BASE_URL;

if (__DEV__) {
  console.info(`[api] Using API base URL: ${API_BASE_URL}`);
}
