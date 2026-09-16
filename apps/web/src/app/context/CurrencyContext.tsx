"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// --- Complete 50-State + DC US Tax Matrix ---
export interface USStateConfig {
  code: string;
  name: string;
  incomeTaxRate: number;
  salesTaxRate: number;
}

export const ALL_50_US_STATES: Record<string, USStateConfig> = {
  AL: { code: "AL", name: "Alabama", incomeTaxRate: 5.0, salesTaxRate: 9.29 },
  AK: { code: "AK", name: "Alaska", incomeTaxRate: 0.0, salesTaxRate: 1.82 },
  AZ: { code: "AZ", name: "Arizona", incomeTaxRate: 2.5, salesTaxRate: 8.37 },
  AR: { code: "AR", name: "Arkansas", incomeTaxRate: 4.4, salesTaxRate: 9.47 },
  CA: { code: "CA", name: "California", incomeTaxRate: 9.3, salesTaxRate: 8.85 },
  CO: { code: "CO", name: "Colorado", incomeTaxRate: 4.4, salesTaxRate: 7.81 },
  CT: { code: "CT", name: "Connecticut", incomeTaxRate: 6.99, salesTaxRate: 6.35 },
  DE: { code: "DE", name: "Delaware", incomeTaxRate: 6.6, salesTaxRate: 0.0 },
  DC: { code: "DC", name: "District of Columbia", incomeTaxRate: 8.5, salesTaxRate: 6.0 },
  FL: { code: "FL", name: "Florida", incomeTaxRate: 0.0, salesTaxRate: 7.02 },
  GA: { code: "GA", name: "Georgia", incomeTaxRate: 5.49, salesTaxRate: 7.38 },
  HI: { code: "HI", name: "Hawaii", incomeTaxRate: 8.25, salesTaxRate: 4.5 },
  ID: { code: "ID", name: "Idaho", incomeTaxRate: 5.695, salesTaxRate: 6.03 },
  IL: { code: "IL", name: "Illinois", incomeTaxRate: 4.95, salesTaxRate: 8.86 },
  IN: { code: "IN", name: "Indiana", incomeTaxRate: 3.05, salesTaxRate: 7.0 },
  IA: { code: "IA", name: "Iowa", incomeTaxRate: 5.7, salesTaxRate: 6.94 },
  KS: { code: "KS", name: "Kansas", incomeTaxRate: 5.7, salesTaxRate: 8.75 },
  KY: { code: "KY", name: "Kentucky", incomeTaxRate: 4.0, salesTaxRate: 6.0 },
  LA: { code: "LA", name: "Louisiana", incomeTaxRate: 4.25, salesTaxRate: 9.56 },
  ME: { code: "ME", name: "Maine", incomeTaxRate: 7.15, salesTaxRate: 5.5 },
  MD: { code: "MD", name: "Maryland", incomeTaxRate: 5.75, salesTaxRate: 6.0 },
  MA: { code: "MA", name: "Massachusetts", incomeTaxRate: 5.0, salesTaxRate: 6.25 },
  MI: { code: "MI", name: "Michigan", incomeTaxRate: 4.25, salesTaxRate: 6.0 },
  MN: { code: "MN", name: "Minnesota", incomeTaxRate: 7.85, salesTaxRate: 7.52 },
  MS: { code: "MS", name: "Mississippi", incomeTaxRate: 4.7, salesTaxRate: 7.07 },
  MO: { code: "MO", name: "Missouri", incomeTaxRate: 4.8, salesTaxRate: 8.39 },
  MT: { code: "MT", name: "Montana", incomeTaxRate: 5.9, salesTaxRate: 0.0 },
  NE: { code: "NE", name: "Nebraska", incomeTaxRate: 5.84, salesTaxRate: 6.97 },
  NV: { code: "NV", name: "Nevada", incomeTaxRate: 0.0, salesTaxRate: 8.24 },
  NH: { code: "NH", name: "New Hampshire", incomeTaxRate: 0.0, salesTaxRate: 0.0 },
  NJ: { code: "NJ", name: "New Jersey", incomeTaxRate: 6.37, salesTaxRate: 6.6 },
  NM: { code: "NM", name: "New Mexico", incomeTaxRate: 4.9, salesTaxRate: 7.72 },
  NY: { code: "NY", name: "New York", incomeTaxRate: 6.85, salesTaxRate: 8.53 },
  NC: { code: "NC", name: "North Carolina", incomeTaxRate: 4.5, salesTaxRate: 7.0 },
  ND: { code: "ND", name: "North Dakota", incomeTaxRate: 1.95, salesTaxRate: 7.04 },
  OH: { code: "OH", name: "Ohio", incomeTaxRate: 3.5, salesTaxRate: 7.24 },
  OK: { code: "OK", name: "Oklahoma", incomeTaxRate: 4.75, salesTaxRate: 8.99 },
  OR: { code: "OR", name: "Oregon", incomeTaxRate: 8.75, salesTaxRate: 0.0 },
  PA: { code: "PA", name: "Pennsylvania", incomeTaxRate: 3.07, salesTaxRate: 6.34 },
  RI: { code: "RI", name: "Rhode Island", incomeTaxRate: 5.99, salesTaxRate: 7.0 },
  SC: { code: "SC", name: "South Carolina", incomeTaxRate: 6.4, salesTaxRate: 7.44 },
  SD: { code: "SD", name: "South Dakota", incomeTaxRate: 0.0, salesTaxRate: 6.4 },
  TN: { code: "TN", name: "Tennessee", incomeTaxRate: 0.0, salesTaxRate: 9.55 },
  TX: { code: "TX", name: "Texas", incomeTaxRate: 0.0, salesTaxRate: 8.25 },
  UT: { code: "UT", name: "Utah", incomeTaxRate: 4.65, salesTaxRate: 7.25 },
  VT: { code: "VT", name: "Vermont", incomeTaxRate: 8.75, salesTaxRate: 6.36 },
  VA: { code: "VA", name: "Virginia", incomeTaxRate: 5.75, salesTaxRate: 5.77 },
  WA: { code: "WA", name: "Washington", incomeTaxRate: 0.0, salesTaxRate: 9.38 },
  WV: { code: "WV", name: "West Virginia", incomeTaxRate: 5.12, salesTaxRate: 6.57 },
  WI: { code: "WI", name: "Wisconsin", incomeTaxRate: 5.3, salesTaxRate: 5.43 },
  WY: { code: "WY", name: "Wyoming", incomeTaxRate: 0.0, salesTaxRate: 5.44 },
};

// --- Indian Metropolitan City Freight / Bullion Spreads ---
export interface CitySpread {
  name: string;
  goldPremiumPer10g: number;
  silverPremiumPerKg: number;
}

export const INDIAN_CITIES: Record<string, CitySpread> = {
  Chennai: { name: "Chennai", goldPremiumPer10g: 250, silverPremiumPerKg: 5000 },
  Mumbai: { name: "Mumbai (IBJA Base)", goldPremiumPer10g: 0, silverPremiumPerKg: 0 },
  Delhi: { name: "Delhi NCR", goldPremiumPer10g: 150, silverPremiumPerKg: 400 },
  Bengaluru: { name: "Bengaluru", goldPremiumPer10g: 180, silverPremiumPerKg: 600 },
  Hyderabad: { name: "Hyderabad", goldPremiumPer10g: 220, silverPremiumPerKg: 5000 },
  Kolkata: { name: "Kolkata", goldPremiumPer10g: 140, silverPremiumPerKg: 300 },
};

export interface HistoryPoint {
  era: string;
  year: number;
  numericValue: number;
  priceFormatted: string;
}

export interface PriorityAsset {
  id: string;
  name: string;
  category: string;
  unit: string;
  basePrice: number;
  symbol: string;
  changePct: number;
  sourceAuthority: string;
  sourceUrl: string;
  taxNote: string;
  history: HistoryPoint[];
}

export interface CountryPriorityProfile {
  currencyCode: string;
  name: string;
  symbol: string;
  flag: string;
  headlinePriority: string;
  primaryExchange: string;
  priorityAssets: PriorityAsset[];
}

export const REGIONAL_PRIORITY_DATA: Record<string, CountryPriorityProfile> = {
  INR: {
    currencyCode: "INR",
    name: "India",
    symbol: "₹",
    flag: "🇮🇳",
    headlinePriority: "Gold 24K/22K, Silver, NIFTY 50 & Domestic Fixed Deposits",
    primaryExchange: "NSE, BSE & IBJA",
    priorityAssets: [
      {
        id: "in_gold",
        name: "Gold (24K Pure)",
        category: "Precious Metals",
        unit: "10 grams",
        basePrice: 152890,
        symbol: "₹",
        changePct: 0.42,
        sourceAuthority: "India Bullion and Jewellers Association (IBJA)",
        sourceUrl: "https://www.ibja.co/",
        taxNote: "+3% GST & Standard Domestic Making Charges",
        history: [
          { era: "Post-Independence", year: 1950, numericValue: 63.25, priceFormatted: "₹63 / 10g" },
          { era: "Gold Control Repeal", year: 1990, numericValue: 3200, priceFormatted: "₹3,200 / 10g" },
          { era: "Millennium", year: 2000, numericValue: 4400, priceFormatted: "₹4,400 / 10g" },
          { era: "Financial Crisis", year: 2010, numericValue: 18500, priceFormatted: "₹18,500 / 10g" },
          { era: "Pre-Pandemic", year: 2019, numericValue: 35220, priceFormatted: "₹35,220 / 10g" },
          { era: "Current Benchmark", year: 2026, numericValue: 152890, priceFormatted: "₹1,52,890 / 10g" },
        ],
      },
      {
        id: "in_silver",
        name: "Silver (Fine 999)",
        category: "Precious Metals",
        unit: "1 Kilogram",
        basePrice: 245000,
        symbol: "₹",
        changePct: 0.85,
        sourceAuthority: "MCX India Spot Bullion",
        sourceUrl: "https://www.mcxindia.com/",
        taxNote: "+3% GST on Bullion Bars",
        history: [
          { era: "Historical Base", year: 1970, numericValue: 1200, priceFormatted: "₹1,200 / kg" },
          { era: "Millennium", year: 2000, numericValue: 7900, priceFormatted: "₹7,900 / kg" },
          { era: "Bullion Run", year: 2011, numericValue: 65000, priceFormatted: "₹65,000 / kg" },
          { era: "Pandemic Cycle", year: 2020, numericValue: 63435, priceFormatted: "₹63,435 / kg" },
          { era: "Current Benchmark", year: 2026, numericValue: 245000, priceFormatted: "₹2,45,000 / kg" },
        ],
      },
      {
        id: "in_nifty",
        name: "NIFTY 50",
        category: "Equities Benchmark",
        unit: "Index Points",
        basePrice: 23398.1,
        symbol: "",
        changePct: -0.34,
        sourceAuthority: "National Stock Exchange of India",
        sourceUrl: "https://www.nseindia.com/",
        taxNote: "STCG 20% / LTCG 12.5%",
        history: [
          { era: "Inception Base (1000)", year: 1995, numericValue: 1000, priceFormatted: "1,000.00 pts" },
          { era: "Dot-Com Peak", year: 2000, numericValue: 1263.55, priceFormatted: "1,263.55 pts" },
          { era: "Modi Bull Cycle", year: 2014, numericValue: 8200, priceFormatted: "8,200.00 pts" },
          { era: "Post-Pandemic Rally", year: 2021, numericValue: 17350, priceFormatted: "17,350.00 pts" },
          { era: "Current Benchmark", year: 2026, numericValue: 23398.1, priceFormatted: "23,398.10 pts" },
        ],
      },
      {
        id: "in_sensex",
        name: "BSE SENSEX",
        category: "Equities Benchmark",
        unit: "Index Points",
        basePrice: 74781.76,
        symbol: "",
        changePct: -0.16,
        sourceAuthority: "Bombay Stock Exchange",
        sourceUrl: "https://www.bseindia.com/",
        taxNote: "STCG 20% / LTCG 12.5%",
        history: [
          { era: "Base Year (100)", year: 1979, numericValue: 100, priceFormatted: "100.00 pts" },
          { era: "Harshad Mehta Peak", year: 1992, numericValue: 4467, priceFormatted: "4,467.00 pts" },
          { era: "Millennium", year: 2000, numericValue: 3972.12, priceFormatted: "3,972.12 pts" },
          { era: "Milestone 50k", year: 2021, numericValue: 50000, priceFormatted: "50,000.00 pts" },
          { era: "Current Benchmark", year: 2026, numericValue: 74781.76, priceFormatted: "74,781.76 pts" },
        ],
      },
    ],
  },
  USD: {
    currencyCode: "USD",
    name: "United States",
    symbol: "$",
    flag: "🇺🇸",
    headlinePriority: "S&P 500, NASDAQ 100, Bitcoin (BTC) & 30-Year Mortgages",
    primaryExchange: "NYSE, NASDAQ & CBOE",
    priorityAssets: [
      {
        id: "us_sp500",
        name: "S&P 500",
        category: "Core Index",
        unit: "Index Points",
        basePrice: 5882.3,
        symbol: "",
        changePct: 0.31,
        sourceAuthority: "S&P Dow Jones Indices",
        sourceUrl: "https://www.spglobal.com/spdji/en/indices/equity/sp-500/",
        taxNote: "Federal Long-Term Cap Gains (0%/15%/20%)",
        history: [
          { era: "Inception Base (10)", year: 1957, numericValue: 10, priceFormatted: "10.00 pts" },
          { era: "Dot-Com Peak", year: 2000, numericValue: 1469.25, priceFormatted: "1,469.25 pts" },
          { era: "GFC Low", year: 2009, numericValue: 676.53, priceFormatted: "676.53 pts" },
          { era: "Pandemic Peak", year: 2021, numericValue: 4766.18, priceFormatted: "4,766.18 pts" },
          { era: "Current Benchmark", year: 2026, numericValue: 5882.3, priceFormatted: "5,882.30 pts" },
        ],
      },
      {
        id: "us_nasdaq",
        name: "NASDAQ 100",
        category: "Technology Index",
        unit: "Index Points",
        basePrice: 20612.8,
        symbol: "",
        changePct: 0.45,
        sourceAuthority: "Nasdaq Global Market Data",
        sourceUrl: "https://www.nasdaq.com/market-activity/indexes/ndx",
        taxNote: "Federal Long-Term Cap Gains",
        history: [
          { era: "Base Year", year: 1985, numericValue: 250, priceFormatted: "250.00 pts" },
          { era: "Dot-Com Crash", year: 2002, numericValue: 800, priceFormatted: "800.00 pts" },
          { era: "Tech Expansion", year: 2020, numericValue: 12888, priceFormatted: "12,888.00 pts" },
          { era: "Current Benchmark", year: 2026, numericValue: 20612.8, priceFormatted: "20,612.80 pts" },
        ],
      },
      {
        id: "us_btc",
        name: "Bitcoin (BTC/USD)",
        category: "Digital Asset",
        unit: "1 Bitcoin",
        basePrice: 94250.0,
        symbol: "$",
        changePct: 1.62,
        sourceAuthority: "CME Crypto Futures Benchmark",
        sourceUrl: "https://www.cmegroup.com/markets/cryptocurrencies.html",
        taxNote: "IRS Property / Capital Gains Tax",
        history: [
          { era: "Genesis Block", year: 2009, numericValue: 0.01, priceFormatted: "$0.01" },
          { era: "First Halving Run", year: 2013, numericValue: 1150, priceFormatted: "$1,150.00" },
          { era: "Institutional Wave", year: 2021, numericValue: 68789, priceFormatted: "$68,789.00" },
          { era: "Current Benchmark", year: 2026, numericValue: 94250, priceFormatted: "$94,250.00" },
        ],
      },
      {
        id: "us_mortgage",
        name: "30-Year Fixed Mortgage",
        category: "Interest Benchmark",
        unit: "Average APR %",
        basePrice: 6.42,
        symbol: "",
        changePct: -0.05,
        sourceAuthority: "Freddie Mac Primary Mortgage Market Survey (PMMS)",
        sourceUrl: "https://www.freddiemac.com/pmms",
        taxNote: "Itemized Mortgage Interest Deduction",
        history: [
          { era: "Volcker Fed Peak", year: 1981, numericValue: 18.63, priceFormatted: "18.63% APR" },
          { era: "Subprime Boom", year: 2006, numericValue: 6.41, priceFormatted: "6.41% APR" },
          { era: "All-Time Lows", year: 2021, numericValue: 2.65, priceFormatted: "2.65% APR" },
          { era: "Current Benchmark", year: 2026, numericValue: 6.42, priceFormatted: "6.42% APR" },
        ],
      },
    ],
  },
  EUR: {
    currencyCode: "EUR",
    name: "European Union",
    symbol: "€",
    flag: "🇪🇺",
    headlinePriority: "EURO STOXX 50, DAX 40, Euribor Rates & EU Gold",
    primaryExchange: "Deutsche Börse & Euronext",
    priorityAssets: [
      {
        id: "eu_stoxx",
        name: "EURO STOXX 50",
        category: "Eurozone Equities",
        unit: "Index Points",
        basePrice: 4945.2,
        symbol: "",
        changePct: 0.43,
        sourceAuthority: "STOXX Ltd (Deutsche Börse Group)",
        sourceUrl: "https://www.stoxx.com/",
        taxNote: "National Dividend Withholding",
        history: [
          { era: "Base Year", year: 1998, numericValue: 1000, priceFormatted: "1,000.00 pts" },
          { era: "Euro Debut", year: 2000, numericValue: 5400, priceFormatted: "5,400.00 pts" },
          { era: "Sovereign Debt Crisis", year: 2012, numericValue: 2100, priceFormatted: "2,100.00 pts" },
          { era: "Current Benchmark", year: 2026, numericValue: 4945.2, priceFormatted: "4,945.20 pts" },
        ],
      },
      {
        id: "eu_dax",
        name: "DAX 40",
        category: "German Industrial",
        unit: "Index Points",
        basePrice: 18620.5,
        symbol: "",
        changePct: 0.35,
        sourceAuthority: "Frankfurt Stock Exchange",
        sourceUrl: "https://www.boerse-frankfurt.de/",
        taxNote: "Abgeltungsteuer (25%)",
        history: [
          { era: "Inception Base (1000)", year: 1988, numericValue: 1000, priceFormatted: "1,000.00 pts" },
          { era: "Industrial Boom", year: 2015, numericValue: 10500, priceFormatted: "10,500.00 pts" },
          { era: "Current Benchmark", year: 2026, numericValue: 18620.5, priceFormatted: "18,620.50 pts" },
        ],
      },
      {
        id: "eu_euribor",
        name: "3-Month Euribor Rate",
        category: "ECB Interbank",
        unit: "Benchmark %",
        basePrice: 3.22,
        symbol: "",
        changePct: -0.02,
        sourceAuthority: "European Money Markets Institute (EMMI)",
        sourceUrl: "https://www.emmi-benchmarks.eu/",
        taxNote: "Euribor Variable Margin Standard",
        history: [
          { era: "Euro Introduction", year: 1999, numericValue: 3.2, priceFormatted: "3.20%" },
          { era: "Negative Rate Regime", year: 2020, numericValue: -0.5, priceFormatted: "-0.50%" },
          { era: "Rate Normalization", year: 2023, numericValue: 3.95, priceFormatted: "3.95%" },
          { era: "Current Benchmark", year: 2026, numericValue: 3.22, priceFormatted: "3.22%" },
        ],
      },
      {
        id: "eu_gold",
        name: "Gold Spot (€/oz)",
        category: "Precious Metals",
        unit: "1 Troy Ounce",
        basePrice: 4004.2,
        symbol: "€",
        changePct: 0.28,
        sourceAuthority: "Euronext Paris Bullion",
        sourceUrl: "https://www.euronext.com/",
        taxNote: "EU Directive 98/80/EC VAT-Exempt",
        history: [
          { era: "Euro Inception", year: 1999, numericValue: 250, priceFormatted: "€250.00 / oz" },
          { era: "Debt Crisis", year: 2012, numericValue: 1350, priceFormatted: "€1,350.00 / oz" },
          { era: "Current Benchmark", year: 2026, numericValue: 4004.2, priceFormatted: "€4,004.20 / oz" },
        ],
      },
    ],
  },
  GBP: {
    currencyCode: "GBP",
    name: "United Kingdom",
    symbol: "£",
    flag: "🇬🇧",
    headlinePriority: "FTSE 100, London Gold, UK 10Y Gilts & Cash ISAs",
    primaryExchange: "London Stock Exchange (LSE) & LBMA",
    priorityAssets: [
      {
        id: "uk_ftse",
        name: "FTSE 100",
        category: "UK Top 100",
        unit: "Index Points",
        basePrice: 8325.6,
        symbol: "",
        changePct: 0.15,
        sourceAuthority: "FTSE Russell / LSE",
        sourceUrl: "https://www.lseg.com/en/ftse-russell",
        taxNote: "ISA Shelter / Capital Gains Tax",
        history: [
          { era: "Base Year (1000)", year: 1984, numericValue: 1000, priceFormatted: "1,000.00 pts" },
          { era: "Millennium", year: 2000, numericValue: 6930, priceFormatted: "6,930.00 pts" },
          { era: "Current Benchmark", year: 2026, numericValue: 8325.6, priceFormatted: "8,325.60 pts" },
        ],
      },
      {
        id: "uk_gold",
        name: "Gold Spot (£/oz)",
        category: "London Bullion",
        unit: "1 Troy Ounce",
        basePrice: 3408.5,
        symbol: "£",
        changePct: 0.32,
        sourceAuthority: "London Bullion Market Association (LBMA)",
        sourceUrl: "https://www.lbma.org.uk/",
        taxNote: "VAT Exempt / CGT Exempt on British Sovereigns",
        history: [
          { era: "Historical", year: 1975, numericValue: 75, priceFormatted: "£75.00 / oz" },
          { era: "Millennium", year: 2000, numericValue: 185, priceFormatted: "£185.00 / oz" },
          { era: "Current Benchmark", year: 2026, numericValue: 3408.5, priceFormatted: "£3,408.50 / oz" },
        ],
      },
      {
        id: "uk_gilt",
        name: "UK 10-Year Gilt Yield",
        category: "Sovereign Debt",
        unit: "Yield %",
        basePrice: 4.12,
        symbol: "",
        changePct: -0.03,
        sourceAuthority: "UK Debt Management Office (DMO)",
        sourceUrl: "https://www.dmo.gov.uk/",
        taxNote: "Exempt from UK Capital Gains Tax",
        history: [
          { era: "Black Wednesday", year: 1992, numericValue: 9.2, priceFormatted: "9.20%" },
          { era: "ZIRP Era", year: 2020, numericValue: 0.2, priceFormatted: "0.20%" },
          { era: "Current Benchmark", year: 2026, numericValue: 4.12, priceFormatted: "4.12%" },
        ],
      },
      {
        id: "uk_isa",
        name: "Top Fixed Cash ISA",
        category: "Tax-Free Savings",
        unit: "AER %",
        basePrice: 4.85,
        symbol: "",
        changePct: 0.0,
        sourceAuthority: "Bank of England Benchmark Database",
        sourceUrl: "https://www.bankofengland.co.uk/",
        taxNote: "100% Tax-Free up to £20,000/yr",
        history: [
          { era: "Pre-GFC", year: 2007, numericValue: 6.25, priceFormatted: "6.25%" },
          { era: "Ultra-Low Era", year: 2021, numericValue: 0.55, priceFormatted: "0.55%" },
          { era: "Current Benchmark", year: 2026, numericValue: 4.85, priceFormatted: "4.85%" },
        ],
      },
    ],
  },
};

export interface CurrencyContextType {
  baseCurrency: string;
  setBaseCurrency: (c: string) => void;
  selectedUsState: string;
  setSelectedUsState: (st: string) => void;
  selectedIndianCity: string;
  setSelectedIndianCity: (city: string) => void;
  rates: Record<string, number>;
  activeProfile: CountryPriorityProfile;
  lastUpdated: string;
  isSyncing: boolean;
  manualRefresh: () => void;
  convert: (amount: number, fromCurr: string, toCurr: string) => number;
  formatMoney: (amount: number) => string;
  region: string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  baseCurrency: "INR",
  setBaseCurrency: () => {},
  selectedUsState: "TX",
  setSelectedUsState: () => {},
  selectedIndianCity: "Mumbai",
  setSelectedIndianCity: () => {},
  rates: {},
  activeProfile: REGIONAL_PRIORITY_DATA["INR"],
  lastUpdated: "Live",
  isSyncing: false,
  manualRefresh: () => {},
  convert: () => 0,
  formatMoney: () => "",
  region: "INR",
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [baseCurrency, setBaseCurrency] = useState<string>("INR");
  const [selectedUsState, setSelectedUsState] = useState<string>("TX");
  const [selectedIndianCity, setSelectedIndianCity] = useState<string>("Mumbai");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [rates, setRates] = useState<Record<string, number>>({
    USD: 1,
    INR: 95.545,
    EUR: 0.921,
    GBP: 0.784,
    CAD: 1.382,
    AUD: 1.538,
    AED: 3.6725,
    SAR: 3.751,
  });

  const [lastUpdated, setLastUpdated] = useState<string>("Synced Live");
  const activeProfile = REGIONAL_PRIORITY_DATA[baseCurrency] || REGIONAL_PRIORITY_DATA["INR"];

  const syncForex = useCallback(async () => {
    setIsSyncing(true);
    const ts = Date.now();
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/USD?_t=${ts}`, { cache: "no-store" });
      const data = await res.json();
      if (data?.rates) {
        setRates((prev) => ({
          ...prev,
          ...data.rates,
          INR: data.rates.INR && data.rates.INR > 90 ? data.rates.INR : 95.545,
        }));
      }
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      // Retain state
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    syncForex();
    const interval = setInterval(syncForex, 10000);
    return () => clearInterval(interval);
  }, [syncForex]);

  const convert = (amount: number, from: string, to: string): number => {
    const rateFrom = rates[from] || 1;
    const rateTo = rates[to] || 1;
    return (amount / rateFrom) * rateTo;
  };

  const formatMoney = (amount: number): string => {
    return `${activeProfile.symbol}${amount > 100 ? Math.round(amount).toLocaleString() : amount.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        baseCurrency,
        setBaseCurrency,
        selectedUsState,
        setSelectedUsState,
        selectedIndianCity,
        setSelectedIndianCity,
        rates,
        activeProfile,
        lastUpdated,
        isSyncing,
        manualRefresh: syncForex,
        convert,
        formatMoney,
        region: baseCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);