import { deleteRequest, get, post, put } from "@/services/api-client";
import { translate } from "@/constants/i18n";
import type {
  NotificationInboxResponse,
  NotificationPreferences,
  NotificationPrefsUpdate,
  PushDeviceRegistration,
  PushTokenRegisterRequest,
} from "@/types/api";

export async function fetchNotificationPreferences() {
  return get<NotificationPreferences>("/notifications/preferences", {
    auth: true,
    fallbackMessage: translate("service.notifications.loadPreferences"),
  });
}

export async function updateNotificationPreferences(
  body: NotificationPrefsUpdate,
) {
  return put<{ message: string }>("/notifications/preferences", {
    auth: true,
    body,
    fallbackMessage: translate("service.notifications.updatePreferences"),
  });
}

export async function fetchNotifications(params?: {
  page?: number;
  limit?: number;
}) {
  return get<NotificationInboxResponse>("/notifications", {
    auth: true,
    query: params,
    fallbackMessage: translate("service.notifications.loadNotifications"),
  });
}

export async function registerPushToken(body: PushTokenRegisterRequest) {
  return post<PushDeviceRegistration>("/devices/push-tokens", {
    auth: true,
    body,
    fallbackMessage: translate("service.notifications.registerDevice"),
  });
}

export async function deletePushToken(deviceId: string) {
  return deleteRequest<void>(`/devices/push-tokens/${deviceId}`, {
    auth: true,
    fallbackMessage: translate("service.notifications.removeDevice"),
  });
}
