import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CurrencyProvider } from "../src/app/context/CurrencyContext";
import Home from "../src/app/page";
import QuickCalculators from "../src/app/(product)/quick-calculators/page";
import { SiteHeader } from "../src/components/site/SiteHeader";

function renderHome() {
  return render(
    <CurrencyProvider>
      <Home />
    </CurrencyProvider>
  );
}

/** The quick calculators page, with the site header that holds the currency menu (as the product layout renders it). */
function renderQuick() {
  return render(
    <CurrencyProvider>
      <SiteHeader />
      <QuickCalculators />
    </CurrencyProvider>
  );
}

/** The value span rendered next to a slider's label. */
function sliderValue(label: string): string {
  const slider = screen.getByRole("slider", { name: label });
  return within(slider.parentElement as HTMLElement).getAllByText(/./)[1].textContent ?? "";
}

describe("Finealth homepage", () => {
  it("has one heading per section in order, from the hero to the last call to action", () => {
    renderHome();
    const h2 = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent?.replace(/\s+/g, " ").trim());
    expect(h2).toEqual([
      "Six planners, one calm picture",
      "From ten numbers to a plan",
      "The ones people use most",
      "Quick calculators for your country",
      "Free to start, Pro when you plan",
      "Your money stays yours",
      "Before you start",
      "Two minutes, ten numbers.",
    ]);
  });

  it("links to the standalone calculators first, then popular library tools", () => {
    renderHome();
    const nav = screen.getByRole("navigation", { name: "Popular calculators" });
    const hrefs = within(nav).getAllByRole("link").map((a) => a.getAttribute("href")?.replace(/\/$/, ""));
    expect(hrefs.slice(0, 3)).toEqual(["/sip-calculator", "/emi-calculator", "/compound-interest"]);
    expect(hrefs.length).toBe(9);
    expect(screen.getByTestId("all-tools-link")).toHaveAttribute("href", expect.stringMatching(/^\/tools\/?$/));
  });

  it("is a landing page: no market cards or calculator tabs, one link to the quick calculators page", () => {
    renderHome();
    expect(screen.queryByTestId("markets")).not.toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.getByTestId("quick-answers-link")).toHaveAttribute("href", expect.stringMatching(/^\/quick-calculators\/?$/));
  });
});

describe("Quick calculators page", () => {
  it("opens the tool a home page chip names in the URL hash", () => {
    window.location.hash = "#ctc";
    renderQuick();
    expect(screen.getByRole("button", { name: "CTC to In-Hand Salary" })).toHaveAttribute("aria-pressed", "true");
    window.location.hash = "";
  });

  it("falls back to the first tool when the country has no tool of that kind", () => {
    window.location.hash = "#ctc";
    renderQuick();
    fireEvent.change(screen.getByRole("combobox", { name: "Currency" }), { target: { value: "USD" } });
    expect(screen.getByRole("button", { name: "30-Yr Mortgage & PITI" })).toHaveAttribute("aria-pressed", "true");
    window.location.hash = "";
  });

  it("renders the six Indian calculator tabs", () => {
    renderQuick();
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

  it("renders the price history section", () => {
    renderQuick();
    expect(screen.getByRole("heading", { name: "How prices moved over the decades" })).toBeInTheDocument();
  });

  it("labels market values honestly as stored reference values", () => {
    renderQuick();
    expect(screen.getByTestId("engine-badge")).toHaveTextContent("Reference values · not live");
    expect(screen.getByText(/not live prices/)).toBeInTheDocument();
  });

  it("formats rates as percentages, not index points", () => {
    renderQuick();
    fireEvent.change(screen.getByRole("combobox", { name: "Currency" }), { target: { value: "GBP" } });
    expect(screen.getByText("4.12%")).toBeInTheDocument(); // UK 10-Year Gilt Yield
    expect(screen.queryByText("4.12 pts")).not.toBeInTheDocument();
  });

  it("rebases calculator values into range when the jurisdiction changes", () => {
    renderQuick();
    expect(sliderValue("Borrowing Principal")).toBe("₹35,00,000");

    fireEvent.change(screen.getByRole("combobox", { name: "Currency" }), { target: { value: "USD" } });

    expect(screen.getByRole("button", { name: "30-Yr Mortgage & PITI" })).toBeInTheDocument();
    const slider = screen.getByRole("slider", { name: "Borrowing Principal" }) as HTMLInputElement;
    expect(Number(slider.value)).toBeLessThanOrEqual(Number(slider.max));
    expect(sliderValue("Borrowing Principal")).toBe("$350,000");
  });

  it("derives CTC tax from the CTC slider", () => {
    renderQuick();
    fireEvent.click(screen.getByRole("button", { name: "CTC to In-Hand Salary" }));

    const taxRow = () => screen.getByText("Income Tax (TDS):").nextElementSibling?.textContent;
    const before = taxRow();
    fireEvent.change(screen.getByRole("slider", { name: "Annual Cost to Company (CTC)" }), {
      target: { value: "3000000" },
    });
    expect(taxRow()).not.toBe(before);
  });

  it("shows GST 2.0 slabs only", () => {
    renderQuick();
    fireEvent.click(screen.getByRole("button", { name: "GST (CGST + SGST Split)" }));
    for (const slab of ["3%", "5%", "18%", "40%"]) {
      expect(screen.getByRole("button", { name: slab })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "12%" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "28%" })).not.toBeInTheDocument();
  });

  it("gives UK stamp duty its own calculator", () => {
    renderQuick();
    fireEvent.change(screen.getByRole("combobox", { name: "Currency" }), { target: { value: "GBP" } });
    fireEvent.click(screen.getByRole("button", { name: "Stamp Duty (SDLT)" }));
    expect(screen.getByText("STAMP DUTY LAND TAX")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "First-time buyer" })).toBeInTheDocument();
    expect(screen.queryByText(/CGST/)).not.toBeInTheDocument();
  });
});
