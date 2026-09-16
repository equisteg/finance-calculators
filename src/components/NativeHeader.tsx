"use client";

import React from "react";
import { usePlatform } from "@/hooks/usePlatform";

interface NativeHeaderProps {
  title: string;
  subtitle?: string;
}

export default function NativeHeader({ title, subtitle }: NativeHeaderProps) {
  const { isNative } = usePlatform();

  // Keep top site navigation for browsers; show native header only on mobile
  if (!isNative) return null;

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-zinc-900 safe-top">
      <div className="flex items-center justify-between px-5 h-14">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">{title}</h1>
          {subtitle && (
            <p className="text-[10px] text-zinc-500 font-medium tracking-wide uppercase">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            PRO
          </span>
        </div>
      </div>
    </header>
  );
}