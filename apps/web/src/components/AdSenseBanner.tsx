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
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

/**
 * A display ad unit. Renders nothing until a real slot id is configured
 * (see src/lib/ads.ts), so no placeholder unit is ever sent to Google.
 *
 * The container reserves its height before the ad loads, so a filled unit
 * does not push the page content down (Cumulative Layout Shift).
 */
export default function AdSenseBanner({
  client,
  slot,
  format = "auto",
  responsive = "true",
  className = "",
}: AdSenseBannerProps) {
  useEffect(() => {
    if (!slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense push error:", err);
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <div className={`overflow-hidden text-center my-6 min-h-[100px] ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: 100 }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}
