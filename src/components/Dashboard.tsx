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

  const cards = [
    {
      id: "card-mixed-best",
      label: "MELHOR COMPRA MISTA",
      value: formatCurrency(mixedTotal),
      detail: "RECOMENDADO",
      detailBadge: true,
      icon: <CheckCircle className="h-4 w-4" />,
      accentClass: "bp-card-accent-pink",
      iconBg: "bg-[rgba(255,42,109,0.05)]",
      iconColor: "text-[#ff2a6d]",
      valueColor: "text-[#111c2e]",
    },
    {
      id: "card-store-best",
      label: "MELHOR LOJA ÚNICA",
      value: bestSupplier ? formatCurrency(bestSupplierTotal) : "R$ 0,00",
      detail: bestSupplier ? `FORNECEDOR: ${bestSupplier.name}` : "Total fornecedor único",
      detailBadge: false,
      icon: <Building className="h-4 w-4" />,
      accentClass: "bp-card-accent-slate",
      iconBg: "bg-[rgba(100,116,139,0.05)]",
      iconColor: "text-slate-500",
      valueColor: "text-[#111c2e]",
    },
    {
      id: "card-savings-audit",
      label: "ECONOMIA AUDITADA",
      value: formatCurrency(savingsVersusWorst),
      detail: "Poupado vs mais caro",
      detailBadge: false,
      icon: <TrendingDown className="h-4 w-4" />,
      accentClass: "bp-card-accent-emerald",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-600",
    },
    {
      id: "card-optimization-real",
      label: "OTIMIZAÇÃO REAL",
      value: optimizationPercent > 0 ? `${optimizationPercent.toFixed(1)}%` : "0.0%",
      detail: "Eficiência mista alcançada",
      detailBadge: false,
      icon: <Percent className="h-4 w-4" />,
      accentClass: "bp-card-accent-pink",
      iconBg: "bg-[rgba(255,42,109,0.05)]",
      iconColor: "text-[#ff2a6d]",
      valueColor: "text-[#ff2a6d]",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 print:mb-3 print:grid-cols-4 print:gap-3">
      {cards.map((card, index) => (
        <div
          key={card.id}
          id={card.id}
          className="md:col-span-3 card-reveal opacity-0"
          style={{ animationDelay: `${index * 0.08}s` }}
        >
          <div className="bp-card h-full">
            {/* Left accent bar */}
            <div className={`bp-card-accent ${card.accentClass}`} />

            <div className="p-5 pl-6 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-3">
                <div className={`bp-card-icon ${card.iconBg} ${card.iconColor}`}>
                  {card.icon}
                </div>
                {card.detailBadge && (
                  <span className="bp-badge bp-badge-pink">{card.detail}</span>
                )}
                {!card.detailBadge && card.id === "card-savings-audit" && (
                  <span className="material-symbols-outlined text-emerald-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{card.label}</p>
                <h3 className={`text-2xl sm:text-3xl lg:text-[28px] xl:text-[30px] font-display font-extrabold ${card.valueColor} leading-none tracking-tight`}>
                  <AnimatedNumber value={card.value} />
                </h3>
              </div>

              <div className="mt-3">
                {!card.detailBadge ? (
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">
                    {card.detail}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
