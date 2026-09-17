"use client";

import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

export interface PlatformInfo {
  isNative: boolean;
  platform: "web" | "android" | "ios";
  isReady: boolean;
}

// The static export is pre-rendered without Capacitor, so the server snapshot
// is always "web"; the client snapshot is read once the bridge is available.
const SERVER_SNAPSHOT: PlatformInfo = { isNative: false, platform: "web", isReady: false };

let clientSnapshot: PlatformInfo | null = null;

function getClientSnapshot(): PlatformInfo {
  // Cached: useSyncExternalStore requires a stable reference between calls.
  if (!clientSnapshot) {
    clientSnapshot = {
      isNative: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform() as PlatformInfo["platform"],
      isReady: true,
    };
  }
  return clientSnapshot;
}

// The platform never changes during a session, so there is nothing to subscribe to.
const subscribe = () => () => {};

export function usePlatform(): PlatformInfo {
  return useSyncExternalStore(subscribe, getClientSnapshot, () => SERVER_SNAPSHOT);
}
