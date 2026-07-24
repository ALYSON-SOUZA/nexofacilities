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
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <span
      className="transition-all duration-500 ease-out kpi-number"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-2 print:mb-2 print:grid-cols-4 print:gap-2">
      {/* MELHOR COMPRA MISTA */}
      <div id="card-mixed-best">
        <div className="bp-card h-full">
          <div className="p-3 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-1.5">
              <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                <CheckCircle className="h-3 w-3 text-blue-500" />
              </div>
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold text-[8px] tracking-wider uppercase">RECOMENDADO</span>
            </div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">MELHOR COMPRA MISTA</p>
            <h2 className="font-mono text-lg leading-tight font-semibold text-slate-900">
              <AnimatedNumber value={formatCurrency(mixedTotal)} />
            </h2>
          </div>
        </div>
      </div>

      {/* MELHOR LOJA ÚNICA */}
      <div id="card-store-best">
        <div className="bp-card h-full">
          <div className="p-3 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-1.5">
              <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
                <Building className="h-3 w-3 text-slate-500" />
              </div>
            </div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">MELHOR LOJA ÚNICA</p>
            <h2 className="font-mono text-lg leading-tight font-semibold text-slate-900">
              <AnimatedNumber value={bestSupplier ? formatCurrency(bestSupplierTotal) : "R$ 0,00"} />
            </h2>
            <p className="mt-1 text-[9px] text-slate-400">
              FORNECEDOR: <span className="text-slate-700 font-semibold">{bestSupplier ? bestSupplier.name : "-"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ECONOMIA AUDITADA */}
      <div id="card-savings-audit">
        <div className="bp-card h-full">
          <div className="p-3 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-1.5">
              <div className="w-6 h-6 rounded-md bg-green-50 flex items-center justify-center">
                <TrendingDown className="h-3 w-3 text-green-500" />
              </div>
            </div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">ECONOMIA AUDITADA</p>
            <h2 className="font-mono text-lg leading-tight font-semibold text-green-600">
              <AnimatedNumber value={formatCurrency(savingsVersusWorst)} />
            </h2>
            <p className="mt-1 text-[8px] font-semibold text-slate-400 uppercase tracking-tight">
              POUPADO VS MAIS CARO
            </p>
          </div>
        </div>
      </div>

      {/* OTIMIZAÇÃO REAL */}
      <div id="card-optimization-real">
        <div className="bp-card h-full">
          <div className="p-3 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-1.5">
              <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center">
                <Percent className="h-3 w-3 text-amber-500" />
              </div>
            </div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">OTIMIZAÇÃO REAL</p>
            <h2 className="font-mono text-lg leading-tight font-semibold text-amber-600">
              <AnimatedNumber value={optimizationPercent > 0 ? `${optimizationPercent.toFixed(1)}%` : "0.0%"} />
            </h2>
            <p className="mt-1 text-[8px] font-semibold text-slate-400 uppercase tracking-tight">
              EFICIÊNCIA MISTA ALCANÇADA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
