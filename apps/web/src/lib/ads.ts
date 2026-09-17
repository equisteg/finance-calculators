/**
 * AdSense configuration, in one place so the loader in layout.tsx and every
 * banner slot always agree.
 *
 * The client id defaults to the publisher authorised in public/ads.txt
 * (google.com, pub-1503863859594756, DIRECT). Keep the two in sync: an ad
 * request from an id that ads.txt does not list is rejected.
 *
 * Slot ids come from the AdSense dashboard (Ads -> By ad unit). Set them per
 * environment; a slot left unset renders nothing rather than a dead unit.
 */

export const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-1503863859594756";

export const AD_SLOTS = {
  top: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP ?? "",
  mid: process.env.NEXT_PUBLIC_ADSENSE_SLOT_MID ?? "",
  bottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM ?? "",
  calculator: process.env.NEXT_PUBLIC_ADSENSE_SLOT_CALCULATOR ?? "",
} as const;
