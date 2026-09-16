import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CurrencyProvider } from "../src/app/context/CurrencyContext";
import Home from "../src/app/page";

describe("Finealth Homepage Component & Prioritization UI", () => {
  it("renders priority asset titles for default India (INR) jurisdiction", () => {
    render(
      <CurrencyProvider>
        <Home />
      </CurrencyProvider>
    );

    // Using getAllByText since titles appear in both priority cards & historical charts
    const goldElements = screen.getAllByText(/Gold \(24K Pure\)/i);
    expect(goldElements.length).toBeGreaterThanOrEqual(1);
    expect(goldElements[0]).toBeInTheDocument();

    const silverElements = screen.getAllByText(/Silver \(Fine 999\)/i);
    expect(silverElements.length).toBeGreaterThanOrEqual(1);
    expect(silverElements[0]).toBeInTheDocument();

    const niftyElements = screen.getAllByText(/NIFTY 50/i);
    expect(niftyElements.length).toBeGreaterThanOrEqual(1);
    expect(niftyElements[0]).toBeInTheDocument();

    const sensexElements = screen.getAllByText(/BSE SENSEX/i);
    expect(sensexElements.length).toBeGreaterThanOrEqual(1);
    expect(sensexElements[0]).toBeInTheDocument();
  });

  it("renders all 8 calculation engine tab options", () => {
    render(
      <CurrencyProvider>
        <Home />
      </CurrencyProvider>
    );

    expect(screen.getByText("Loan EMI")).toBeInTheDocument();
    expect(screen.getByText("SIP & Lumpsum")).toBeInTheDocument();
    expect(screen.getByText("Income Tax")).toBeInTheDocument();
    expect(screen.getByText("GST Engine")).toBeInTheDocument();
    expect(screen.getByText("Interest Engine")).toBeInTheDocument();
    expect(screen.getByText("FD & RD Maturity")).toBeInTheDocument();
    expect(screen.getByText("CTC to In-Hand")).toBeInTheDocument();
    expect(screen.getByText("Compare Loans")).toBeInTheDocument();
  });

  it("renders the interactive graphical trajectory curve section", () => {
    render(
      <CurrencyProvider>
        <Home />
      </CurrencyProvider>
    );

    expect(
      screen.getByText(/Graphical Pricing Trajectory \(Since Inception\)/i)
    ).toBeInTheDocument();
  });
});