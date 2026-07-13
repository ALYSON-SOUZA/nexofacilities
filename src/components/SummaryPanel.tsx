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

  // Compute exact contribution totals per supplier for cheapest composition
  const compositionTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    suppliers.forEach((s) => {
      totals[s.id] = 0;
    });

    items.forEach((item) => {
      const bestIds = itemBestSuppliers[item.id] || [];
      if (bestIds.length > 0) {
        // Assign first supplier in case of price ties
        const winningSupplierId = bestIds[0];
        if (totals[winningSupplierId] !== undefined) {
          const price = item.prices[winningSupplierId] ?? 0;
          totals[winningSupplierId] += item.quantity * price;
        }
      }
    });

    return totals;
  }, [suppliers, items, itemBestSuppliers]);

  // Find active suppliers (those with a total greater than 0)
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
    // Fallback if no supplier has any prices filled yet
    cheapestSupplierName = suppliers[0].name || "Fornecedor 1";
    cheapestSupplierTotal = 0;
    mostExpensiveSupplierName = suppliers[0].name || "Fornecedor 1";
    mostExpensiveSupplierTotal = 0;
  }

  // Savings math
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
    <div className="grid gap-4 md:grid-cols-2 mt-2 print:mt-4 print:grid-cols-2 print:gap-4 print:break-inside-avoid text-xs">
      
      {/* Composição Compra Mista Detail */}
      <div className="rounded-2xl border border-slate-205 bg-slate-50/40 p-4 shadow-3xs print:bg-white print:border-slate-300 print:shadow-none">
        <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-2.5 uppercase tracking-wide">
          <Briefcase className="h-4 w-4 text-slate-700 print:text-black hover:scale-105 transition-transform" />
          Composição da Compra Mista (Cenário de Melhor Preço)
        </h3>
        
        <div className="space-y-2">
          {suppliers.map((s, idx) => {
            const sum = compositionTotals[s.id] || 0;
            const percentage = mixedTotal > 0 ? (sum / mixedTotal) * 100 : 0;

            return (
              <div key={s.id} className="flex items-center justify-between text-[11px] leading-tight">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[#ff2a6d] shrink-0" />
                  <span className="font-black text-slate-900 uppercase text-[12.5px] md:text-[13.5px]">{s.name || `FORNECEDOR ${idx + 1}`}</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900 text-[12.5px] md:text-[13.5px] font-mono">{formatCurrency(sum)}</span>
                  <span className="text-[10px] text-slate-450 font-semibold block">
                    {percentage.toFixed(1)}% do total ótimo
                  </span>
                </div>
              </div>
            );
          })}

          <div className="border-t border-slate-200/60 pt-2 flex items-center justify-between bg-[#ff2a6d]/5 p-2.5 rounded-xl border border-[#ff2a6d]/35 text-slate-900">
            <span className="text-[10px] font-black uppercase">TOTAL MISTO COMBINADO:</span>
            <span className="text-sm font-black font-mono text-slate-950">{formatCurrency(mixedTotal)}</span>
          </div>
        </div>
      </div>

      {/* Relatório de Decisão Executiva (Facilities Report) */}
      <div className="rounded-2xl border border-slate-205 bg-white p-4 shadow-3xs print:border-slate-300 print:shadow-none">
        <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-2.5 uppercase tracking-wide">
          <PiggyBank className="h-4 w-4 text-[#ff2a6d] print:text-black animate-pulse" />
          Relatório de Economia & Gestão de Facilities
        </h3>

        <div className="space-y-2.5 text-[11px] text-slate-600">
          <div className="rounded-xl bg-emerald-50/40 p-2.5 border border-emerald-100/50 print:bg-white print:border-slate-350">
            <p className="font-bold text-emerald-950 flex items-center gap-1 mb-1 text-[11.5px] uppercase">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 print:text-black shrink-0" />
              Melhor Único Fornecedor (Consolidado)
            </p>
            <p className="text-slate-700 leading-normal text-[11px] font-semibold">
              Se fechar o pedido inteiro com apenas 1 fornecedor, a melhor opção é a{" "}
              <strong className="text-slate-905 text-[13px] md:text-[14px] font-black uppercase underline decoration-[#ff2a6d] decoration-2">
                {cheapestSupplierName}
              </strong>{" "}
              com o valor total de{" "}
              <strong className="text-slate-905 text-[13px] font-black font-mono">{formatCurrency(cheapestSupplierTotal)}</strong>.
            </p>

            {cheapestSupplierTotal > 0 && (
              <div className="mt-2.5 flex justify-end">
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
                    text += `Atenciosamente,\n*${opName}* — Nexo Facilities 🏢`;

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
                  className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#20ba56] text-white px-3 py-1 font-black text-[9.5px] uppercase rounded-full tracking-wide shadow-2xs cursor-pointer transition-all active:scale-95"
                  title="Enviar pedido consolidado inteiro para este fornecedor via WhatsApp"
                >
                  <span className="text-xs">💬</span> Enviar Pedido Fechado
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1 bg-slate-50/30 p-2.5 rounded-xl border border-slate-150 print:bg-white print:border-slate-250">
            <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold leading-tight">
              <span>Cenário Fechado Mais Caro ({mostExpensiveSupplierName}):</span>
              <span className="font-extrabold text-slate-800 font-mono text-[12px]">{formatCurrency(mostExpensiveSupplierTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold leading-tight">
              <span>Cenário Compra Mista (Cheapest Items):</span>
              <span className="font-extrabold text-emerald-800 font-mono text-[12px]">{formatCurrency(mixedTotal)}</span>
            </div>
            <div className="border-t border-slate-200/60 my-1 pb-0.5" />
            <div className="flex items-center justify-between text-slate-950 font-black leading-tight text-[11.5px]">
              <span className="uppercase tracking-tight">Economia Absoluta (Mista vs Mais Cara):</span>
              <span className="text-[#ff2a6d] font-black font-mono text-[13.5px]">{formatCurrency(maxSavings)}</span>
            </div>
            <div className="flex items-center justify-between font-black text-slate-700 leading-tight text-[10.5px]">
              <span className="uppercase tracking-tight text-slate-450">Economia Incremental (Mista vs Única Cheaper):</span>
              <span className="font-mono text-emerald-800 font-black text-[12.5px]">{formatCurrency(smartSavings)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
