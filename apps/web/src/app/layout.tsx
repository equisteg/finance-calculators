import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import { CurrencyProvider } from "./context/CurrencyContext";
import { ADSENSE_CLIENT } from "@/lib/ads";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Finealth - Global & Domestic Financial Engines",
  description:
    "Reference bullion and index benchmarks, multi-jurisdiction tax engines, and loan and investment calculators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.className} antialiased bg-[#050508] text-white`}>
        <CurrencyProvider>{children}</CurrencyProvider>
      </body>
    </html>
  );
}
