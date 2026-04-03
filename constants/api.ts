import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_API_PORT = "8000";
const LOCALHOST = "localhost";
const ANDROID_EMULATOR_HOST = "10.0.2.2";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function extractHost(candidate: string | null | undefined) {
  if (!candidate) {
    return null;
  }

  const trimmedCandidate = candidate.trim();
  if (!trimmedCandidate) {
    return null;
  }

  const withoutScheme = trimmedCandidate.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const authority = withoutScheme.split("/")[0]?.split("?")[0]?.split("#")[0];

  if (!authority) {
    return null;
  }

  const hostWithOptionalPort = authority.split("@").pop() ?? authority;

  if (hostWithOptionalPort.startsWith("[")) {
    const closingBracketIndex = hostWithOptionalPort.indexOf("]");
    return closingBracketIndex >= 0
      ? hostWithOptionalPort.slice(1, closingBracketIndex)
      : null;
  }

  return hostWithOptionalPort.split(":")[0] ?? null;
}

function resolveExpoHost() {
  const hostCandidates = [
    Constants.expoGoConfig?.debuggerHost,
    Constants.expoConfig?.hostUri,
    Constants.platform?.hostUri,
    Constants.platform?.developer,
    Constants.linkingUri,
    Constants.experienceUrl,
  ];

  for (const candidate of hostCandidates) {
    const host = extractHost(candidate);
    if (host) {
      return host;
    }
  }

  return null;
}

function buildHttpUrl(host: string) {
  return `http://${host}:${DEFAULT_API_PORT}`;
}

function resolveApiBaseUrl() {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return trimTrailingSlash(explicitBaseUrl);
  }

  const expoHost = resolveExpoHost();
  const isLocalExpoHost =
    expoHost === LOCALHOST || expoHost === "127.0.0.1" || expoHost === "::1";

  if (Platform.OS === "web") {
    return buildHttpUrl(LOCALHOST);
  }

  if (Platform.OS === "android") {
    if (expoHost && !isLocalExpoHost) {
      return buildHttpUrl(expoHost);
    }

    return buildHttpUrl(ANDROID_EMULATOR_HOST);
  }

  if (expoHost) {
    return buildHttpUrl(isLocalExpoHost ? LOCALHOST : expoHost);
  }

  return buildHttpUrl(LOCALHOST);
}

export const API_BASE_URL = resolveApiBaseUrl();
export const AUTH_API_BASE_URL = API_BASE_URL;

if (__DEV__) {
  console.info(`[api] Using API base URL: ${API_BASE_URL}`);
}
