import Constants from "expo-constants";
import { Platform } from "react-native";

import { deletePushToken, registerPushToken } from "@/services/notifications";
import {
  clearPushRegistration,
  readPushRegistration,
  writePushRegistration,
} from "@/services/push-registration-storage";

type NativePlatform = "ios" | "android";
type NotificationsModule = typeof import("expo-notifications");

let notificationsModulePromise: Promise<NotificationsModule> | null = null;

function getSupportedPlatform(): NativePlatform | null {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    return Platform.OS;
  }

  return null;
}

function isExpoGo() {
  return Constants.executionEnvironment === "storeClient";
}

function isPushRegistrationSupported() {
  return !(Platform.OS === "android" && isExpoGo());
}

async function loadNotificationsModule() {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import("expo-notifications");
  }

  return notificationsModulePromise;
}

async function ensureAndroidChannel(notifications: NotificationsModule) {
  if (Platform.OS !== "android") {
    return;
  }

  await notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: notifications.AndroidImportance.DEFAULT,
  });
}

async function requestPushPermissions(notifications: NotificationsModule) {
  const currentSettings = await notifications.getPermissionsAsync();

  if (
    currentSettings.granted ||
    currentSettings.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return currentSettings;
  }

  return notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
}

async function getNativePushToken(notifications: NotificationsModule) {
  const tokenResponse = await notifications.getDevicePushTokenAsync();

  if (!tokenResponse.data || typeof tokenResponse.data !== "string") {
    return null;
  }

  return tokenResponse.data;
}

export async function registerCurrentDeviceForPush() {
  const platform = getSupportedPlatform();

  if (!platform || !isPushRegistrationSupported()) {
    return;
  }

  const notifications = await loadNotificationsModule();

  await ensureAndroidChannel(notifications);

  const permissions = await requestPushPermissions(notifications);

  if (
    !permissions.granted &&
    permissions.ios?.status !== notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return;
  }

  const pushToken = await getNativePushToken(notifications);

  if (!pushToken) {
    return;
  }

  const existingRegistration = await readPushRegistration();

  if (
    existingRegistration &&
    existingRegistration.pushToken === pushToken &&
    existingRegistration.platform === platform &&
    existingRegistration.deviceId
  ) {
    return;
  }

  if (existingRegistration?.deviceId) {
    try {
      await deletePushToken(existingRegistration.deviceId);
    } catch {
      // Continue with the new registration attempt.
    }
  }

  const registration = await registerPushToken({
    pushToken,
    platform,
  });

  await writePushRegistration({
    deviceId: registration.id,
    platform,
    pushToken,
  });
}

export async function unregisterCurrentDeviceFromPush() {
  if (!isPushRegistrationSupported()) {
    await clearPushRegistration();
    return;
  }

  const existingRegistration = await readPushRegistration();

  if (!existingRegistration?.deviceId) {
    await clearPushRegistration();
    return;
  }

  try {
    await deletePushToken(existingRegistration.deviceId);
  } finally {
    await clearPushRegistration();
  }
}
