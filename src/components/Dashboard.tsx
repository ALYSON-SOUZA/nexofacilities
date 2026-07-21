import React, { useEffect, useState } from "react";
import { Supplier, ComparisonSummary } from "../types";
import { formatCurrency } from "../utils";
import { CheckCircle, Building, TrendingDown, Percent } from "lucide-react";

interface DashboardProps {
  suppliers: Supplier[];
  summary: ComparisonSummary;
}

function AnimatedNumber({ value, prefix = "" }: { value: string; prefix?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);
  return (
    <span
      className="transition-all duration-700 ease-out kpi-number"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
      }}
    >
      {prefix}{value}
    </span>
  );
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

  const bestSupplier = suppliers.find((s) => s.id === bestSupplierId);
  const bestSupplierTotal = bestSupplierId ? (supplierTotals[bestSupplierId] ?? 0) : 0;

  const optimizationPercent = bestSupplierTotal > 0
    ? ((bestSupplierTotal - mixedTotal) / bestSupplierTotal) * 100
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-12 gap-4 sm:gap-5 mb-6 sm:mb-8 print:mb-3 print:grid-cols-4 print:gap-3">
      {/* MELHOR COMPRA MISTA - Dominant bento module (6 cols) */}
      <div id="card-mixed-best" className="col-span-2 md:col-span-6">
        <div className="bp-card h-full group">
          <div className="bp-card-accent bp-card-accent-pink w-[3px]" />
          <div className="p-5 sm:p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="bp-card-icon bg-[rgba(255,46,99,0.05)] text-[#FF2E63]">
                <CheckCircle className="h-4 w-4" />
              </div>
              <span className="showcase-badge showcase-badge-pink">RECOMENDADO</span>
            </div>
            <div>
              <p className="showcase-label mb-2">MELHOR COMPRA MISTA</p>
              <h3 className="text-3xl sm:text-4xl lg:text-[36px] xl:text-[40px] font-display font-extrabold text-[#252A34] leading-none tracking-tight">
                <AnimatedNumber value={formatCurrency(mixedTotal)} />
              </h3>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100" />
          </div>
        </div>
      </div>

      {/* MELHOR LOJA ÚNICA (2 cols) */}
      <div id="card-store-best" className="col-span-1 md:col-span-3">
        <div className="bp-card h-full group">
          <div className="bp-card-accent bp-card-accent-slate w-[3px]" />
          <div className="p-5 sm:p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="bp-card-icon bg-[rgba(100,116,139,0.05)] text-slate-500">
                <Building className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="showcase-label mb-2">MELHOR LOJA ÚNICA</p>
              <h3 className="text-2xl sm:text-3xl lg:text-[28px] xl:text-[30px] font-display font-extrabold text-[#252A34] leading-none tracking-tight">
                <AnimatedNumber value={bestSupplier ? formatCurrency(bestSupplierTotal) : "R$ 0,00"} />
              </h3>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                {bestSupplier ? `FORNECEDOR: ${bestSupplier.name}` : "Total fornecedor único"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ECONOMIA AUDITADA (2 cols) */}
      <div id="card-savings-audit" className="col-span-1 md:col-span-3">
        <div className="bp-card h-full group">
          <div className="bp-card-accent bp-card-accent-emerald w-[3px]" />
          <div className="p-5 sm:p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="bp-card-icon bg-emerald-50 text-emerald-600">
                <TrendingDown className="h-4 w-4" />
              </div>
              <span className="material-symbols-outlined text-emerald-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
            <div>
              <p className="showcase-label mb-2">ECONOMIA AUDITADA</p>
              <h3 className="text-2xl sm:text-3xl lg:text-[28px] xl:text-[30px] font-display font-extrabold text-emerald-600 leading-none tracking-tight">
                <AnimatedNumber value={formatCurrency(savingsVersusWorst)} />
              </h3>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                Poupado vs mais caro
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* OTIMIZAÇÃO REAL (2 cols) */}
      <div id="card-optimization-real" className="col-span-1 md:col-span-3">
        <div className="bp-card h-full group">
          <div className="bp-card-accent bp-card-accent-pink w-[3px]" />
          <div className="p-5 sm:p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="bp-card-icon bg-[rgba(255,46,99,0.05)] text-[#FF2E63]">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="showcase-label mb-2">OTIMIZAÇÃO REAL</p>
              <h3 className="text-2xl sm:text-3xl lg:text-[28px] xl:text-[30px] font-display font-extrabold text-[#FF2E63] leading-none tracking-tight">
                <AnimatedNumber value={optimizationPercent > 0 ? `${optimizationPercent.toFixed(1)}%` : "0.0%"} />
              </h3>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                Eficiência mista alcançada
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
