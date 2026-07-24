import React from "react";
import { formatCurrency } from "../utils";
import { CalendarClock, TrendingDown, TrendingUp, Users, ShoppingCart, HelpCircle } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export interface LimpezaHistoryEntry {
  month: string;
  total: number;
  bestSupplier: string;
  itemsCount: number;
  savings: number;
  capacity?: number;
}

interface LimpezaHistoryDashboardProps {
  history: LimpezaHistoryEntry[];
}

const translateMonthYearLabel = (monthLabel: string): string => {
  if (!monthLabel) return "";
  const parts = monthLabel.trim().split("/");
  if (parts.length !== 2) return monthLabel.toUpperCase();
  
  const m = parts[0].toLowerCase().trim();
  const y = parts[1].trim();
  
  const monthNamesFull: Record<string, string> = {
    jan: "Janeiro",
    fev: "Fevereiro",
    mar: "Março",
    abr: "Abril",
    mai: "Maio",
    jun: "Junho",
    jul: "Julho",
    ago: "Agosto",
    set: "Setembro",
    out: "Outubro",
    nov: "Novembro",
    dez: "Dezembro",
  };
  
  const fullMonth = monthNamesFull[m] || m.toUpperCase();
  const fullYear = y.length === 2 ? `20${y}` : y;
  
  return `${fullMonth} / ${fullYear}`;
};

const getMonthName = (m: string) => {
  return translateMonthYearLabel(m);
};


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl shadow-lg text-[11px]">
        <p className="font-extrabold text-white mb-1.5 uppercase tracking-wide text-center bg-slate-800 py-0.5 px-1.5 rounded">{label}</p>
        <div className="space-y-1">
          <p className="font-extrabold text-[#3b82f6] flex justify-between gap-6">
            <span>Compra :</span>
            <span>R$ {payload[0]?.value?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
          {payload[1] && (
            <p className="font-extrabold text-[#0284C7] flex justify-between gap-6">
              <span>Colaboradores:</span>
              <span>{payload[1]?.value} colab.</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function LimpezaHistoryDashboard({ history }: LimpezaHistoryDashboardProps) {
  // Map data specifically for the twin chart
  const chartData = history.map((entry) => ({
    name: getMonthName(entry.month),
    total: entry.total,
    capacity: entry.capacity || 0,
  }));

  return (
    <div className="mb-6 animate-fade-in print:hidden">
      {/* Small Header */}
      <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
        <CalendarClock className="h-4 w-4 text-orange-500" />
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
          Histórico de Compras & Tendência (Últimos 3 Meses) — Material de Limpeza
        </span>
      </div>

      {/* Grid containing cards and chart in the same row on large screens */}
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 items-stretch">
        {history.map((entry, idx) => {
          // Calculate percentage trend and value difference from the previous month
          let trendPercent: number | null = null;
          let valDiff: number | null = null;
          
          if (idx > 0) {
            const prevTotal = history[idx - 1].total;
            valDiff = entry.total - prevTotal;
            if (prevTotal > 0) {
              trendPercent = (valDiff / prevTotal) * 100;
            }
          }

          const isDown = valDiff !== null && valDiff < 0;
          const isUp = valDiff !== null && valDiff > 0;

          const displayMonth = translateMonthYearLabel(entry.month).toUpperCase();

          return (
            <div
              key={entry.month}
              className="sm:col-span-1 lg:col-span-2 bg-white rounded-lg px-2 py-1.5 shadow-5xs border border-slate-150 transition-all hover:bg-slate-50/50 flex flex-col justify-between min-h-[115px] overflow-hidden"
            >
              {/* Header: Month name */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black tracking-wider text-slate-500 uppercase truncate">
                  {displayMonth}
                </span>
              </div>

              {/* Pricing */}
              <div className="my-0.5">
                <span className="text-[12px] font-black text-slate-800 font-mono tracking-tight leading-none block">
                  {formatCurrency(entry.total)}
                </span>
              </div>

              {/* Items & Colab info */}
              <div className="text-[11px] font-black text-slate-500 uppercase font-mono tracking-wider">
                {entry.itemsCount} Itens {entry.capacity ? `• ${entry.capacity} Colab.` : ""}
              </div>

              {/* Trend banner at the bottom */}
              <div className="mt-1">
                {idx === 0 ? (
                  <span className="text-[11px] font-black text-slate-500 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 uppercase tracking-wider block text-center">
                    Mês Referência
                  </span>
                ) : isDown ? (
                  <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50/80 border border-emerald-100/50 px-1 py-0.5 rounded flex items-center justify-center gap-0.5 uppercase tracking-wider">
                    <TrendingDown className="h-2 w-2 text-emerald-600 shrink-0" strokeWidth={3} />
                    Red.: {formatCurrency(Math.abs(valDiff!))} ({-trendPercent!.toFixed(1)}%)
                  </span>
                ) : isUp ? (
                  <span className="text-[11px] font-extrabold text-rose-600 bg-rose-50/80 border border-rose-100/50 px-1 py-0.5 rounded flex items-center justify-center gap-0.5 uppercase tracking-wider">
                    <TrendingUp className="h-2 w-2 text-rose-600 shrink-0" strokeWidth={3} />
                    Aum.: {formatCurrency(valDiff!)} (+{trendPercent!.toFixed(1)}%)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-550 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded block text-center uppercase">
                    Sem alteração
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Right side: Dual line trends chart - slightly larger than the cards area */}
        <div className="sm:col-span-2 lg:col-span-6 bg-white rounded-lg p-2 shadow-5xs border border-slate-150 flex flex-col justify-between min-h-[115px]">
          <div className="flex items-center justify-between mb-0.5 pb-0.5 border-b border-slate-100/80">
            <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase flex items-center gap-1">
              <Users className="h-2 w-2 text-[#0284C7]" strokeWidth={3} />
              <ShoppingCart className="h-2 w-2 text-[#3b82f6]" strokeWidth={3} />
              Evolução das Compras vs. Colaboradores
            </span>
            <span className="text-[11px] bg-[#3b82f6]/10 text-[#3b82f6] font-black px-1.5 py-0.5 rounded uppercase font-mono">
              Compra vs Colab
            </span>
          </div>

          <div className="h-[68px] w-full" style={{ minWidth: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 2, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 6, fontWeight: 700, fill: "#94a3b8" }}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 6, fontWeight: 700, fill: "#3b82f6" }}
                  tickFormatter={(v) => `R$${Math.round(v)}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 6, fontWeight: 700, fill: "#0284C7" }}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={{ r: 2, strokeWidth: 1.2, fill: "#fff" }}
                  activeDot={{ r: 3 }}
                  name="Compra"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="capacity"
                  stroke="#0284C7"
                  strokeWidth={1.5}
                  dot={{ r: 2, strokeWidth: 1.2, fill: "#fff" }}
                  activeDot={{ r: 3 }}
                  name="Colab"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-around text-[11px] font-black uppercase mt-0.5 text-slate-500">
            <span className="flex items-center gap-1 text-[#3b82f6]">
              <span className="h-1 w-2 bg-[#3b82f6] rounded-xs" /> Valor Comprado
            </span>
            <span className="flex items-center gap-1 text-[#0284C7]">
              <span className="h-1 w-2 bg-[#0284C7] rounded-xs" /> Colaboradores
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
