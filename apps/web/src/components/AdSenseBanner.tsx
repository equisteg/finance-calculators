"use client";

import { useEffect } from "react";

interface AdSenseBannerProps {
  client: string;
  slot: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal";
  responsive?: "true" | "false";
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function AdSenseBanner({
  client,
  slot,
  format = "auto",
  responsive = "true",
  className = "",
}: AdSenseBannerProps) {
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error("AdSense push error:", err);
    }
  }, []);

  return (
    <div className={`overflow-hidden text-center my-6 ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}