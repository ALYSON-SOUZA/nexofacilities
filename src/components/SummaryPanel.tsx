import React from "react";
import { Supplier, ComparisonSummary } from "../types";
import { formatCurrency } from "../utils";
import { CheckCircle2, PiggyBank, Briefcase } from "lucide-react";

interface SummaryPanelProps {
  suppliers: Supplier[];
  items: any[];
  summary: ComparisonSummary;
}

export default function SummaryPanel({ suppliers, items, summary }: SummaryPanelProps) {
  const { supplierTotals, mixedTotal, itemBestSuppliers } = summary;

  const compositionTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    suppliers.forEach((s) => {
      totals[s.id] = 0;
    });

    items.forEach((item) => {
      const bestIds = itemBestSuppliers[item.id] || [];
      if (bestIds.length > 0) {
        const winningSupplierId = bestIds[0];
        if (totals[winningSupplierId] !== undefined) {
          const price = item.prices[winningSupplierId] ?? 0;
          totals[winningSupplierId] += item.quantity * price;
        }
      }
    });

    return totals;
  }, [suppliers, items, itemBestSuppliers]);

  const activeSuppliers = suppliers.filter((s) => (supplierTotals[s.id] || 0) > 0);

  let cheapestSupplierName = "Nenhum";
  let cheapestSupplierTotal = 0;
  let mostExpensiveSupplierName = "Nenhum";
  let mostExpensiveSupplierTotal = 0;

  if (activeSuppliers.length > 0) {
    let minT = Infinity;
    let maxT = -Infinity;

    activeSuppliers.forEach((s) => {
      const val = supplierTotals[s.id] || 0;
      if (val < minT) {
        minT = val;
        cheapestSupplierName = s.name;
        cheapestSupplierTotal = val;
      }
      if (val > maxT) {
        maxT = val;
        mostExpensiveSupplierName = s.name;
        mostExpensiveSupplierTotal = val;
      }
    });
  } else if (suppliers.length > 0) {
    cheapestSupplierName = suppliers[0].name || "Fornecedor 1";
    cheapestSupplierTotal = 0;
    mostExpensiveSupplierName = suppliers[0].name || "Fornecedor 1";
    mostExpensiveSupplierTotal = 0;
  }

  let maxSavings = Math.max(0, mostExpensiveSupplierTotal - mixedTotal);
  let smartSavings = Math.max(0, cheapestSupplierTotal - mixedTotal);

  if (suppliers.length === 1 || activeSuppliers.length === 1) {
    const singleSupplierId = activeSuppliers.length === 1 ? activeSuppliers[0].id : suppliers[0].id;
    const singleSupplierTotal = supplierTotals[singleSupplierId] || 0;
    const singleSupplierName = (activeSuppliers.length === 1 ? activeSuppliers[0].name : suppliers[0].name) || "MAXLIMP";

    cheapestSupplierName = singleSupplierName;
    cheapestSupplierTotal = singleSupplierTotal;
    mostExpensiveSupplierName = singleSupplierName;
    mostExpensiveSupplierTotal = singleSupplierTotal;
    maxSavings = singleSupplierTotal;
    smartSavings = 0;
  }

  return (
    <div className="grid gap-2 sm:gap-3 md:grid-cols-2 mt-2 print:mt-4 print:grid-cols-2 print:gap-4 print:break-inside-avoid text-[9px]">
      
      {/* Composição Compra Mista Detail - Equal module */}
      <div className="glass-card p-3 sm:p-4 rounded-xl print:bg-white print:border-slate-300 print:shadow-none">
          <h3 className="showcase-title-sm flex items-center gap-1.5 mb-2">
            <div className="showcase-icon showcase-icon-navy" style={{ width: 24, height: 24 }}>
              <Briefcase className="h-3.5 w-3.5" />
            </div>
            <span className="text-[9px]">Composição da Compra Mista</span>
          </h3>
          
          <p className="showcase-subtitle mb-2 text-[8px]">
            Cenário de Melhor Preço por Item
          </p>
          
          <div className="space-y-1">
            {suppliers.map((s, idx) => {
              const sum = compositionTotals[s.id] || 0;
              const percentage = mixedTotal > 0 ? (sum / mixedTotal) * 100 : 0;

              return (
                <div key={s.id} className="flex items-center justify-between text-[9px] leading-tight group/item hover:bg-slate-50/50 rounded-lg px-2 py-1 transition-colors duration-200">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#3b82f6] shrink-0 group-hover/item:scale-125 transition-transform duration-200" />
                    <span className="font-black text-slate-900 uppercase text-[9px]">{s.name || `FORNECEDOR ${idx + 1}`}</span>
                  </div>
                  <div className="text-right">
                    <span className="showcase-mono font-extrabold text-slate-900 text-[9px]">{formatCurrency(sum)}</span>
                    <span className="text-[8px] text-slate-500 font-semibold block">
                      {percentage.toFixed(1)}% do total
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="showcase-divider my-1" />

            <div className="flex items-center justify-between bg-[#3b82f6]/5 p-2 rounded-lg border border-[#3b82f6]/20 text-slate-900 transition-all duration-300">
              <span className="text-[8px] font-black uppercase tracking-wide">TOTAL MISTO:</span>
              <span className="showcase-mono text-[10px] font-black text-slate-900">{formatCurrency(mixedTotal)}</span>
            </div>
          </div>
      </div>

      {/* Relatório de Decisão Executiva - Equal module */}
      <div className="glass-card p-3 sm:p-4 rounded-xl print:border-slate-300 print:shadow-none">
          <h3 className="showcase-title-sm flex items-center gap-1.5 mb-2">
            <div className="showcase-icon showcase-icon-pink" style={{ width: 24, height: 24 }}>
              <PiggyBank className="h-3.5 w-3.5" />
            </div>
            <span className="text-[9px]">Relatório de Economia</span>
          </h3>

          <div className="space-y-2 text-[9px] text-slate-600">
            <div className="rounded-lg bg-emerald-50/40 p-2 border border-emerald-100/50 print:bg-white print:border-slate-350">
              <p className="font-bold text-emerald-950 flex items-center gap-1 mb-1 text-[8px] uppercase">
                <CheckCircle2 className="h-3 w-3 text-emerald-600 print:text-black shrink-0" />
                Melhor Único Fornecedor
              </p>
              <p className="text-slate-700 leading-normal text-[8px] font-semibold">
                Melhor opção:{" "}
                <strong className="text-slate-900 text-[10px] font-black uppercase decoration-[#3b82f6] decoration-2 underline-offset-2">
                  {cheapestSupplierName}
                </strong>{" "}
                —{" "}
                <strong className="showcase-mono text-slate-900 text-[9px] font-black">{formatCurrency(cheapestSupplierTotal)}</strong>
              </p>

              {cheapestSupplierTotal > 0 && (
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const cheapestSupplier = suppliers.find(s => s.name.toUpperCase() === cheapestSupplierName.toUpperCase()) || suppliers[0];
                      const quoteDate = localStorage.getItem("clean_quotes_date") || "jul/26";
                      const chamadoNum = localStorage.getItem("clean_quotes_chamado_number") || "00000000";
                      const opName = localStorage.getItem("clean_quotes_username") || "Comprador";
                      
                      let text = `*PEDIDO DE COMPRA INTEGRADO (CONSOLIDADO) — NEXO FACILITIES*\n`;
                      text += `*Chamado:* #${chamadoNum}\n`;
                      text += `*Para:* ${cheapestSupplier?.name || cheapestSupplierName}\n`;
                      if (cheapestSupplier?.vendedor) text += `*A/C Vendedor:* ${cheapestSupplier.vendedor}\n`;
                      text += `*Data:* ${new Date().toLocaleDateString("pt-BR")}\n\n`;
                      text += `Olá! Gostaríamos de confirmar o faturamento consolidado de todos os materiais listados abaixo:\n\n`;

                      let count = 0;
                      items.forEach((it) => {
                        if (it.name.trim() !== "" && (it.quantity || 0) > 0) {
                          const price = it.prices[cheapestSupplier?.id] || 0;
                          if (price > 0) {
                            count++;
                            text += `${count}. *${it.name.trim()}* — Qtd: ${it.quantity} un x R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} = *R$ ${(it.quantity * price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n`;
                          }
                        }
                      });

                      text += `\n*VALOR TOTAL CONSOLIDADO:* *R$ ${cheapestSupplierTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n\n`;
                      text += `Solicitamos emissão de faturamento de acordo com as condições faturadas.\n`;
                      text += `Atenciosamente,\n*${opName}* — Nexo Facilities`;

                      let cleanPhone = cheapestSupplier?.phone ? cheapestSupplier.phone.replace(/[^0-9]/g, "") : "";
                      if (cleanPhone && cleanPhone.length <= 11) {
                        if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                          cleanPhone = "55" + cleanPhone;
                        }
                      }
                      
                      const url = cleanPhone 
                        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
                        : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                      
                      window.open(url, "_blank");
                    }}
                    className="showcase-btn-primary text-[8px]"
                    title="Enviar pedido consolidado para este fornecedor via WhatsApp"
                  >
                    Enviar Pedido
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1 bg-slate-50/30 p-2 rounded-lg border border-slate-200 print:bg-white print:border-slate-250">
              <div className="flex items-center justify-between text-[8px] text-slate-600 font-bold leading-tight">
                <span>Mais Caro ({mostExpensiveSupplierName}):</span>
                <span className="showcase-mono font-extrabold text-slate-800 text-[9px]">{formatCurrency(mostExpensiveSupplierTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-[8px] text-slate-600 font-bold leading-tight">
                <span>Compra Mista:</span>
                <span className="showcase-mono font-extrabold text-emerald-800 text-[9px]">{formatCurrency(mixedTotal)}</span>
              </div>
              
              <div className="showcase-divider my-1" />
              
              <div className="flex items-center justify-between text-slate-950 font-black leading-tight text-[9px]">
                <span className="uppercase tracking-tight">Economia Absoluta:</span>
                <span className="showcase-mono text-[#3b82f6] font-black text-[10px]">{formatCurrency(maxSavings)}</span>
              </div>
              <div className="flex items-center justify-between font-black text-slate-700 leading-tight text-[8px]">
                <span className="uppercase tracking-tight text-slate-500">Economia Incremental:</span>
                <span className="showcase-mono text-emerald-800 font-black text-[9px]">{formatCurrency(smartSavings)}</span>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
