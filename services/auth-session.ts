import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { AuthSession, AuthUser } from "@/types/api";

const SESSION_KEY = "auth-session";

type SessionListener = (session: AuthSession | null) => void;

const sessionListeners = new Set<SessionListener>();

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.name === "string" &&
    (candidate.phone === undefined ||
      candidate.phone === null ||
      typeof candidate.phone === "string")
  );
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.refreshToken === "string" &&
    isAuthUser(candidate.user)
  );
}

function notifySessionListeners(session: AuthSession | null) {
  for (const listener of sessionListeners) {
    listener(session);
  }
}

async function readStoredValue() {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(SESSION_KEY);
  }

  return SecureStore.getItemAsync(SESSION_KEY);
}

async function writeStoredValue(value: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_KEY, value);
    }
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, value);
}

async function clearStoredValue() {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY);
    }
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function readSession() {
  try {
    const raw = await readStoredValue();
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    return isAuthSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeSession(session: AuthSession) {
  const serialized = JSON.stringify(session);
  await writeStoredValue(serialized);
  notifySessionListeners(session);
}

export async function updateSessionTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}) {
  const session = await readSession();

  if (!session) {
    return null;
  }

  const nextSession = {
    ...session,
    ...tokens,
  } satisfies AuthSession;

  await writeSession(nextSession);
  return nextSession;
}

export async function updateSessionUser(user: AuthUser) {
  const session = await readSession();

  if (!session) {
    return null;
  }

  const nextSession = {
    ...session,
    user,
  } satisfies AuthSession;

  await writeSession(nextSession);
  return nextSession;
}

export async function clearSession() {
  await clearStoredValue();
  notifySessionListeners(null);
}

export async function getAccessToken() {
  const session = await readSession();
  return session?.accessToken ?? null;
}

export async function getRefreshToken() {
  const session = await readSession();
  return session?.refreshToken ?? null;
}

export function subscribeToSession(listener: SessionListener) {
  sessionListeners.add(listener);

  return () => {
    sessionListeners.delete(listener);
  };
}
