import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import FinealthProSuite from "../src/app/page";

/** The value rendered beside a result label, e.g. "Monthly TDS" -> "-₹0". */
function resultFor(label: string): string {
  return screen.getByText(label, { exact: true }).nextElementSibling?.textContent ?? "";
}

function dock(label: string) {
  return within(screen.getByRole("contentinfo")).getByRole("button", { name: new RegExp(label) });
}

describe("Finealth mobile suite", () => {
  it("renders the four-category bottom dock", () => {
    render(<FinealthProSuite />);
    for (const label of ["Wealth", "Income", "Debts", "Macro"]) {
      expect(dock(label)).toBeInTheDocument();
    }
  });

  it("offers only the GST 2.0 slabs", () => {
    render(<FinealthProSuite />);
    fireEvent.click(dock("Income"));
    fireEvent.click(screen.getByRole("button", { name: "GST Calculator" }));

    for (const slab of ["3%", "5%", "18%", "40%"]) {
      expect(screen.getByRole("button", { name: slab })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "12%" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "28%" })).not.toBeInTheDocument();
  });

  it("withholds no TDS on a ₹12L CTC under the 87A rebate", () => {
    // Regression: the old ladder charged ₹53,750 a year here (₹4,479/month).
    render(<FinealthProSuite />);
    fireEvent.click(dock("Income"));
    expect(screen.getByRole("heading", { name: "Annual CTC to Take-Home" })).toBeInTheDocument();
    expect(resultFor("Monthly TDS")).toMatch(/₹0$/);
  });

  it("caps employee PF at the ₹1,800 statutory ceiling", () => {
    render(<FinealthProSuite />);
    fireEvent.click(dock("Income"));
    expect(resultFor("Employee PF (12%)")).toMatch(/₹1,800$/);
  });

  it("shows a principal vs interest breakdown on the EMI engine", () => {
    render(<FinealthProSuite />);
    fireEvent.click(dock("Debts"));
    expect(screen.getByRole("heading", { name: "Loan Repayment & EMI" })).toBeInTheDocument();
    expect(screen.getByText(/^Principal \d+%$/)).toBeInTheDocument();
    expect(screen.getByText(/^Interest \d+%$/)).toBeInTheDocument();
  });
});
