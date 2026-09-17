import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CurrencyProvider } from "../src/app/context/CurrencyContext";
import Home from "../src/app/page";

function renderHome() {
  return render(
    <CurrencyProvider>
      <Home />
    </CurrencyProvider>
  );
}

/** The value span rendered next to a slider's label. */
function sliderValue(label: string): string {
  const slider = screen.getByRole("slider", { name: label });
  return within(slider.parentElement as HTMLElement).getAllByText(/./)[1].textContent ?? "";
}

describe("Finealth homepage", () => {
  it("renders the India priority benchmarks, including 22K gold", () => {
    renderHome();
    for (const name of ["Gold (24K Pure)", "Gold (22K Jewellery)", "Silver (Fine 999)", "NIFTY 50", "BSE SENSEX"]) {
      expect(screen.getByRole("heading", { name, level: 3 })).toBeInTheDocument();
    }
  });

  it("renders the six Indian calculator tabs", () => {
    renderHome();
    for (const label of [
      "Loan EMI & Amortization",
      "Mutual Fund SIP & Step-Up",
      "Income Tax (New vs Old)",
      "GST (CGST + SGST Split)",
      "Bank FD & Post Office RD",
      "CTC to In-Hand Salary",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("renders the historical trajectory section", () => {
    renderHome();
    expect(
      screen.getByRole("heading", { name: "Multi-Decade Inception Historical Trajectory" })
    ).toBeInTheDocument();
  });

  it("formats rates as percentages, not index points", () => {
    renderHome();
    fireEvent.change(screen.getByRole("combobox", { name: "Jurisdiction" }), { target: { value: "GBP" } });
    expect(screen.getByText("4.12%")).toBeInTheDocument(); // UK 10-Year Gilt Yield
    expect(screen.queryByText("4.12 pts")).not.toBeInTheDocument();
  });

  it("rebases calculator values into range when the jurisdiction changes", () => {
    renderHome();
    expect(sliderValue("Borrowing Principal")).toBe("₹35,00,000");

    fireEvent.change(screen.getByRole("combobox", { name: "Jurisdiction" }), { target: { value: "USD" } });

    expect(screen.getByRole("button", { name: "30-Yr Mortgage & PITI" })).toBeInTheDocument();
    const slider = screen.getByRole("slider", { name: "Borrowing Principal" }) as HTMLInputElement;
    expect(Number(slider.value)).toBeLessThanOrEqual(Number(slider.max));
    expect(sliderValue("Borrowing Principal")).toBe("$350,000");
  });

  it("derives CTC tax from the CTC slider", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "CTC to In-Hand Salary" }));

    const taxRow = () => screen.getByText("Income Tax (TDS):").nextElementSibling?.textContent;
    const before = taxRow();
    fireEvent.change(screen.getByRole("slider", { name: "Annual Cost to Company (CTC)" }), {
      target: { value: "3000000" },
    });
    expect(taxRow()).not.toBe(before);
  });

  it("shows GST 2.0 slabs only", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "GST (CGST + SGST Split)" }));
    for (const slab of ["3%", "5%", "18%", "40%"]) {
      expect(screen.getByRole("button", { name: slab })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "12%" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "28%" })).not.toBeInTheDocument();
  });

  it("gives UK stamp duty its own calculator", () => {
    renderHome();
    fireEvent.change(screen.getByRole("combobox", { name: "Jurisdiction" }), { target: { value: "GBP" } });
    fireEvent.click(screen.getByRole("button", { name: "Stamp Duty (SDLT)" }));
    expect(screen.getByText("STAMP DUTY LAND TAX")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "First-time buyer" })).toBeInTheDocument();
    expect(screen.queryByText(/CGST/)).not.toBeInTheDocument();
  });

  it("links to the standalone calculators", () => {
    renderHome();
    const nav = screen.getByRole("navigation", { name: "Standalone calculators" });
    expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/sip-calculator",
      "/emi-calculator",
      "/compound-interest",
    ]);
  });
});
