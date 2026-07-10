import React from "react";
import { Supplier, ComparisonSummary } from "../types";
import { formatCurrency } from "../utils";
import { CheckCircle, Building, TrendingDown, Percent } from "lucide-react";

interface DashboardProps {
  suppliers: Supplier[];
  summary: ComparisonSummary;
}

export default function Dashboard({ suppliers, summary }: DashboardProps) {
  const {
    supplierTotals,
    mixedTotal,
    bestSupplierId,
    worstSupplierId,
    savingsVersusWorst,
    savingsVersusBestUnique,
  } = summary;

  // Find Best Supplier Details
  const bestSupplier = suppliers.find((s) => s.id === bestSupplierId);
  const bestSupplierTotal = bestSupplierId ? (supplierTotals[bestSupplierId] ?? 0) : 0;

  // Calculate dynamic optimization percentage: difference between best supplier and mixed total relative to best supplier
  const optimizationPercent = bestSupplierTotal > 0 
    ? ((bestSupplierTotal - mixedTotal) / bestSupplierTotal) * 100 
    : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5 print:mb-3 print:grid-cols-4 print:gap-3">
      
      {/* CARD 1: MELHOR COMPRA MISTA */}
      <div id="card-mixed-best" className="relative bg-white rounded-xl p-4 shadow-xs border border-slate-200/80 border-l-4 border-l-[#08D9D6] transition-all hover:shadow-md flex flex-col justify-between overflow-hidden print:border-slate-300">
        <div className="flex items-start justify-between gap-1">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-none font-sans">
              MELHOR COMPRA MISTA
            </span>
          </div>
          <CheckCircle className="h-4.5 w-4.5 text-[#08D9D6] shrink-0" />
        </div>
        <div className="mt-3">
          <span className="text-2xl sm:text-3xl lg:text-[28px] xl:text-[32px] print:text-2xl font-black text-[#252A34] leading-none tracking-tight block">
            {formatCurrency(mixedTotal)}
          </span>
          <div className="mt-2.5">
            <span className="inline-flex items-center rounded-full bg-[#08D9D6]/10 px-2.5 py-0.5 text-[9px] font-black text-[#05A8A6] uppercase tracking-wider border border-[#08D9D6]/20">
              RECOMENDADO
            </span>
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 w-12 h-12 rounded-full bg-[#08D9D6]/5 blur-xs pointer-events-none" />
      </div>

      {/* CARD 2: MELHOR LOJA ÚNICA */}
      <div id="card-store-best" className="relative bg-white rounded-xl p-4 shadow-xs border border-slate-200/80 border-l-4 border-l-[#252A34] transition-all hover:shadow-md flex flex-col justify-between overflow-hidden print:border-slate-300">
        <div className="flex items-start justify-between gap-1">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-none font-sans">
              MELHOR LOJA ÚNICA
            </span>
          </div>
          <Building className="h-4.5 w-4.5 text-[#252A34]/60 shrink-0" />
        </div>
        <div className="mt-3">
          <span className="text-2xl sm:text-3xl lg:text-[28px] xl:text-[32px] print:text-2xl font-black text-[#252A34] leading-none tracking-tight block">
            {bestSupplier ? formatCurrency(bestSupplierTotal) : "R$ 0,00"}
          </span>
          <p className="mt-2 text-[10px] text-slate-400 font-extrabold uppercase tracking-wide leading-normal">
            {bestSupplier ? `FORNECEDOR: ${bestSupplier.name}` : "Total fornecedor único"}
          </p>
        </div>
        <div className="absolute -bottom-6 -right-6 w-12 h-12 rounded-full bg-[#252A34]/5 blur-xs pointer-events-none" />
      </div>

      {/* CARD 3: ECONOMIA AUDITADA */}
      <div id="card-savings-audit" className="relative bg-white rounded-xl p-4 shadow-xs border border-slate-200/80 border-l-4 border-l-[#10B981] transition-all hover:shadow-md flex flex-col justify-between overflow-hidden print:border-slate-300">
        <div className="flex items-start justify-between gap-1">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-none font-sans">
              ECONOMIA AUDITADA
            </span>
          </div>
          <TrendingDown className="h-4.5 w-4.5 text-[#10B981] shrink-0 animate-bounce" />
        </div>
        <div className="mt-3">
          <span className="text-2xl sm:text-3xl lg:text-[28px] xl:text-[32px] print:text-2xl font-black text-[#10B981] leading-none tracking-tight block">
            {formatCurrency(savingsVersusWorst)}
          </span>
          <p className="mt-2 text-[10px] text-slate-400 font-extrabold uppercase tracking-wide leading-normal">
            Poupado vs mais caro
          </p>
        </div>
        <div className="absolute -bottom-6 -right-6 w-12 h-12 rounded-full bg-[#10B981]/5 blur-xs pointer-events-none" />
      </div>

      {/* CARD 4: OTIMIZAÇÃO REAL */}
      <div id="card-optimization-real" className="relative bg-white rounded-xl p-4 shadow-xs border border-slate-200/80 border-l-4 border-l-[#FF2E63] transition-all hover:shadow-md flex flex-col justify-between overflow-hidden print:border-slate-300">
        <div className="flex items-start justify-between gap-1">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-none font-sans">
              OTIMIZAÇÃO REAL
            </span>
          </div>
          <Percent className="h-4.5 w-4.5 text-[#FF2E63] shrink-0" />
        </div>
        <div className="mt-3">
          <span className="text-2xl sm:text-3xl lg:text-[28px] xl:text-[32px] print:text-2xl font-black text-[#FF2E63] leading-none tracking-tight block">
            {optimizationPercent > 0 ? `${optimizationPercent.toFixed(1)}%` : "0.0%"}
          </span>
          <p className="mt-2 text-[10px] text-slate-400 font-extrabold uppercase tracking-wide leading-normal">
            Eficiência mista alcançada
          </p>
        </div>
        <div className="absolute -bottom-6 -right-6 w-12 h-12 rounded-full bg-[#FF2E63]/5 blur-xs pointer-events-none" />
      </div>

    </div>
  );
}

