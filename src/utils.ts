import { Supplier, QuoteItem, ComparisonSummary } from "./types";

/**
 * Formats a number to Brazilian Real string (e.g. 1234.56 -> R$ 1.234,56)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "R$ 0,00";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Parses a string input with either comma or dot as decimal separator
 * returns a non-negative number, or 0 if invalid/negative
 */
export function parseInputValue(input: string): number {
  if (!input) return 0;
  // Replace comma with dot for floating point parsing
  const cleanInput = input.replace(/\s/g, "").replace(",", ".");
  const parsed = parseFloat(cleanInput);
  if (isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

/**
 * Recalculates all calculations, totals, and best/worst pricing scenarios
 */
export function calculateComparison(
  suppliers: Supplier[],
  items: QuoteItem[]
): ComparisonSummary {
  const supplierTotals: Record<string, number> = {};
  const itemBestSuppliers: Record<string, string[]> = {};

  // Initialize supplier totals to 0
  suppliers.forEach((s) => {
    supplierTotals[s.id] = 0;
  });

  let mixedTotal = 0;

  items.forEach((item) => {
    let minCost = Infinity;
    let bestIdsForThisItem: string[] = [];

    // Add to each supplier's total as normal
    suppliers.forEach((s) => {
      const priceVal = item.prices[s.id];
      const price = priceVal !== undefined && priceVal !== null ? priceVal : 0;
      const totalCost = item.quantity * price;

      // Add to supplier total
      supplierTotals[s.id] = (supplierTotals[s.id] || 0) + totalCost;
    });

    // Check if there is a preferred supplier for this item, and if they have a valid price > 0.
    const prefId = item.preferredSupplierId;
    const prefPriceVal = prefId ? item.prices[prefId] : null;
    const prefPrice = prefPriceVal !== undefined && prefPriceVal !== null ? prefPriceVal : 0;

    if (prefId && prefPrice > 0) {
      minCost = item.quantity * prefPrice;
      bestIdsForThisItem = [prefId];
    } else {
      // Regular lowest price calculation
      suppliers.forEach((s) => {
        const priceVal = item.prices[s.id];
        const price = priceVal !== undefined && priceVal !== null ? priceVal : 0;
        const totalCost = item.quantity * price;

        // ONLY consider a supplier's price for the cheapest selection if it is > 0.
        // A price of 0 or null is treated as "not quoted".
        if (price > 0) {
          if (totalCost < minCost) {
            minCost = totalCost;
            bestIdsForThisItem = [s.id];
          } else if (totalCost === minCost) {
            bestIdsForThisItem.push(s.id);
          }
        }
      });
    }

    if (minCost === Infinity || items.length === 0 || suppliers.length === 0) {
      minCost = 0;
    }

    mixedTotal += minCost;
    itemBestSuppliers[item.id] = bestIdsForThisItem;
  });

  // Calculate active suppliers (those that have a total greater than 0)
  const activeSuppliers = suppliers.filter((s) => (supplierTotals[s.id] || 0) > 0);

  let bestSupplierId: string | null = null;
  let worstSupplierId: string | null = null;
  let minTotal = Infinity;
  let maxTotal = -Infinity;

  if (activeSuppliers.length > 0) {
    activeSuppliers.forEach((s) => {
      const total = supplierTotals[s.id] || 0;
      if (total < minTotal) {
        minTotal = total;
        bestSupplierId = s.id;
      }
      if (total > maxTotal) {
        maxTotal = total;
        worstSupplierId = s.id;
      }
    });
  } else if (suppliers.length > 0) {
    // Fallback if no supplier has any filled prices yet (all are 0)
    bestSupplierId = suppliers[0].id;
    worstSupplierId = suppliers[0].id;
  }

  let bestUniqueTotal = bestSupplierId ? (supplierTotals[bestSupplierId] || 0) : 0;
  let worstUniqueTotal = worstSupplierId ? (supplierTotals[worstSupplierId] || 0) : 0;

  let savingsVersusWorst = Math.max(0, worstUniqueTotal - mixedTotal);
  let savingsVersusBestUnique = Math.max(0, bestUniqueTotal - mixedTotal);

  // If there is only 1 supplier in total, or only 1 active supplier who has filled prices,
  // we count it as a single-quote scenario.
  if (suppliers.length === 1 || activeSuppliers.length === 1) {
    const singleSupplierId = activeSuppliers.length === 1 ? activeSuppliers[0].id : suppliers[0].id;
    const singleSupplierTotal = supplierTotals[singleSupplierId] || 0;
    
    mixedTotal = singleSupplierTotal;
    bestSupplierId = singleSupplierId;
    worstSupplierId = singleSupplierId;
    savingsVersusWorst = singleSupplierTotal;
    savingsVersusBestUnique = 0;
  }

  return {
    supplierTotals,
    mixedTotal,
    bestSupplierId,
    worstSupplierId,
    savingsVersusWorst,
    savingsVersusBestUnique,
    itemBestSuppliers,
  };
}

/**
 * Converte uma data de cotação (ex: "15/06/2026") para o mês posterior no formato reduzido (ex: "jul/26")
 */
export function getPosteriorMonthLabel(dateStr: string): string {
  if (!dateStr) return "jul/26"; // Fallback padrão
  if (/^[a-z]{3}\/\d{2}$/i.test(dateStr.trim())) {
    return dateStr.trim().toLowerCase();
  }

  const parts = dateStr.trim().split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;

    // Use safe day 15 to avoid month shifting due to days count differences
    const date = new Date(year, month, 15);
    // Adiciona 1 mês para obter o mês posterior
    date.setMonth(date.getMonth() + 1);

    const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const posteriorMonthStr = monthNames[date.getMonth()];
    const posteriorYearStr = date.getFullYear().toString().slice(-2);
    return `${posteriorMonthStr}/${posteriorYearStr}`;
  }
  
  return dateStr.trim().toLowerCase();
}

/**
 * Retorna uma lista com os meses anteriores ao mês base fornecido, na quantidade solicitada.
 * Ex: getPreviousMonths("jul/26", 2) -> ["mai/26", "jun/26"]
 */
export function getPreviousMonths(monthLabel: string, count: number): string[] {
  const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const parts = monthLabel.split("/");
  if (parts.length !== 2) return [];
  const mIndex = monthNames.indexOf(parts[0].toLowerCase());
  let year = parseInt(parts[1], 10);
  if (mIndex === -1 || isNaN(year)) return [];

  const result: string[] = [];
  let currentM = mIndex;
  let currentY = year;

  for (let i = 0; i < count; i++) {
    currentM = currentM - 1;
    if (currentM < 0) {
      currentM = 11;
      currentY = currentY - 1;
    }
    const yyStr = currentY.toString().padStart(2, "0");
    result.unshift(`${monthNames[currentM]}/${yyStr}`);
  }
  return result;
}

