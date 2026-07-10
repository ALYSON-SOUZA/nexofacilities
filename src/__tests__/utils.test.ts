import { describe, it, expect } from "vitest";
import { formatCurrency, parseInputValue, calculateComparison, getPosteriorMonthLabel, getPreviousMonths } from "../utils";
import { Supplier, QuoteItem } from "../types";

describe("formatCurrency", () => {
  it("formats a normal positive number", () => {
    expect(formatCurrency(1234.56)).toBe("R$\u00a01.234,56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("R$\u00a00,00");
  });

  it("formats null as R$ 0,00", () => {
    expect(formatCurrency(null)).toBe("R$\u00a00,00");
  });

  it("formats undefined as R$ 0,00", () => {
    expect(formatCurrency(undefined)).toBe("R$\u00a00,00");
  });

  it("formats NaN as R$ 0,00", () => {
    expect(formatCurrency(NaN)).toBe("R$\u00a00,00");
  });

  it("formats negative numbers", () => {
    expect(formatCurrency(-500)).toBe("-R$\u00a0500,00");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatCurrency(10.559)).toBe("R$\u00a010,56");
  });
});

describe("parseInputValue", () => {
  it("parses a simple integer string", () => {
    expect(parseInputValue("100")).toBe(100);
  });

  it("parses a decimal with dot", () => {
    expect(parseInputValue("10.50")).toBeCloseTo(10.5);
  });

  it("parses a decimal with comma", () => {
    expect(parseInputValue("10,50")).toBeCloseTo(10.5);
  });

  it("returns 0 for empty string", () => {
    expect(parseInputValue("")).toBe(0);
  });

  it("returns 0 for non-numeric string", () => {
    expect(parseInputValue("abc")).toBe(0);
  });

  it("returns 0 for negative input", () => {
    expect(parseInputValue("-50")).toBe(0);
  });

  it("trims whitespace", () => {
    expect(parseInputValue("  42  ")).toBe(42);
  });
});

describe("calculateComparison", () => {
  const suppliers: Supplier[] = [
    { id: "s1", name: "Supplier A" },
    { id: "s2", name: "Supplier B" },
  ];

  it("returns zeros when all prices are 0", () => {
    const items: QuoteItem[] = [
      { id: "i1", name: "Item 1", quantity: 10, prices: { s1: 0, s2: 0 } },
    ];
    const result = calculateComparison(suppliers, items);
    expect(result.mixedTotal).toBe(0);
    expect(result.bestSupplierId).toBe("s1");
    expect(result.worstSupplierId).toBe("s1");
  });

  it("picks cheapest supplier per item for mixed total", () => {
    const items: QuoteItem[] = [
      { id: "i1", name: "Item 1", quantity: 5, prices: { s1: 10, s2: 8 } },
    ];
    const result = calculateComparison(suppliers, items);
    expect(result.mixedTotal).toBe(40); // 5 * 8
    expect(result.bestSupplierId).toBe("s2");
  });

  it("respects preferredSupplierId when price > 0", () => {
    const items: QuoteItem[] = [
      {
        id: "i1",
        name: "Item 1",
        quantity: 2,
        prices: { s1: 10, s2: 5 },
        preferredSupplierId: "s1",
      },
    ];
    const result = calculateComparison(suppliers, items);
    // preferred s1 at 10, so 2*10=20 mixed total instead of 2*5=10
    expect(result.mixedTotal).toBe(20);
  });

  it("handles empty items array", () => {
    const result = calculateComparison(suppliers, []);
    expect(result.mixedTotal).toBe(0);
  });

  it("handles single supplier", () => {
    const singleSupplier: Supplier[] = [{ id: "s1", name: "Only" }];
    const items: QuoteItem[] = [
      { id: "i1", name: "Item 1", quantity: 3, prices: { s1: 20 } },
    ];
    const result = calculateComparison(singleSupplier, items);
    expect(result.mixedTotal).toBe(60);
    expect(result.savingsVersusBestUnique).toBe(0);
  });
});

describe("getPosteriorMonthLabel", () => {
  it("returns jul/26 for 15/06/2026", () => {
    expect(getPosteriorMonthLabel("15/06/2026")).toBe("jul/26");
  });

  it("handles december -> january rollover", () => {
    expect(getPosteriorMonthLabel("01/12/2025")).toBe("jan/26");
  });

  it("returns the label as-is if already in MMM/YY format", () => {
    expect(getPosteriorMonthLabel("jul/26")).toBe("jul/26");
  });

  it("returns fallback for empty string", () => {
    expect(getPosteriorMonthLabel("")).toBe("jul/26");
  });
});

describe("getPreviousMonths", () => {
  it("returns previous months in correct order", () => {
    expect(getPreviousMonths("jul/26", 2)).toEqual(["mai/26", "jun/26"]);
  });

  it("handles year rollover", () => {
    expect(getPreviousMonths("jan/26", 3)).toEqual(["out/25", "nov/25", "dez/25"]);
  });

  it("returns empty array for invalid format", () => {
    expect(getPreviousMonths("invalid", 3)).toEqual([]);
  });

  it("returns empty array for count 0", () => {
    expect(getPreviousMonths("jul/26", 0)).toEqual([]);
  });
});
