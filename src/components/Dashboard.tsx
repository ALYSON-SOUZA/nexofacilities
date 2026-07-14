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
      className="transition-all duration-700 ease-out"
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

  const cards = [
    {
      id: "card-mixed-best",
      label: "MELHOR COMPRA MISTA",
      value: formatCurrency(mixedTotal),
      detail: "RECOMENDADO",
      detailStyle: "bg-[#ff2a6d]/8 text-[#c21e54] border-[#ff2a6d]/15",
      icon: <CheckCircle className="h-4.5 w-4.5 text-[#ff2a6d] shrink-0" />,
      borderColor: "border-l-[#111c2e]",
      valueColor: "text-[#111c2e]",
      iconBg: "bg-[#ff2a6d]",
      glowColor: "rgba(8,255,42,109,0.06)",
    },
    {
      id: "card-store-best",
      label: "MELHOR LOJA ÚNICA",
      value: bestSupplier ? formatCurrency(bestSupplierTotal) : "R$ 0,00",
      detail: bestSupplier ? `FORNECEDOR: ${bestSupplier.name}` : "Total fornecedor único",
      detailStyle: "",
      icon: <Building className="h-4.5 w-4.5 text-slate-500 shrink-0" />,
      borderColor: "border-l-slate-700",
      valueColor: "text-[#111c2e]",
      iconBg: "bg-slate-700",
      glowColor: "rgba(37,42,52,0.04)",
    },
    {
      id: "card-savings-audit",
      label: "ECONOMIA AUDITADA",
      value: formatCurrency(savingsVersusWorst),
      detail: "Poupado vs mais caro",
      detailStyle: "",
      icon: <TrendingDown className="h-4.5 w-4.5 text-[#10B981] shrink-0" />,
      borderColor: "border-l-[#10B981]",
      valueColor: "text-[#10B981]",
      iconBg: "bg-[#10B981]",
      glowColor: "rgba(16,185,129,0.06)",
    },
    {
      id: "card-optimization-real",
      label: "OTIMIZAÇÃO REAL",
      value: optimizationPercent > 0 ? `${optimizationPercent.toFixed(1)}%` : "0.0%",
      detail: "Eficiência mista alcançada",
      detailStyle: "",
      icon: <Percent className="h-4.5 w-4.5 text-[#ff2a6d] shrink-0" />,
      borderColor: "border-l-[#ff2a6d]",
      valueColor: "text-[#ff2a6d]",
      iconBg: "bg-[#ff2a6d]",
      glowColor: "rgba(255,46,99,0.06)",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5 print:mb-3 print:grid-cols-4 print:gap-3">
      {cards.map((card) => (
        <div
          key={card.id}
          id={card.id}
          className={`group relative bg-white rounded-xl p-4 shadow-xs border border-slate-200/80 border-l-4 ${card.borderColor} transition-all duration-300 hover:shadow-lg hover:shadow-black/[0.04] hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden print:border-slate-300`}
        >
          {/* Subtle top-right glow on hover */}
          <div
            className="absolute -top-8 -right-8 w-20 h-20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: card.glowColor }}
          />

          <div className="flex items-start justify-between gap-1 relative z-10">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block leading-none">
                {card.label}
              </span>
            </div>
            <div className="p-1 rounded-lg transition-all duration-300 group-hover:scale-110" style={{ background: card.glowColor }}>
              {card.icon}
            </div>
          </div>

          <div className="mt-3 relative z-10">
            <span className={`text-2xl sm:text-3xl lg:text-[28px] xl:text-[32px] print:text-2xl font-black ${card.valueColor} leading-none tracking-tight block`}>
              <AnimatedNumber value={card.value} />
            </span>
            <div className="mt-2.5">
              {card.detailStyle ? (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider border ${card.detailStyle}`}>
                  {card.detail}
                </span>
              ) : (
                <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wide leading-normal">
                  {card.detail}
                </p>
              )}
            </div>
          </div>

          {/* Bottom-right decorative dot */}
          <div className="absolute -bottom-6 -right-6 w-12 h-12 rounded-full blur-xs pointer-events-none transition-all duration-500 group-hover:scale-150" style={{ background: card.glowColor }} />
        </div>
      ))}
    </div>
  );
}
