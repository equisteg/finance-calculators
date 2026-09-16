"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface SplashSequenceProps {
  onComplete: () => void;
}

export default function SplashSequence({ onComplete }: SplashSequenceProps) {
  const [phase, setPhase] = useState<"enter" | "active" | "fadeout">("enter");
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    // Phase 1: Activate smooth entrance after initial paint
    const tEnter = setTimeout(() => {
      setPhase("active");
    }, 100);

    // Progress bar animation to show engine boot
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 60);

    // Phase 2: Trigger smooth fade-out at 1.8 seconds
    const tFade = setTimeout(() => {
      setPhase("fadeout");
    }, 1800);

    // Phase 3: Dismount from DOM
    const tDone = setTimeout(() => {
      onComplete();
    }, 2200);

    return () => {
      clearTimeout(tEnter);
      clearInterval(progressInterval);
      clearTimeout(tFade);
      clearTimeout(tDone);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        zIndex: 99999,
      }}
      className={`fixed inset-0 flex flex-col items-center justify-center bg-[#070708] select-none transition-opacity duration-500 ease-out ${
        phase === "fadeout" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center justify-center -mt-10">
        {/* Brand Icon Box */}
        <div
          className={`relative w-28 h-28 rounded-3xl overflow-hidden border border-[#22222e] bg-[#0d0d12] shadow-[0_0_50px_rgba(16,185,129,0.2)] flex items-center justify-center transition-all duration-700 ease-out ${
            phase === "enter"
              ? "scale-75 opacity-0 translate-y-6"
              : "scale-100 opacity-100 translate-y-0"
          }`}
        >
          <Image
            src="/logo.png"
            alt="Finealth Mark"
            width={112}
            height={112}
            priority
            className="object-cover"
          />
        </div>

        {/* Brand Typography */}
        <div
          className={`mt-6 text-center transition-all duration-700 ease-out delay-150 ${
            phase === "enter"
              ? "opacity-0 translate-y-4"
              : "opacity-100 translate-y-0"
          }`}
        >
          <h1 className="text-3xl font-serif font-bold tracking-tight text-zinc-100">
            finealth
          </h1>
          <p className="text-[11px] font-mono tracking-widest uppercase text-emerald-400 mt-1.5 font-medium">
            Autonomous Wealth Architecture
          </p>
        </div>

        {/* Micro Engine Progress Indicator */}
        <div
          className={`mt-8 w-44 h-1 bg-[#181822] rounded-full overflow-hidden transition-all duration-500 delay-300 ${
            phase === "enter" ? "opacity-0" : "opacity-100"
          }`}
        >
          <div
            className="h-full bg-emerald-400 transition-all duration-75 ease-linear rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer Tagline */}
      <div className="absolute bottom-8 text-center">
        <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">
          Financial Intelligence Core 3.0
        </span>
      </div>
    </div>
  );
}