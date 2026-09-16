"use client";

import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export interface PlatformInfo {
  isNative: boolean;
  platform: "web" | "android" | "ios";
  isReady: boolean;
}

export function usePlatform(): PlatformInfo {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    isNative: false,
    platform: "web",
    isReady: false,
  });

  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    const plat = Capacitor.getPlatform() as "web" | "android" | "ios";
    setPlatformInfo({
      isNative: native,
      platform: plat,
      isReady: true,
    });
  }, []);

  return platformInfo;
}