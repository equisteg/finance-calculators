"use client";

import "./globals.css";
import { CurrencyProvider, useCurrency, REGIONAL_PRIORITY_DATA } from "./context/CurrencyContext";

function LivePriorityTicker() {
  const { activeProfile, lastUpdated, isSyncing, manualRefresh } = useCurrency();

  return (
    <div className="bg-[#050507] border-b border-white/[0.08] py-2 px-6 text-[11px] font-mono flex items-center justify-between text-zinc-400 overflow-x-auto whitespace-nowrap scrollbar-none">
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          {activeProfile.name.toUpperCase()} PRIORITY BENCHMARKS
        </span>
        {activeProfile.priorityAssets.map((asset) => (
          <span key={asset.id} className="flex items-center gap-1.5">
            <span className="text-zinc-300 font-semibold">{asset.name}:</span>
            <span className="text-white font-mono">
              {asset.symbol}
              {asset.basePrice > 100
                ? Math.round(asset.basePrice).toLocaleString()
                : asset.basePrice.toFixed(2)}
            </span>
            <span className={`text-[10px] ${asset.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {asset.changePct >= 0 ? "▲" : "▼"} {Math.abs(asset.changePct)}%
            </span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3 text-zinc-400 text-[10px] pl-4">
        <span>Clock: {lastUpdated}</span>
        <button
          onClick={manualRefresh}
          disabled={isSyncing}
          className="px-2.5 py-0.5 rounded bg-white/[0.08] hover:bg-emerald-500 hover:text-black transition text-[10px] font-mono text-white font-semibold"
        >
          {isSyncing ? "Syncing..." : "⟳ Sync Live"}
        </button>
      </div>
    </div>
  );
}

function MainNavbar() {
  const { baseCurrency, setBaseCurrency } = useCurrency();

  return (
    <header className="border-b border-white/[0.06] bg-[#070709]/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-bold font-mono text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            F
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-serif">Finealth</span>
        </a>

        <div className="flex items-center gap-6">
          <nav className="hidden lg:flex items-center gap-6 text-xs uppercase tracking-wider text-zinc-400 font-mono">
            <a href="/#tools" className="hover:text-white transition-colors">Calculator Suite</a>
            <a href="/#history" className="hover:text-white transition-colors">Pricing History</a>
            <a href="/#converter" className="hover:text-white transition-colors">Forex Engine</a>
            <a href="/#dispatches" className="hover:text-white transition-colors">Market Wire</a>
          </nav>

          <div className="flex items-center gap-2 bg-[#0e0e12] border border-white/[0.08] px-3 py-1.5 rounded-xl">
            <span className="text-base">{REGIONAL_PRIORITY_DATA[baseCurrency]?.flag}</span>
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="bg-transparent text-white text-xs font-mono outline-none cursor-pointer"
            >
              {Object.values(REGIONAL_PRIORITY_DATA).map((c) => (
                <option key={c.currencyCode} value={c.currencyCode} className="bg-[#0e0e12] text-white">
                  {c.flag} {c.currencyCode} ({c.symbol}) &mdash; {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black"
      >
        <CurrencyProvider>
          <div>
            <LivePriorityTicker />
            <MainNavbar />
            <main>{children}</main>
          </div>

          <footer className="border-t border-white/[0.06] py-12 bg-[#070709] text-zinc-500 text-xs font-mono mt-24">
            <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>&copy; {new Date().getFullYear()} Finealth. Native Country-Specific Priorities & Historical Trajectories.</p>
              <div className="flex gap-4 text-zinc-400">
                <span>Tailored National Engines</span>
                <span>&bull;</span>
                <span>Zero Server Logging</span>
              </div>
            </div>
          </footer>
        </CurrencyProvider>
      </body>
    </html>
  );
}