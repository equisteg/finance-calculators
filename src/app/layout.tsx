import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { CurrencyProvider } from "./context/CurrencyContext";

export const metadata: Metadata = {
  title: "Finealth - Global & Domestic Financial Engines",
  description:
    "Live benchmark bullion rates, stock indices, multi-jurisdiction tax engines, and loan calculators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ADSENSE_PUB_ID = "ca-pub-XXXXXXXXXXXXXXXX";

  return (
    <html lang="en">
      <head>
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="antialiased bg-[#050508] text-white">
        <CurrencyProvider>{children}</CurrencyProvider>
      </body>
    </html>
  );
}