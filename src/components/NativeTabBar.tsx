"use client";

import React from "react";
import { usePlatform } from "@/hooks/usePlatform";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export type TabKey = "sip" | "lump" | "swp" | "compare";

interface TabItem {
  id: TabKey;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const TABS: TabItem[] = [
  {
    id: "sip",
    label: "SIP",
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? "text-emerald-400" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: "lump",
    label: "Lump Sum",
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? "text-emerald-400" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "swp",
    label: "SWP",
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? "text-emerald-400" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    id: "compare",
    label: "Compare",
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? "text-emerald-400" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

interface NativeTabBarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export default function NativeTabBar({ activeTab, onSelectTab }: NativeTabBarProps) {
  const { isNative } = usePlatform();

  // Never show mobile navigation bar on desktop browser view
  if (!isNative) return null;

  const handlePress = async (id: TabKey) => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Graceful fallback if device lacks hardware haptic motor
    }
    onSelectTab(id);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c0c0e]/95 backdrop-blur-xl border-t border-zinc-800/80 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handlePress(tab.id)}
              className="flex-1 flex flex-col items-center justify-center h-full active:scale-95 transition-transform"
            >
              <div className="relative">
                {tab.icon(isActive)}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight font-medium ${
                  isActive ? "text-zinc-100" : "text-zinc-500"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}