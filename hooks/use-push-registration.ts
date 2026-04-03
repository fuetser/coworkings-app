import { useEffect } from "react";

import { registerCurrentDeviceForPush } from "@/services/push-registration";

export function usePushRegistration(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    void registerCurrentDeviceForPush().catch(() => {
      // Push registration failures should not block app usage.
    });
  }, [enabled]);
}
