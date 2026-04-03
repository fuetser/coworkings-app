import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

type StoredPushRegistration = {
  deviceId: string;
  platform: "ios" | "android";
  pushToken: string;
};

const PUSH_REGISTRATION_KEY = "push-device-registration";

async function readStoredValue() {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(PUSH_REGISTRATION_KEY);
  }

  return SecureStore.getItemAsync(PUSH_REGISTRATION_KEY);
}

async function writeStoredValue(value: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PUSH_REGISTRATION_KEY, value);
    }
    return;
  }

  await SecureStore.setItemAsync(PUSH_REGISTRATION_KEY, value);
}

async function clearStoredValue() {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PUSH_REGISTRATION_KEY);
    }
    return;
  }

  await SecureStore.deleteItemAsync(PUSH_REGISTRATION_KEY);
}

function isStoredPushRegistration(value: unknown): value is StoredPushRegistration {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.deviceId === "string" &&
    (candidate.platform === "ios" || candidate.platform === "android") &&
    typeof candidate.pushToken === "string"
  );
}

export async function readPushRegistration() {
  try {
    const raw = await readStoredValue();

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    return isStoredPushRegistration(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writePushRegistration(value: StoredPushRegistration) {
  await writeStoredValue(JSON.stringify(value));
}

export async function clearPushRegistration() {
  await clearStoredValue();
}
