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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-2 print:mb-2 print:grid-cols-4 print:gap-2">
      {/* MELHOR COMPRA MISTA */}
      <div id="card-mixed-best" className="bp-card-accent-pink">
        <div className="bp-card h-full group">
          <div className="p-2 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-1">
              <div className="bp-card-icon bg-[#FF2E63]/5 text-[#FF2E63]" style={{padding:'3px', borderRadius:'5px'}}>
                <CheckCircle className="h-3 w-3" />
              </div>
              <span className="px-1 py-0.5 rounded bg-[#FF2E63]/10 text-[#FF2E63] font-bold text-[7px] tracking-wider uppercase">RECOMENDADO</span>
            </div>
            <p className="text-[8px] font-bold text-[#252A34] uppercase tracking-wide mb-0.5">MELHOR COMPRA MISTA</p>
            <h2 className="font-mono text-[18px] leading-[1.1] font-medium text-[#252A34]">
              <AnimatedNumber value={formatCurrency(mixedTotal)} />
            </h2>
          </div>
        </div>
      </div>

      {/* MELHOR LOJA ÚNICA */}
      <div id="card-store-best" className="bp-card-accent-navy">
        <div className="bp-card h-full group">
          <div className="p-2 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-1">
              <div className="bp-card-icon bg-[#252A34]/5 text-[#252A34]" style={{padding:'3px', borderRadius:'5px'}}>
                <Building className="h-3 w-3" />
              </div>
            </div>
            <p className="text-[8px] font-bold text-[#252A34] uppercase tracking-wide mb-0.5">MELHOR LOJA ÚNICA</p>
            <h2 className="font-mono text-[18px] leading-[1.1] font-medium text-[#252A34]">
              <AnimatedNumber value={bestSupplier ? formatCurrency(bestSupplierTotal) : "R$ 0,00"} />
            </h2>
            <p className="mt-1 text-[8px] text-[#6a6a6a]">
              FORNECEDOR: <span className="text-[#252A34] font-bold">{bestSupplier ? bestSupplier.name : "-"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ECONOMIA AUDITADA */}
      <div id="card-savings-audit" className="bp-card-accent-sky">
        <div className="bp-card h-full group">
          <div className="p-2 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-1">
              <div className="bp-card-icon bg-[#08D9D6]/10 text-[#08D9D6]" style={{padding:'3px', borderRadius:'5px'}}>
                <TrendingDown className="h-3 w-3" />
              </div>
            </div>
            <p className="text-[8px] font-bold text-[#252A34] uppercase tracking-wide mb-0.5">ECONOMIA AUDITADA</p>
            <h2 className="font-mono text-[18px] leading-[1.1] font-medium text-[#08D9D6]">
              <AnimatedNumber value={formatCurrency(savingsVersusWorst)} />
            </h2>
            <p className="mt-1 text-[7px] font-bold text-[#6a6a6a] uppercase tracking-tight">
              POUPADO VS MAIS CARO
            </p>
          </div>
        </div>
      </div>

      {/* OTIMIZAÇÃO REAL */}
      <div id="card-optimization-real" className="bp-card-accent-magenta">
        <div className="bp-card h-full group">
          <div className="p-2 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-1">
              <div className="bp-card-icon bg-[#A82047]/10 text-[#A82047]" style={{padding:'3px', borderRadius:'5px'}}>
                <Percent className="h-3 w-3" />
              </div>
            </div>
            <p className="text-[8px] font-bold text-[#252A34] uppercase tracking-wide mb-0.5">OTIMIZAÇÃO REAL</p>
            <h2 className="font-mono text-[18px] leading-[1.1] font-medium text-[#A82047]">
              <AnimatedNumber value={optimizationPercent > 0 ? `${optimizationPercent.toFixed(1)}%` : "0.0%"} />
            </h2>
            <p className="mt-1 text-[7px] font-bold text-[#6a6a6a] uppercase tracking-tight">
              EFICIÊNCIA MISTA ALCANÇADA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
