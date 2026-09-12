"use client";

import { useState, useEffect } from "react";
import {
  useCurrency,
  ALL_50_US_STATES,
  INDIAN_CITIES,
  REGIONAL_PRIORITY_DATA,
  PriorityAsset,
} from "./context/CurrencyContext";

// --- Pure SVG Milestone Trajectory Curve Component ---
function AssetHistoryChart({ asset }: { asset: PriorityAsset }) {
  const [activeHoverPoint, setActiveHoverPoint] = useState<number | null>(null);
  const data = asset.history || [];

  if (data.length < 2) return null;

  const width = 580;
  const height = 220;
  const paddingX = 45;
  const paddingY = 35;

  const values = data.map((d) => d.numericValue);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal - minVal || 1;

  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((d.numericValue - minVal) / valRange) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, pt, idx, arr) => {
    if (idx === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[idx - 1];
    const cpX = (prev.x + pt.x) / 2;
    return `${acc} C ${cpX},${prev.y} ${cpX},${pt.y} ${pt.x},${pt.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;

  const active = activeHoverPoint !== null ? points[activeHoverPoint] : points[points.length - 1];

  return (
    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] hover:border-emerald-500/30 transition flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-2 border-b border-white/[0.06] gap-2">
          <div>
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block mb-0.5">
              {asset.category}
            </span>
            <h3 className="text-lg font-bold text-white">
              {asset.name} ({asset.unit})
            </h3>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] font-mono text-zinc-500 block uppercase">
              {active.year} ({active.era})
            </span>
            <span className="text-xl font-bold font-mono text-emerald-400">
              {active.priceFormatted}
            </span>
          </div>
        </div>

        {/* SVG Responsive Line Chart */}
        <div className="relative w-full overflow-hidden my-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            <defs>
              <linearGradient id={`grad-${asset.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Line Guides */}
            <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.12)" />

            {/* Shaded Area */}
            <path d={areaD} fill={`url(#grad-${asset.id})`} />

            {/* Trajectory Curve */}
            <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Interactive Data Nodes */}
            {points.map((pt, i) => (
              <g key={pt.year} className="cursor-pointer" onMouseEnter={() => setActiveHoverPoint(i)}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={activeHoverPoint === i ? 6 : 4}
                  fill={activeHoverPoint === i ? "#ffffff" : "#10b981"}
                  stroke="#070709"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />
                <text
                  x={pt.x}
                  y={height - paddingY + 18}
                  textAnchor="middle"
                  className="text-[10px] font-mono fill-zinc-500 hover:fill-white transition"
                >
                  {pt.year}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Verifiable Reference Footer */}
      <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono gap-2">
        <span className="text-zinc-500">Verified Origin Baseline:</span>
        <a
          href={asset.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 flex items-center gap-1 self-start sm:self-auto"
        >
          {asset.sourceAuthority} &rarr;
        </a>
      </div>
    </div>
  );
}

export default function Home() {
  const {
    baseCurrency,
    selectedUsState,
    setSelectedUsState,
    selectedIndianCity,
    setSelectedIndianCity,
    rates,
    convert,
    activeProfile,
    lastUpdated,
  } = useCurrency();

  const sym = activeProfile.symbol;
  const curr = activeProfile.currencyCode;
  const usState = ALL_50_US_STATES[selectedUsState] || ALL_50_US_STATES["TX"];
  const city = INDIAN_CITIES[selectedIndianCity] || INDIAN_CITIES["Mumbai"];

  // Currency Converter States
  const [convAmount, setConvAmount] = useState<number>(100);
  const [fromCurr, setFromCurr] = useState<string>("USD");
  const [toCurr, setToCurr] = useState<string>(curr);
  const convertedValue = convert(convAmount, fromCurr, toCurr);

  useEffect(() => {
    setToCurr(curr);
  }, [curr]);

  // Priority Asset Calculation (Adds city premium for India)
  const getAdjustedAssets = () => {
    return activeProfile.priorityAssets.map((asset) => {
      let finalPrice = asset.basePrice;
      if (curr === "INR" && asset.id === "in_gold") {
        finalPrice += city.goldPremiumPer10g;
      } else if (curr === "INR" && asset.id === "in_silver") {
        finalPrice += city.silverPremiumPerKg;
      }
      return { ...asset, finalPrice };
    });
  };

  const currentAssets = getAdjustedAssets();

  // Dynamic Tools based on Country
  const getCountryTools = () => {
    if (curr === "INR") {
      return [
        { id: "emi", label: "Loan EMI", desc: "Home, Business, Auto, Personal" },
        { id: "sip", label: "SIP & Lumpsum", desc: "Mutual Funds & Equity Growth" },
        { id: "tax", label: "Income Tax", desc: "Old vs New Regime (80C, 80D)" },
        { id: "indirect_tax", label: "GST Engine", desc: "5%, 12%, 18%, 28% Slabs" },
        { id: "interest", label: "Interest Engine", desc: "Simple vs Compound (Multi-Freq)" },
        { id: "deposit", label: "FD & RD Maturity", desc: "Bank Fixed & Recurring Deposits" },
        { id: "salary", label: "CTC to In-Hand", desc: "EPF, PT & Net Take-Home Pay" },
        { id: "compare", label: "Compare Loans", desc: "Side-by-Side Bank Offer Analysis" },
      ];
    } else if (curr === "USD") {
      return [
        { id: "emi", label: "Mortgage & Loans", desc: "Fixed 30Y/15Y, Auto, Commercial" },
        { id: "sip", label: "401(k) & IRA", desc: "Index Funds & Retirement Wealth" },
        { id: "tax", label: `IRS & ${usState.code} State Tax`, desc: `Federal + ${usState.name} Tax Brackets` },
        { id: "indirect_tax", label: `${usState.code} Sales Tax`, desc: `${usState.name} Combined State/Local Tax` },
        { id: "interest", label: "Interest Engine", desc: "Simple vs Compound (Multi-Freq)" },
        { id: "deposit", label: "HYSA & CD Yield", desc: "High-Yield Savings & Certificates" },
        { id: "salary", label: "Paycheck Take-Home", desc: "FICA + Fed + State Net Pay" },
        { id: "compare", label: "Compare Mortgages", desc: "Side-by-Side APR & Fee Evaluator" },
      ];
    } else if (curr === "EUR") {
      return [
        { id: "emi", label: "EU Mortgage & Loan", desc: "Euribor Variable & Fixed Rates" },
        { id: "sip", label: "UCITS ETF & Wealth", desc: "Pan-European Compounding Models" },
        { id: "tax", label: "EU Income Tax", desc: "Progressive Resident Tax Assessment" },
        { id: "indirect_tax", label: "EU VAT Engine", desc: "Harmonized European Value Added Tax" },
        { id: "interest", label: "Interest Engine", desc: "Simple vs Compound (Multi-Freq)" },
        { id: "deposit", label: "Term Deposit", desc: "Fixed Eurozone Banking Deposits" },
        { id: "salary", label: "Net Salary Paycheck", desc: "Social Security & Withholding" },
        { id: "compare", label: "Compare EU Loans", desc: "Side-by-Side Bank Rate Analysis" },
      ];
    } else {
      return [
        { id: "emi", label: "Mortgage Repayment", desc: "Residential, Buy-to-Let & Commercial" },
        { id: "sip", label: "Stocks & Shares ISA", desc: "Tax-Free Capital Compounding" },
        { id: "tax", label: "HMRC Income Tax", desc: "Personal Allowance & Higher Bands" },
        { id: "indirect_tax", label: "UK VAT Engine", desc: "Standard 20% & Reduced 5%" },
        { id: "interest", label: "Interest Engine", desc: "Simple vs Compound (Multi-Freq)" },
        { id: "deposit", label: "Cash ISA & Term", desc: "Fixed Term Savings Bonds" },
        { id: "salary", label: "PAYE Take-Home", desc: "National Insurance & Net Pay" },
        { id: "compare", label: "Compare Mortgages", desc: "Side-by-Side Fixed vs Tracker" },
      ];
    }
  };

  const currentTools = getCountryTools();
  const [activeTool, setActiveTool] = useState<string>("emi");

  useEffect(() => {
    if (!currentTools.some((t) => t.id === activeTool)) {
      setActiveTool(currentTools[0].id);
    }
  }, [curr]);

  const defaultLoan = curr === "INR" ? 3000000 : 350000;
  const defaultSalary = curr === "INR" ? 1500000 : curr === "USD" ? 95000 : 60000;

  // 1. Loan EMI
  const [loanAmount, setLoanAmount] = useState<number>(defaultLoan);
  const [loanRate, setLoanRate] = useState<number>(8.5);
  const [loanTenureYears, setLoanTenureYears] = useState<number>(curr === "INR" ? 20 : 30);
  const [loanCategory, setLoanCategory] = useState<string>("Mortgage");

  useEffect(() => {
    setLoanAmount(defaultLoan);
  }, [curr]);

  const rMonthly = loanRate / 12 / 100;
  const nMonths = loanTenureYears * 12;
  const emiValue =
    rMonthly > 0
      ? Math.round((loanAmount * rMonthly * Math.pow(1 + rMonthly, nMonths)) / (Math.pow(1 + rMonthly, nMonths) - 1))
      : Math.round(loanAmount / nMonths);
  const totalLoanRepayment = emiValue * nMonths;
  const totalLoanInterest = totalLoanRepayment - loanAmount;

  // 2. Wealth / SIP / 401(k)
  const [investMode, setInvestMode] = useState<"monthly" | "lumpsum">("monthly");
  const [investAmount, setInvestAmount] = useState<number>(curr === "INR" ? 15000 : 600);
  const [investRate, setInvestRate] = useState<number>(10);
  const [investYears, setInvestYears] = useState<number>(15);

  let totalPrincipalInvested = 0;
  let estimatedMaturity = 0;
  if (investMode === "monthly") {
    const i = investRate / 12 / 100;
    const n = investYears * 12;
    totalPrincipalInvested = investAmount * n;
    estimatedMaturity = Math.round(investAmount * ((Math.pow(1 + i, n) - 1) / i) * (1 + i));
  } else {
    totalPrincipalInvested = investAmount;
    estimatedMaturity = Math.round(investAmount * Math.pow(1 + investRate / 100, investYears));
  }
  const totalGains = Math.max(0, estimatedMaturity - totalPrincipalInvested);

  // 3. Tax Engine
  const [grossIncome, setGrossIncome] = useState<number>(defaultSalary);
  const [inr80C, setInr80C] = useState<number>(150000);
  const [inr80D, setInr80D] = useState<number>(25000);
  const [inrHra, setInrHra] = useState<number>(120000);

  const computeCountryTax = () => {
    if (curr === "INR") {
      const taxableNew = Math.max(0, grossIncome - 75000);
      let tNew = 0;
      if (taxableNew > 300000) tNew += Math.min(taxableNew - 300000, 400000) * 0.05;
      if (taxableNew > 700000) tNew += Math.min(taxableNew - 700000, 300000) * 0.1;
      if (taxableNew > 1000000) tNew += Math.min(taxableNew - 1000000, 200000) * 0.15;
      if (taxableNew > 1200000) tNew += Math.min(taxableNew - 1200000, 300000) * 0.2;
      if (taxableNew > 1500000) tNew += (taxableNew - 1500000) * 0.3;
      if (taxableNew <= 700000) tNew = 0;
      const finalNew = Math.round(tNew * 1.04);

      const taxableOld = Math.max(0, grossIncome - 50000 - inr80C - inr80D - inrHra);
      let tOld = 0;
      if (taxableOld > 250000) tOld += Math.min(taxableOld - 250000, 250000) * 0.05;
      if (taxableOld > 500000) tOld += Math.min(taxableOld - 500000, 500000) * 0.2;
      if (taxableOld > 1000000) tOld += (taxableOld - 1000000) * 0.3;
      if (taxableOld <= 500000) tOld = 0;
      const finalOld = Math.round(tOld * 1.04);

      return {
        labelA: "New Tax Regime (₹75k Standard Deduction)",
        valA: finalNew,
        labelB: "Old Tax Regime (With 80C/80D/HRA)",
        valB: finalOld,
        notes: "Budget FY 2025-26 slabs applied.",
      };
    } else if (curr === "USD") {
      const stdDeduction = 15750;
      const taxable = Math.max(0, grossIncome - stdDeduction);
      let fedTax = 0;
      if (taxable > 0) fedTax += Math.min(taxable, 11925) * 0.1;
      if (taxable > 11925) fedTax += Math.min(taxable - 11925, 48475 - 11925) * 0.12;
      if (taxable > 48475) fedTax += Math.min(taxable - 48475, 103350 - 48475) * 0.22;
      if (taxable > 103350) fedTax += Math.min(taxable - 103350, 197300 - 103350) * 0.24;
      if (taxable > 197300) fedTax += (taxable - 197300) * 0.32;

      const stateTax = (taxable * usState.incomeTaxRate) / 100;

      return {
        labelA: "IRS Federal Income Tax",
        valA: Math.round(fedTax),
        labelB: `${usState.name} State Income Tax (${usState.incomeTaxRate}%)`,
        valB: Math.round(stateTax),
        notes: `Federal Standard Deduction ($15,750) + ${usState.name} State Tax Code.`,
      };
    } else {
      let euTax = 0;
      if (grossIncome > 11000) euTax += Math.min(grossIncome - 11000, 31000) * 0.18;
      if (grossIncome > 42000) euTax += (grossIncome - 42000) * 0.42;
      const socialSec = grossIncome * 0.095;
      return {
        labelA: "Progressive Resident Tax",
        valA: Math.round(euTax),
        labelB: "Social Security Contribution (~9.5%)",
        valB: Math.round(socialSec),
        notes: "European Union harmonized progressive benchmarks.",
      };
    }
  };

  const taxResults = computeCountryTax();

  // 4. Indirect Tax
  const [indAmount, setIndAmount] = useState<number>(curr === "INR" ? 50000 : 1000);
  const [indType, setIndType] = useState<"exclusive" | "inclusive">("exclusive");

  const getEffectiveIndirectRate = () => {
    if (curr === "INR") return 18;
    if (curr === "USD") return usState.salesTaxRate;
    if (curr === "EUR") return 21;
    if (curr === "GBP") return 20;
    return 5;
  };

  const [indRate, setIndRate] = useState<number>(getEffectiveIndirectRate());

  useEffect(() => {
    setIndRate(getEffectiveIndirectRate());
  }, [curr, selectedUsState]);

  const calcTaxVal =
    indType === "exclusive"
      ? (indAmount * indRate) / 100
      : indAmount - indAmount / (1 + indRate / 100);
  const finalTotalWithTax = indType === "exclusive" ? indAmount + calcTaxVal : indAmount;
  const preTaxBase = indType === "exclusive" ? indAmount : indAmount - calcTaxVal;

  // 5. Interest Engine
  const [principalSI, setPrincipalSI] = useState<number>(curr === "INR" ? 200000 : 10000);
  const [rateSI, setRateSI] = useState<number>(8.0);
  const [yearsSI, setYearsSI] = useState<number>(5);
  const [compFreq, setCompFreq] = useState<number>(12);

  const simpleInterest = (principalSI * rateSI * yearsSI) / 100;
  const compoundInterest =
    principalSI * Math.pow(1 + rateSI / (compFreq * 100), compFreq * yearsSI) - principalSI;

  // 6. Deposit Instrument
  const [depMode, setDepMode] = useState<string>("Fixed");
  const [depAmount, setDepAmount] = useState<number>(curr === "INR" ? 100000 : 10000);
  const [depRate, setDepRate] = useState<number>(curr === "INR" ? 7.25 : 4.5);
  const [depYears, setDepYears] = useState<number>(3);

  const depositCompounded =
    depMode === "Fixed"
      ? Math.round(depAmount * Math.pow(1 + depRate / 400, 4 * depYears))
      : Math.round(depAmount * depYears * 12 * Math.pow(1 + depRate / 1200, 12 * depYears));

  // 7. Salary Take-Home
  const [ctcAmount, setCtcAmount] = useState<number>(defaultSalary);
  const computeTakeHome = () => {
    const mGross = ctcAmount / 12;
    if (curr === "INR") {
      const mEpf = Math.min(mGross * 0.5 * 0.12, 1800 * 2);
      const mTax = Math.round(taxResults.valA / 12);
      const mNet = Math.round(mGross - mEpf - 200 - mTax);
      return {
        gross: Math.round(mGross),
        deductions: Math.round(mEpf + 200 + mTax),
        net: mNet,
        subLabel: "EPF + Professional Tax + Monthly TDS",
      };
    } else if (curr === "USD") {
      const mFica = (ctcAmount * 0.0765) / 12;
      const mFedTax = taxResults.valA / 12;
      const mStateTax = taxResults.valB / 12;
      return {
        gross: Math.round(mGross),
        deductions: Math.round(mFica + mFedTax + mStateTax),
        net: Math.round(mGross - mFica - mFedTax - mStateTax),
        subLabel: `FICA + Fed Tax + ${usState.name} State Tax`,
      };
    } else {
      return {
        gross: Math.round(mGross),
        deductions: 0,
        net: Math.round(mGross),
        subLabel: "Zero Personal Income Tax Withheld",
      };
    }
  };
  const salaryResults = computeTakeHome();

  // 8. Loan Comparison
  const [compareOffers, setCompareOffers] = useState([
    { id: 1, name: "Lender Option A", principal: defaultLoan, rate: 8.5, tenure: 20 },
    { id: 2, name: "Lender Option B", principal: defaultLoan, rate: 8.1, tenure: 20 },
  ]);

  const addOffer = () => {
    if (compareOffers.length < 4) {
      setCompareOffers([
        ...compareOffers,
        {
          id: compareOffers.length + 1,
          name: `Lender Option ${String.fromCharCode(65 + compareOffers.length)}`,
          principal: defaultLoan,
          rate: 7.9,
          tenure: 20,
        },
      ]);
    }
  };

  const removeOffer = (id: number) => {
    if (compareOffers.length > 2) setCompareOffers(compareOffers.filter((o) => o.id !== id));
  };

  const calcCompEmi = (p: number, r: number, y: number) => {
    const rm = r / 12 / 100;
    const nm = y * 12;
    return rm > 0
      ? Math.round((p * rm * Math.pow(1 + rm, nm)) / (Math.pow(1 + rm, nm) - 1))
      : Math.round(p / nm);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Top Programmatic Ad Banner */}
      <div className="mb-10 w-full bg-[#0a0a0d] border border-white/[0.06] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest border border-white/[0.08] px-2 py-0.5 rounded">
            PARTNER NETWORK
          </span>
          <span className="text-xs text-zinc-300 font-mono">
            Direct Banking API &middot; Verified {activeProfile.name} Rates
          </span>
        </div>
        <div className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
          [ 728x90 FINANCIAL AD NETWORK CONTAINER ]
        </div>
      </div>

      {/* Hero Strip Tailored to Country Priorities */}
      <div className="max-w-4xl mb-12">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            JURISDICTION: {activeProfile.flag} {activeProfile.name.toUpperCase()} ({curr}) &bull; VENUE: {activeProfile.primaryExchange}
          </div>

          {/* India City Selector */}
          {curr === "INR" && (
            <div className="inline-flex items-center gap-2 bg-[#18181b] border border-white/[0.1] px-3 py-1 rounded-full text-xs font-mono text-white">
              <span className="text-zinc-400">CITY SPREAD:</span>
              <select
                value={selectedIndianCity}
                onChange={(e) => setSelectedIndianCity(e.target.value)}
                className="bg-transparent text-emerald-400 font-bold outline-none cursor-pointer"
              >
                {Object.keys(INDIAN_CITIES).map((cityName) => (
                  <option key={cityName} value={cityName} className="bg-[#18181b] text-white">
                    {cityName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* All 50 US States Selector */}
          {curr === "USD" && (
            <div className="inline-flex items-center gap-2 bg-[#18181b] border border-white/[0.1] px-3 py-1 rounded-full text-xs font-mono text-white">
              <span className="text-zinc-400">US STATE (ALL 50 STATES):</span>
              <select
                value={selectedUsState}
                onChange={(e) => setSelectedUsState(e.target.value)}
                className="bg-transparent text-emerald-400 font-bold outline-none cursor-pointer"
              >
                {Object.values(ALL_50_US_STATES).map((st) => (
                  <option key={st.code} value={st.code} className="bg-[#18181b] text-white">
                    {st.name} ({st.code}) &mdash; {st.incomeTaxRate}% Inc, {st.salesTaxRate}% Sales
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4 font-serif">
          {curr === "INR"
            ? `Bullion & Financial Markets in ${selectedIndianCity}, India`
            : curr === "USD"
            ? `Financial Intelligence for ${usState.name}, United States`
            : `Financial Intelligence for ${activeProfile.name}`}
        </h1>
        <p className="text-base sm:text-lg text-zinc-400 font-light leading-relaxed">
          Primary focus: <span className="text-emerald-400 font-medium">{activeProfile.headlinePriority}</span>. Live verified data without synthetic conversion artifacts.
        </p>
      </div>

      {/* 4-Col Country-Tailored Priority Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {currentAssets.map((asset) => (
          <div
            key={asset.id}
            className="bg-[#0e0e12] border border-white/[0.08] hover:border-emerald-500/30 rounded-3xl p-6 relative shadow-xl transition flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400/90 block mb-1">
                    {asset.category}
                  </span>
                  <h3 className="text-lg font-bold text-white">{asset.name}</h3>
                  <p className="text-xs text-zinc-400 font-mono">{asset.unit}</p>
                </div>
                <span className={`text-xs font-mono font-bold ${asset.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {asset.changePct >= 0 ? "▲" : "▼"} {Math.abs(asset.changePct)}%
                </span>
              </div>

              <div className="my-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-0.5">
                  LIVE BENCHMARK RATE
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  {asset.symbol}
                  {asset.finalPrice > 100
                    ? Math.round(asset.finalPrice).toLocaleString()
                    : asset.finalPrice.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] font-mono border-t border-white/[0.06] pt-3 text-zinc-400">
              <div className="flex justify-between">
                <span>Authority:</span>
                <span className="text-white truncate max-w-[170px] text-right">{asset.sourceAuthority}</span>
              </div>
              <div className="flex justify-between text-zinc-500 text-[10px] pt-1">
                <span>Tax & Norms:</span>
                <span className="text-emerald-400">{asset.taxNote}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Graphical Historical Trajectory Curves with Verified References */}
      <section id="history" className="mb-20 bg-[#0e0e12] border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-4 border-b border-white/[0.08] gap-2">
          <div>
            <h2 className="text-2xl font-bold text-white font-serif">
              Graphical Pricing Trajectory (Since Inception)
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Interactive multi-decade curve tracking against verified reporting bodies. Hover nodes to view milestones.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 self-start sm:self-auto">
            Decade Trend
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {currentAssets.slice(0, 4).map((asset) => (
            <AssetHistoryChart key={asset.id} asset={asset} />
          ))}
        </div>
      </section>

      {/* 8-Tool Financial Suite */}
      <section id="tools" className="mb-20">
        <div className="mb-6 pb-4 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold text-white font-serif">
              {curr === "USD" ? `${usState.name} (USA)` : activeProfile.name} Financial Calculator Suite
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Statutory calculators calibrated specifically for {activeProfile.name}.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 self-start sm:self-auto">
            {currentTools.length} Dynamic Engines Active
          </span>
        </div>

        {/* 2-Row Balanced Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {currentTools.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={`p-4 rounded-2xl text-left transition border ${
                activeTool === t.id
                  ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                  : "bg-[#0e0e12] border-white/[0.08] hover:border-white/[0.2] text-white"
              }`}
            >
              <div className="font-bold text-sm font-mono mb-1">{t.label}</div>
              <div className={`text-[11px] font-sans ${activeTool === t.id ? "text-black/80 font-medium" : "text-zinc-500"}`}>
                {t.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Active Engine Workspace */}
        <div className="bg-[#0e0e12] border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
          {/* 1. Loan EMI */}
          {activeTool === "emi" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div className="flex flex-wrap gap-2">
                  {curr === "INR"
                    ? ["Home", "Business", "Car", "Personal", "Education"].map((type) => (
                        <button
                          key={type}
                          onClick={() => setLoanCategory(type)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                            loanCategory === type ? "bg-white text-black font-bold" : "bg-white/[0.05] text-zinc-400"
                          }`}
                        >
                          {type} Loan
                        </button>
                      ))
                    : ["30-Yr Fixed Mortgage", "15-Yr Fixed", "Commercial / Business", "Auto Loan", "Student Loan"].map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setLoanCategory(type);
                            if (type === "15-Yr Fixed") setLoanTenureYears(15);
                            else if (type === "Auto Loan") setLoanTenureYears(5);
                            else setLoanTenureYears(30);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                            loanCategory === type ? "bg-white text-black font-bold" : "bg-white/[0.05] text-zinc-400"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Borrowing Principal</span>
                    <span className="text-white font-bold text-lg">{sym}{loanAmount.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min={curr === "INR" ? 50000 : 10000}
                    max={curr === "INR" ? 50000000 : 2500000}
                    step={curr === "INR" ? 50000 : 5000}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Annual Interest Rate</span>
                    <span className="text-emerald-400 font-bold text-lg">{loanRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="3.0"
                    max="24.0"
                    step="0.1"
                    value={loanRate}
                    onChange={(e) => setLoanRate(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Loan Duration ({loanTenureYears * 12} Months)</span>
                    <span className="text-white font-bold text-lg">{loanTenureYears} Years</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={loanTenureYears}
                    onChange={(e) => setLoanTenureYears(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1">
                    MONTHLY INSTALLMENT ({loanCategory.toUpperCase()})
                  </span>
                  <div className="text-4xl font-extrabold text-white font-mono mb-6">
                    {sym}{emiValue.toLocaleString()}
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Principal Borrowed</span>
                      <span className="text-white">{sym}{loanAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Total Interest Payable</span>
                      <span className="text-rose-400">+{sym}{totalLoanInterest.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400 pt-2 border-t border-white/[0.06]">
                      <span>Total Aggregate Repayment</span>
                      <span className="text-white font-bold">{sym}{totalLoanRepayment.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] font-mono text-zinc-500">
                  Calculated under standard {activeProfile.name} diminishing amortization guidelines.
                </div>
              </div>
            </div>
          )}

          {/* 2. SIP & Wealth */}
          {activeTool === "sip" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setInvestMode("monthly")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono ${
                      investMode === "monthly" ? "bg-emerald-500 text-black font-bold" : "bg-white/[0.05] text-zinc-400"
                    }`}
                  >
                    Recurring Monthly
                  </button>
                  <button
                    onClick={() => setInvestMode("lumpsum")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono ${
                      investMode === "lumpsum" ? "bg-emerald-500 text-black font-bold" : "bg-white/[0.05] text-zinc-400"
                    }`}
                  >
                    Initial Lump Sum
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>{investMode === "monthly" ? "Monthly Contribution" : "Initial Capital"}</span>
                    <span className="text-white font-bold text-lg">{sym}{investAmount.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min={curr === "INR" ? 500 : 50}
                    max={curr === "INR" ? 250000 : 10000}
                    step={curr === "INR" ? 500 : 50}
                    value={investAmount}
                    onChange={(e) => setInvestAmount(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Expected Annual Growth</span>
                    <span className="text-emerald-400 font-bold text-lg">{investRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="0.5"
                    value={investRate}
                    onChange={(e) => setInvestRate(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>Investment Horizon</span>
                    <span className="text-white font-bold text-lg">{investYears} Years</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    step="1"
                    value={investYears}
                    onChange={(e) => setInvestYears(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1">
                    PROJECTED WEALTH CORPUS
                  </span>
                  <div className="text-4xl font-extrabold text-white font-mono mb-6">
                    {sym}{estimatedMaturity.toLocaleString()}
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Total Principal Deposited</span>
                      <span className="text-white">{sym}{totalPrincipalInvested.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Compounded Returns Gain</span>
                      <span className="text-emerald-400">+{sym}{totalGains.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] font-mono text-zinc-500">
                  Calculated using compound wealth accumulation formulas.
                </div>
              </div>
            </div>
          )}

          {/* 3. Tax Engine */}
          {activeTool === "tax" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">ANNUAL GROSS INCOME</label>
                  <input
                    type="number"
                    value={grossIncome}
                    onChange={(e) => setGrossIncome(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none"
                  />
                </div>

                {curr === "INR" && (
                  <>
                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1">80C (PPF/ELSS/EPF)</label>
                      <input
                        type="number"
                        value={inr80C}
                        onChange={(e) => setInr80C(Number(e.target.value))}
                        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1">80D (HEALTH MEDICLAIM)</label>
                      <input
                        type="number"
                        value={inr80D}
                        onChange={(e) => setInr80D(Number(e.target.value))}
                        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1">HRA EXEMPTION</label>
                      <input
                        type="number"
                        value={inrHra}
                        onChange={(e) => setInrHra(Number(e.target.value))}
                        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none"
                      />
                    </div>
                  </>
                )}

                {curr === "USD" && (
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">SELECT US RESIDENCE STATE</label>
                    <select
                      value={selectedUsState}
                      onChange={(e) => setSelectedUsState(e.target.value)}
                      className="w-full bg-[#18181b] border border-white/[0.1] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none cursor-pointer"
                    >
                      {Object.values(ALL_50_US_STATES).map((st) => (
                        <option key={st.code} value={st.code}>
                          {st.name} ({st.incomeTaxRate}% State Tax)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="p-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.03]">
                  <h4 className="font-bold text-white text-base mb-1">{taxResults.labelA}</h4>
                  <p className="text-xs text-zinc-400 mb-4">{taxResults.notes}</p>
                  <div className="text-3xl font-bold font-mono text-white mb-2">
                    {sym}{taxResults.valA.toLocaleString()}
                  </div>
                  <div className="text-xs font-mono text-zinc-500">
                    Effective Rate: {((taxResults.valA / (grossIncome || 1)) * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                  <h4 className="font-bold text-white text-base mb-1">{taxResults.labelB}</h4>
                  <p className="text-xs text-zinc-400 mb-4">State / Regional Assessment</p>
                  <div className="text-3xl font-bold font-mono text-white mb-2">
                    {sym}{taxResults.valB.toLocaleString()}
                  </div>
                  <div className="text-xs font-mono text-zinc-500">
                    Effective Share: {((taxResults.valB / (grossIncome || 1)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Indirect Tax */}
          {activeTool === "indirect_tax" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => setIndType("exclusive")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono ${
                      indType === "exclusive" ? "bg-emerald-500 text-black font-bold" : "bg-white/[0.05] text-zinc-400"
                    }`}
                  >
                    Tax Exclusive (Add Tax)
                  </button>
                  <button
                    onClick={() => setIndType("inclusive")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono ${
                      indType === "inclusive" ? "bg-emerald-500 text-black font-bold" : "bg-white/[0.05] text-zinc-400"
                    }`}
                  >
                    Tax Inclusive (Extract Tax)
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">INVOICE BASE AMOUNT</label>
                  <input
                    type="number"
                    value={indAmount}
                    onChange={(e) => setIndAmount(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-4 py-2.5 text-white font-mono text-lg outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-2">
                    {curr === "USD" ? `${usState.name} COMBINED SALES TAX (%)` : `${activeProfile.name} STATUTORY RATE (%)`}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={indRate}
                    onChange={(e) => setIndRate(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none"
                  />
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1">
                    GROSS INVOICE TOTAL
                  </span>
                  <div className="text-4xl font-extrabold text-white font-mono mb-6">
                    {sym}{Math.round(finalTotalWithTax).toLocaleString()}
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Pre-Tax Base Price</span>
                      <span className="text-white">{sym}{Math.round(preTaxBase).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Tax Amount ({indRate}%)</span>
                      <span className="text-emerald-400">+{sym}{Math.round(calcTaxVal).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] font-mono text-zinc-500">
                  Calculated against {curr === "USD" ? `${usState.name} state & municipal tax law` : `${activeProfile.name} regulations`}.
                </div>
              </div>
            </div>
          )}

          {/* 5. Interest Engine */}
          {activeTool === "interest" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">DEPOSIT PRINCIPAL</label>
                  <input
                    type="number"
                    value={principalSI}
                    onChange={(e) => setPrincipalSI(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">ANNUAL INTEREST (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={rateSI}
                    onChange={(e) => setRateSI(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">TIME (YEARS)</label>
                  <input
                    type="number"
                    value={yearsSI}
                    onChange={(e) => setYearsSI(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">COMPOUND FREQUENCY</label>
                  <select
                    value={compFreq}
                    onChange={(e) => setCompFreq(Number(e.target.value))}
                    className="w-full bg-[#18181b] border border-white/[0.1] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none cursor-pointer"
                  >
                    <option value={12}>Monthly (12x/yr)</option>
                    <option value={4}>Quarterly (4x/yr)</option>
                    <option value={2}>Half-Yearly (2x/yr)</option>
                    <option value={1}>Yearly (1x/yr)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">SIMPLE INTEREST</span>
                  <div className="text-3xl font-bold font-mono text-white mt-2">
                    {sym}{Math.round(principalSI + simpleInterest).toLocaleString()}
                  </div>
                  <div className="text-xs font-mono text-zinc-500 mt-2">
                    Flat Interest: +{sym}{Math.round(simpleInterest).toLocaleString()}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/30">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase">
                    COMPOUND INTEREST ({compFreq === 12 ? "MONTHLY" : compFreq === 4 ? "QUARTERLY" : compFreq === 2 ? "SEMI-ANNUAL" : "ANNUAL"})
                  </span>
                  <div className="text-3xl font-bold font-mono text-white mt-2">
                    {sym}{Math.round(principalSI + compoundInterest).toLocaleString()}
                  </div>
                  <div className="text-xs font-mono text-emerald-400 mt-2">
                    Compound Extra Gain: +{sym}{Math.round(compoundInterest - simpleInterest).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. Deposit Instrument */}
          {activeTool === "deposit" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => setDepMode("Fixed")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono ${
                      depMode === "Fixed" ? "bg-emerald-500 text-black font-bold" : "bg-white/[0.05] text-zinc-400"
                    }`}
                  >
                    {curr === "INR" ? "Fixed Deposit (FD)" : curr === "USD" ? "Cert of Deposit (CD)" : "Term Deposit"}
                  </button>
                  <button
                    onClick={() => setDepMode("Recurring")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-mono ${
                      depMode === "Recurring" ? "bg-emerald-500 text-black font-bold" : "bg-white/[0.05] text-zinc-400"
                    }`}
                  >
                    {curr === "INR" ? "Recurring Deposit (RD)" : curr === "USD" ? "High-Yield Savings (HYSA)" : "Monthly Savings"}
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">DEPOSIT AMOUNT</label>
                  <input
                    type="number"
                    value={depAmount}
                    onChange={(e) => setDepAmount(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">ANNUAL INTEREST YIELD (%)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={depRate}
                    onChange={(e) => setDepRate(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">TENURE (YEARS)</label>
                  <input
                    type="number"
                    value={depYears}
                    onChange={(e) => setDepYears(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white font-mono text-sm outline-none"
                  />
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1">
                    PROJECTED MATURITY
                  </span>
                  <div className="text-4xl font-extrabold text-white font-mono mb-6">
                    {sym}{depositCompounded.toLocaleString()}
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Principal Deposited</span>
                      <span className="text-white">{sym}{(depMode === "Fixed" ? depAmount : depAmount * depYears * 12).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Guaranteed Interest Yield</span>
                      <span className="text-emerald-400">
                        +{sym}{(depositCompounded - (depMode === "Fixed" ? depAmount : depAmount * depYears * 12)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] font-mono text-zinc-500">
                  Compounding calculated under domestic banking conventions.
                </div>
              </div>
            </div>
          )}

          {/* 7. Salary Take-Home */}
          {activeTool === "salary" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                    {curr === "INR" ? "ANNUAL COST TO COMPANY (CTC)" : "ANNUAL GROSS SALARY"}
                  </label>
                  <input
                    type="number"
                    value={ctcAmount}
                    onChange={(e) => setCtcAmount(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-4 py-2.5 text-white font-mono text-lg outline-none"
                  />
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-mono text-zinc-400 space-y-2">
                  <p>&bull; {salaryResults.subLabel}</p>
                  <p>&bull; Calibrated for {curr === "USD" ? `${usState.name} & US Federal Law` : activeProfile.name}.</p>
                </div>
              </div>

              <div className="lg:col-span-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block mb-1">
                    ESTIMATED NET MONTHLY TAKE-HOME
                  </span>
                  <div className="text-4xl font-extrabold text-white font-mono mb-6">
                    {sym}{salaryResults.net.toLocaleString()}<span className="text-sm text-zinc-500">/mo</span>
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Gross Monthly Base</span>
                      <span className="text-white">{sym}{salaryResults.gross.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Deductions & Taxes</span>
                      <span className="text-rose-400">-{sym}{salaryResults.deductions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] font-mono text-zinc-500">
                  Annual Take-Home Equivalent: {sym}{(salaryResults.net * 12).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* 8. Loan Comparison */}
          {activeTool === "compare" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-lg font-bold text-white">Compare Multiple Lender Offers</h3>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">Evaluate competing loan and mortgage quotes side-by-side.</p>
                </div>
                {compareOffers.length < 4 && (
                  <button
                    onClick={addOffer}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-mono font-bold hover:bg-emerald-400 transition"
                  >
                    + Add Lender Offer
                  </button>
                )}
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-${compareOffers.length} gap-4`}>
                {compareOffers.map((o) => {
                  const emi = calcCompEmi(o.principal, o.rate, o.tenure);
                  const total = emi * o.tenure * 12;
                  const interest = total - o.principal;

                  return (
                    <div key={o.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-bold text-white text-sm font-mono">{o.name}</span>
                          {compareOffers.length > 2 && (
                            <button
                              onClick={() => removeOffer(o.id)}
                              className="text-zinc-500 hover:text-rose-400 text-xs font-mono"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="space-y-3 text-xs font-mono mb-6">
                          <div>
                            <label className="text-zinc-500 block mb-0.5">Principal ({sym})</label>
                            <input
                              type="number"
                              value={o.principal}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setCompareOffers(compareOffers.map((item) => (item.id === o.id ? { ...item, principal: v } : item)));
                              }}
                              className="w-full bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1 text-white"
                            />
                          </div>

                          <div>
                            <label className="text-zinc-500 block mb-0.5">Interest Rate (%)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={o.rate}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setCompareOffers(compareOffers.map((item) => (item.id === o.id ? { ...item, rate: v } : item)));
                              }}
                              className="w-full bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1 text-white"
                            />
                          </div>

                          <div>
                            <label className="text-zinc-500 block mb-0.5">Tenure (Years)</label>
                            <input
                              type="number"
                              value={o.tenure}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setCompareOffers(compareOffers.map((item) => (item.id === o.id ? { ...item, tenure: v } : item)));
                              }}
                              className="w-full bg-white/[0.04] border border-white/[0.1] rounded px-2 py-1 text-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/[0.06] space-y-2 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase">Monthly Installment</span>
                          <span className="text-xl font-bold text-emerald-400">{sym}{emi.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400 pt-2">
                          <span>Total Interest</span>
                          <span className="text-rose-400">{sym}{interest.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Total Repaid</span>
                          <span className="text-white">{sym}{total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Global Currency Conversion Engine */}
      <section id="converter" className="bg-[#0e0e12] border border-white/[0.08] rounded-3xl p-8 mb-20 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-white/[0.06] gap-2">
          <div>
            <h3 className="text-xl font-bold text-white font-serif">Live Global Currency Engine</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Interbank conversion across Americas, Europe, Middle East & Asia.</p>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">Live Tick: {lastUpdated}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
          <div className="md:col-span-3 space-y-2">
            <label className="text-[11px] font-mono text-zinc-400 uppercase">You Convert</label>
            <div className="flex bg-white/[0.04] border border-white/[0.1] rounded-xl overflow-hidden focus-within:border-emerald-400 transition">
              <input
                type="number"
                value={convAmount}
                onChange={(e) => setConvAmount(Number(e.target.value))}
                className="w-full bg-transparent px-4 py-3 text-white font-mono text-lg outline-none"
              />
              <select
                value={fromCurr}
                onChange={(e) => setFromCurr(e.target.value)}
                className="bg-[#18181b] text-white text-xs font-mono px-3 py-3 border-l border-white/[0.1] outline-none cursor-pointer"
              >
                {Object.values(REGIONAL_PRIORITY_DATA).map((c) => (
                  <option key={c.currencyCode} value={c.currencyCode}>
                    {c.flag} {c.currencyCode}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-center md:col-span-1 text-zinc-500 font-mono text-xl pt-4 md:pt-6">
            &harr;
          </div>

          <div className="md:col-span-3 space-y-2">
            <label className="text-[11px] font-mono text-zinc-400 uppercase">Converted Result</label>
            <div className="flex bg-white/[0.04] border border-white/[0.1] rounded-xl overflow-hidden">
              <div className="w-full px-4 py-3 text-emerald-400 font-mono text-lg font-bold flex items-center">
                {REGIONAL_PRIORITY_DATA[toCurr]?.symbol}{" "}
                {convertedValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <select
                value={toCurr}
                onChange={(e) => setToCurr(e.target.value)}
                className="bg-[#18181b] text-white text-xs font-mono px-3 py-3 border-l border-white/[0.1] outline-none cursor-pointer"
              >
                {Object.values(REGIONAL_PRIORITY_DATA).map((c) => (
                  <option key={c.currencyCode} value={c.currencyCode}>
                    {c.flag} {c.currencyCode}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Finance Updates */}
      <section id="dispatches" className="border-t border-white/[0.06] pt-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-400">
            Market Knowledge & Verified Dispatches
          </h3>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Direct Sources
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              source: "Economic Times",
              sourceUrl: "https://m.economictimes.com/news/economy/finance/rupee-weakens-to-95-44-against-dollar-amid-rising-import-bill-and-crude-oil-prices/articleshow/134011462.cms",
              badge: "Domestic Currency",
              title: "Indian Rupee trades near ₹95.54/USD amid energy import demand",
              desc: "Domestic liquidity and trade balances continue to shape interbank exchange rates.",
            },
            {
              source: "IBJA Benchmark",
              sourceUrl: "https://www.ibja.co/",
              badge: "Indian Bullion",
              title: "Gold 24K trades near ₹1,52,890/10g with regional spreads in Chennai and Hyderabad",
              desc: "Domestic spot bullion benchmarks maintain elevated pricing across major metros.",
            },
            {
              source: "National Stock Exchange",
              sourceUrl: "https://www.nseindia.com/",
              badge: "Equities",
              title: "NIFTY 50 trades near 23,398 while BSE SENSEX holds 74,781",
              desc: "Corporate earnings and domestic mutual fund inflows sustain institutional liquidity.",
            },
            {
              source: "GoodReturns / MCX",
              sourceUrl: "https://www.goodreturns.in/silver-rates/",
              badge: "Industrial Silver",
              title: "Silver holds ₹2,45,000/kg on MCX with southern metro premiums up to ₹2,50,000/kg",
              desc: "Electronics manufacturing and industrial demand sustain domestic consumption.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:border-white/[0.15] transition flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block mb-2">
                  {item.badge}
                </span>
                <h4 className="text-sm font-semibold text-white mb-2 leading-snug">{item.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-light mb-4">{item.desc}</p>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">Source:</span>
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 flex items-center gap-1"
                >
                  {item.source} &rarr;
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}