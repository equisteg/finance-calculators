"use client";

import React, { useEffect } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import { usePlatform } from "@/hooks/usePlatform";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { isNative } = usePlatform();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Sync native status bar with dark palette
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: "#0a0a0c" }).catch(() => {});
    }
  }, []);

  return (
    <div className={`min-h-screen bg-[#0a0a0c] text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-300 ${
      isNative ? "pb-24" : ""
    }`}>
      {children}
    </div>
  );
}