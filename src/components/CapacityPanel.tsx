import React from "react";
import { CapacityRow, SavedComparison, QuoteItem, ArchivedQuote } from "../types";
import { formatCurrency, getPosteriorMonthLabel } from "../utils";
import { Save, AlertCircle, TrendingUp, TrendingDown, BarChart3, Users, ArrowUpRight, ArrowDownRight, Minus, Sparkles, BookOpen, Trash2, FolderOpen, Check, Filter, X, Calendar, Search } from "lucide-react";

interface CapacityPanelProps {
  capacityRows: CapacityRow[];
  mixedTotal: number;
  savedComparison: SavedComparison;
  currentItems: QuoteItem[];
  archivedQuotes: ArchivedQuote[];
  selectedCompareQuoteId: string;
  onUpdateCapacity: (month: string, capacity: number) => void;
  onUpdateValue: (month: string, value: number) => void;
  onSaveComparison: () => void;
  onClearComparison: () => void;
  onDeleteQuote: (id: string) => void;
  onLoadQuoteForEdit: (quote: ArchivedQuote) => void;
  onSelectCompareQuote: (id: string) => void;
  nextQuoteId: string;
  activeCategoryName?: string;
  activeCategoryId?: string;
  onPrint?: () => void;
  quoteDate?: string;
}

// Helper to determine the best price (cheapest) for an item across available suppliers
function getBestUnitPrice(item: { prices: Record<string, number | null> }): number {
  if (!item || !item.prices) return 0;
  const validPrices = Object.values(item.prices).filter(
    (price): price is number => price !== null && price > 0
  );
  return validPrices.length > 0 ? Math.min(...validPrices) : 0;
}

export default function CapacityPanel({
  capacityRows,
  mixedTotal,
  savedComparison,
  currentItems,
  archivedQuotes,
  selectedCompareQuoteId,
  onUpdateCapacity,
  onUpdateValue,
  onSaveComparison,
  onClearComparison,
  onDeleteQuote,
  onLoadQuoteForEdit,
  onSelectCompareQuote,
  nextQuoteId,
  activeCategoryName = "",
  activeCategoryId = "",
  onPrint,
  quoteDate,
}: CapacityPanelProps) {
  
  const [showFilters, setShowFilters] = React.useState<boolean>(false);
  const [filterStartDate, setFilterStartDate] = React.useState<string>("");
  const [filterEndDate, setFilterEndDate] = React.useState<string>("");
  const [filterCategory, setFilterCategory] = React.useState<string>("all");
  const [filterSearch, setFilterSearch] = React.useState<string>("");

  const parseToComparableDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    const dmyMatch = cleanStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      
      const timeMatch = cleanStr.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hour = parseInt(timeMatch[1], 10);
        const minute = parseInt(timeMatch[2], 10);
        return new Date(year, month, day, hour, minute, 0, 0);
      }
      return new Date(year, month, day, 0, 0, 0, 0);
    }
    const mesYrMatch = cleanStr.match(/^([a-z]{3})\/(\d{2})$/i);
    if (mesYrMatch) {
      const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      const mIndex = monthNames.indexOf(mesYrMatch[1].toLowerCase());
      let year = parseInt(mesYrMatch[2], 10);
      if (year < 100) year += 2000;
      if (mIndex !== -1) {
        return new Date(year, mIndex, 1, 0, 0, 0, 0);
      }
    }
    const parsed = Date.parse(cleanStr);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }
    return null;
  };

  const getLocalDate = (inputStr: string): Date | null => {
    if (!inputStr) return null;
    const parts = inputStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day, 0, 0, 0, 0);
    }
    return null;
  };

  const availableCategories = React.useMemo(() => {
    const cats = new Set<string>();
    archivedQuotes.forEach((q) => {
      if (q.categoryName) {
        cats.add(q.categoryName);
      } else {
        cats.add("Geral");
      }
    });
    return Array.from(cats);
  }, [archivedQuotes]);

  const filteredQuotes = React.useMemo(() => {
    const startObj = getLocalDate(filterStartDate);
    const endObj = getLocalDate(filterEndDate);

    const filtered = archivedQuotes.filter((quote) => {
      // 1. Date Filter
      const quoteDateObj = parseToComparableDate(quote.savedAt) || parseToComparableDate(quote.quoteDate);
      if (quoteDateObj) {
        if (startObj && quoteDateObj < startObj) return false;
        if (endObj && quoteDateObj > endObj) return false;
      }

      // 2. Category Filter
      if (filterCategory !== "all") {
        const qCat = quote.categoryName || "Geral";
        if (qCat.toLowerCase() !== filterCategory.toLowerCase()) return false;
      }

      // 3. Text Search Filter
      if (filterSearch.trim()) {
        const search = filterSearch.trim().toLowerCase();
        const searchable = [
          quote.id,
          quote.title || "",
          quote.userName || "",
          quote.chamadoNumber || "",
          quote.categoryName || "",
        ].join(" ").toLowerCase();
        if (!searchable.includes(search)) return false;
      }

      return true;
    });

    // Sort: most recent to oldest (descending)
    return filtered.sort((a, b) => {
      const dateA = parseToComparableDate(a.savedAt) || parseToComparableDate(a.quoteDate) || new Date(0);
      const dateB = parseToComparableDate(b.savedAt) || parseToComparableDate(b.quoteDate) || new Date(0);
      const timeDiff = dateB.getTime() - dateA.getTime();
      if (timeDiff !== 0) return timeDiff;

      // Fallback: higher quote ID comes first
      return b.id.localeCompare(a.id, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [archivedQuotes, filterStartDate, filterEndDate, filterCategory, filterSearch]);

  const activePosteriorMonth = quoteDate ? getPosteriorMonthLabel(quoteDate) : "jul/26";
  
  const isLimpeza = activeCategoryId === "material_limpeza" || (activeCategoryName.toLowerCase().includes("limpeza") && !activeCategoryName.toLowerCase().includes("extra") && !activeCategoryId.includes("extra"));
  
  // Calculate total item quantities in current quote
  const totalQtyCurrent = currentItems.reduce((acc, item) => acc + item.quantity, 0);

  // Synchronize dynamic active month value with mixedTotal
  const processedRows = capacityRows.map((row) => {
    if (row.month === activePosteriorMonth) {
      return { ...row, value: mixedTotal };
    }
    return row;
  });

  // Calculate standard spent per employee for each month (Value / Capacity)
  const rowsWithAverage = processedRows.map((row) => {
    const average = row.capacity > 0 ? row.value / row.capacity : 0;
    return { ...row, average };
  });

  // 1. Historical Average Spent per Employee (excluding the active Month) where Capacity > 0 and Value > 0
  const historicalRows = rowsWithAverage.filter((row) => row.month !== activePosteriorMonth);
  const validHistoricalRows = historicalRows.filter((row) => row.capacity > 0 && row.value > 0);
  
  const avgHistPerColab = validHistoricalRows.length > 0
    ? validHistoricalRows.reduce((sum, row) => sum + row.average, 0) / validHistoricalRows.length
    : 0;

  // 2. Projected Current Month Employee Cost (dynamic activePosteriorMonth) based on current Quote selection
  const julyRow = rowsWithAverage.find((row) => row.month === activePosteriorMonth);
  const julyCapacity = julyRow?.capacity ?? 0;
  const avgJulyPerColab = julyCapacity > 0 ? mixedTotal / julyCapacity : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 print:hidden text-[10px]">
      
      {/* 1. CAPACITY & GENERAL PLANNING PANEL - Equal column */}
      <div className="glass-card p-3 sm:p-3.5 rounded-xl print:border-slate-300 print:shadow-none">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-orange-100 text-orange-700 print:hidden">
              <Users className="h-3 w-3" />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-slate-900 leading-tight">Capacity & Planejamento</h3>
              <p className="text-[9px] text-slate-500 print:hidden">Análise de custo por funcionário</p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-black text-orange-800 border border-orange-200/40 print:hidden">
            Média vs Projeção
          </span>
        </div>

        {/* Capacity spreadsheet grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[9px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-[8px] font-bold text-slate-500 uppercase tracking-tight">
                <th className="py-1 px-1">Mês/Ano</th>
                <th className="py-1 px-1 text-center w-[50px]">Capacity</th>
                {isLimpeza && (
                  <>
                    <th className="py-1 px-1 text-right w-[60px]">Total Pago</th>
                    <th className="py-1 px-1 text-right bg-slate-100/20 w-[55px]">Gasto/Colab.</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rowsWithAverage.map((row) => {
                const isJuly = row.month === activePosteriorMonth;

                return (
                  <tr
                    key={row.month}
                    className={`transition-colors hover:bg-slate-55/35 ${
                      isJuly ? "bg-[#3b82f6]/5 border-l-2 border-[#3b82f6] font-bold" : ""
                    }`}
                  >
                    {/* Month Label */}
                    <td className="py-0.5 px-1 font-bold text-slate-800 uppercase tracking-tight">
                      {row.month}
                      {isJuly && (
                        <span className="block text-[9px] font-extrabold text-[#0f172a] uppercase leading-none mt-0.5">
                          Ativo (Cotação)
                        </span>
                      )}
                    </td>

                    {/* Capacity input */}
                    <td className="py-0 px-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row.capacity === 0 ? "" : row.capacity}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          onUpdateCapacity(row.month, val === "" ? 0 : parseInt(val, 10));
                        }}
                        className={`w-full text-center bg-transparent py-0.5 font-bold text-slate-850 border rounded-md border-transparent hover:border-slate-250 focus:bg-white focus:border-slate-400 transition-all focus:ring-0 focus:outline-hidden text-[9px] ${
                          isJuly ? "bg-[#3b82f6]/10 border-[#3b82f6]/30" : ""
                        }`}
                        placeholder="0"
                      />
                    </td>

                    {isLimpeza && (
                      <>
                        {/* Value paid input */}
                        <td className="py-0 px-1 text-right">
                          {isJuly ? (
                            <div className="flex flex-col items-end pr-1 justify-center h-full">
                              <span className="font-extrabold text-[#3b82f6] font-mono leading-none text-[9px]">
                                {formatCurrency(row.value)}
                              </span>
                            </div>
                          ) : (
                            <div className="ml-auto rounded-md border border-transparent focus-within:border-slate-200 focus-within:bg-white px-0.5 py-0 rounded transition-all">
                              <PriceInputCapacity
                                value={row.value}
                                onChange={(val) => onUpdateValue(row.month, val ?? 0)}
                              />
                            </div>
                          )}
                        </td>

                        {/* Calculated Average Spent per Collaborator */}
                        <td className="py-0.5 px-1 text-right font-mono font-bold text-slate-800 bg-slate-50/10 text-[9px]">
                          {row.average > 0 ? (
                            <span className={isJuly ? "text-[#0f172a] font-extrabold" : "text-slate-700"}>
                              {formatCurrency(row.average)}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal">R$ 0,00</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* METRICA DO GASTO POR COLABORADOR CARD */}
        {isLimpeza && (
          <div className="mt-1.5 p-2 rounded-lg border border-orange-100 bg-orange-50/25 space-y-1 print:border-slate-300">
            <div className="flex justify-between items-center text-[9px]/none font-bold">
              <span className="text-slate-700 flex items-center gap-0.5">
                <Sparkles className="h-2.5 w-2.5 text-orange-500 shrink-0" />
                Eficiência (R$/colab):
              </span>
              <span className="inline-flex items-center rounded-sm bg-orange-100 px-1 py-0.5 text-[9px] text-orange-850 uppercase tracking-wider">
                Auditoria Ativa
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-1.5 text-[9px]">
              <div className="bg-white/90 p-1.5 rounded-md border border-slate-150 shadow-3xs leading-tight">
                <span className="text-[9px] text-slate-450 uppercase block font-bold">Média Histórica (6m)</span>
                <span className="font-bold text-slate-700 font-mono mt-0.5 block">
                  {avgHistPerColab > 0 ? formatCurrency(avgHistPerColab) : "R$ 0,00"}
                </span>
              </div>
              
              <div className={`p-1.5 rounded-md border border-transparent shadow-3xs leading-tight ${julyCapacity > 0 ? "bg-[#3b82f6]/10 border-[#3b82f6]/20" : "bg-white/90 border-slate-150"}`}>
                <span className="text-[9px] text-[#0f172a] uppercase block font-bold">Projeção Cotação (Jul)</span>
                <span className="font-extrabold text-[#0f172a] font-mono mt-0.5 block">
                  {avgJulyPerColab > 0 ? formatCurrency(avgJulyPerColab) : "R$ 0,00"}
                </span>
              </div>
            </div>

            {/* Detailed comparative trend report of cost per employee */}
            {avgHistPerColab > 0 && avgJulyPerColab > 0 ? (
              <div className="rounded-md bg-white p-1.5 border border-slate-150 text-[9px] leading-snug font-semibold">
                {avgJulyPerColab < avgHistPerColab ? (
                  <div className="text-emerald-850 flex items-start gap-1">
                    <TrendingDown className="h-3.5 w-3.5 mt-0.5 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Meta Atingida!</strong> Redução de <strong>{((1 - avgJulyPerColab / avgHistPerColab) * 100).toFixed(1)}%</strong> sobre a média histórica do semestre.
                    </span>
                  </div>
                ) : (
                  <div className="text-rose-850 flex items-start gap-1">
                    <TrendingUp className="h-3.5 w-3.5 mt-0.5 text-rose-600 shrink-0" />
                    <span>
                      <strong>Efeito Alerta:</strong> Custo por cabeça está <strong>{((avgJulyPerColab / avgHistPerColab - 1) * 100).toFixed(1)}% acima</strong> da média de registros.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[9px] text-slate-500 font-medium">
                * Insira o número de funcionários do mês de <strong>{activePosteriorMonth}</strong> acima para auditar.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. QUANTITATIVE & PRICING COMPARATIVE PANEL - Equal column */}
      <div className="glass-card p-3 sm:p-3.5 rounded-xl print:border-slate-300 print:shadow-none">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 print:hidden">
              <BarChart3 className="h-3 w-3" />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-slate-905 leading-tight">COMPARATIVO</h3>
              <p className="text-[9px] text-slate-500 print:hidden">Auditória comparativa de preços</p>
            </div>
          </div>
        </div>

        {/* Dynamic drop-down to select which past quote to compare with */}
        {archivedQuotes.length > 0 && (
          <div className="mb-2 pb-2 border-b border-slate-100 flex items-center justify-between gap-1 print:hidden">
            <span className="text-[9px] font-extrabold uppercase text-slate-405 leading-none shrink-0">Comparar com:</span>
            <select
              value={selectedCompareQuoteId}
              onChange={(e) => onSelectCompareQuote(e.target.value)}
              className="w-full text-[9px] font-bold border border-slate-200 text-slate-800 rounded-md py-0.5 px-1 bg-slate-50 focus:outline-hidden cursor-pointer"
            >
              <option value="">(Última Salva como Padrão)</option>
              {archivedQuotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.id} {q.title ? `(${q.title})` : ""} - R$ {q.summary.mixedTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({q.quoteDate} por {q.userName.split(" ")[0]})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* COMPARATIVE RESULTS */}
        {savedComparison.isValid ? (
          <div className="space-y-2">
            {/* Quick summary stats */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-150 print:bg-white print:border-slate-350">
              <div className="space-y-0">
                <span className="text-[9px] text-slate-450 block font-bold uppercase tracking-wider">
                  Preço Misto
                </span>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-[9px] font-black text-slate-800 font-mono">
                    {formatCurrency(mixedTotal)}
                  </span>
                  <span className="text-[9px] text-slate-500 font-semibold">
                    vs {formatCurrency(savedComparison.totals.mixedTotal)}
                  </span>
                </div>
                {renderTotalTrend(mixedTotal, savedComparison.totals.mixedTotal)}
              </div>

              <div className="space-y-0">
                <span className="text-[9px] text-slate-450 block font-bold uppercase tracking-wider">
                  Volume Geral
                </span>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-[9px] font-black text-slate-800 font-mono">
                    {totalQtyCurrent} un
                  </span>
                  <span className="text-[9px] text-slate-500 font-semibold">
                    vs {savedComparison.totals.totalQuantity} un
                  </span>
                </div>
                {renderQtyTrend(totalQtyCurrent, savedComparison.totals.totalQuantity)}
              </div>
            </div>

            {/* Item-by-item price hike/drop and volume difference tracker */}
            <div>
              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-wide mb-1 flex items-center justify-between">
                <span>Variações por Item (vs {selectedCompareQuoteId || "Padrão"}):</span>
                <button
                  onClick={onClearComparison}
                  className="text-[9px] text-rose-600 hover:underline font-bold cursor-pointer print:hidden"
                >
                  Limpar Tudo
                </button>
              </h4>

              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-0.5 divide-y divide-slate-100">
                {currentItems.map((item) => {
                  // Find corresponding item in saved detailed comparison
                  const saved = savedComparison.itemsDetailed[item.id] || 
                                Object.values(savedComparison.itemsDetailed).find(x => x.name === item.name);
                  
                  const prevQty = saved ? saved.quantity : 0;
                  const qtyDiff = item.quantity - prevQty;

                  // Get best unit price currently vs. saved
                  const currentBestPrice = getBestUnitPrice(item);
                  const prevBestPrice = saved ? getBestUnitPrice(saved) : 0;

                  return (
                    <div key={item.id} className="pt-1 first:pt-0 space-y-0 leading-none">
                      <div className="flex items-center justify-between text-[9px]">
                        {/* Name */}
                        <span className="font-bold text-slate-800 truncate max-w-[110px]" title={item.name}>
                          {item.name || "Sem Nome"}
                        </span>

                        {/* Quantity Comparative Pill */}
                        <div className="flex items-center gap-0.5 font-mono text-[9px]">
                          <span className="text-slate-600">
                            {item.quantity} un <span className="text-[9px] text-slate-350">({prevQty} ant)</span>
                          </span>
                          {renderBadgeDiff(qtyDiff)}
                        </div>
                      </div>

                      {/* Display Unit Price Fluctuation */}
                      <div className="flex items-center justify-between text-[9px] text-slate-450 pl-0.5">
                        <span className="text-[9px]">Preço unitário min:</span>
                        <div className="flex items-center gap-0.5 font-mono">
                          <span className="font-bold text-slate-600">
                            {currentBestPrice > 0 ? formatCurrency(currentBestPrice) : "R$ 0,00"}
                          </span>
                          {renderPriceTrendMarkup(currentBestPrice, prevBestPrice, !saved)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-3 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <BookOpen className="h-5 w-5 text-slate-300 mb-0.5" />
            <h4 className="text-[9px] font-bold text-slate-700 leading-none">Sem Dados para Comparativo</h4>
            <p className="text-[9px] text-slate-500 mt-0.5 max-w-[160px] leading-tight">
              Gere ou selecione uma cotação arquivada para acompanhar no rastreador de flutuações de custos!
            </p>
          </div>
        )}
      </div>

      {/* 3. HISTÓRICO DE COTAÇÕES SALVAS COM ID ÚNICO - Equal column */}
      <div className="glass-card p-3 sm:p-3.5 rounded-xl print:border-slate-300 print:shadow-none">
        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100">
          <div className="flex items-center gap-1">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-pink-100 text-[#3b82f6]">
              <FolderOpen className="h-3 w-3" />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-slate-900 leading-none uppercase">Histórico Registrado</h3>
              <p className="text-[9px] text-slate-500">Banco de cotações com ID único</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-black uppercase rounded-md border transition-all cursor-pointer ${
                showFilters || filterStartDate || filterEndDate || filterCategory !== "all" || filterSearch.trim()
                  ? "bg-[#3b82f6] text-white border-[#3b82f6]"
                  : "bg-white border-slate-200 text-slate-600 hover:border-[#3b82f6]"
              }`}
              title="Filtrar cotações por período e categoria"
            >
              <Filter className="h-2.5 w-2.5" />
              <span>Filtrar</span>
              {(filterStartDate || filterEndDate || filterCategory !== "all" || filterSearch.trim()) && (
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
            <span className="inline-flex items-center rounded-sm bg-pink-50 border border-pink-100/50 px-1 py-0.5 text-[9px] font-black text-[#3b82f6]">
              {filteredQuotes.length} / {archivedQuotes.length}
            </span>
          </div>
        </div>

        {/* Expandable Filter Box */}
        {showFilters && (
          <div className="mb-2 p-1.5 rounded-lg border border-slate-150 bg-slate-50/50 text-[9px] space-y-1 animate-fade-in">
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-450 mb-0.5">
                Buscar por ID, título, responsável ou chamado
              </label>
              <div className="relative">
                <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Ex: COT-003, Recepção..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full text-[9px] pl-4 pr-1 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-slate-700 focus:outline-hidden"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-450 mb-0.5 flex items-center gap-0.5">
                  <Calendar className="h-2 w-2 text-slate-500" /> Data Inicial
                </label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full text-[9px] p-0.5 px-1 bg-white border border-slate-200 rounded-md font-bold font-mono text-slate-700 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-450 mb-0.5 flex items-center gap-0.5">
                  <Calendar className="h-2 w-2 text-slate-500" /> Data Final
                </label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full text-[9px] p-0.5 px-1 bg-white border border-slate-200 rounded-md font-bold font-mono text-slate-700 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-1 items-end">
              <div className="col-span-8">
                <label className="block text-[9px] font-black uppercase text-slate-450 mb-0.5">
                  Categoria
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full text-[9px] p-0.5 px-1 bg-white border border-slate-200 rounded-md font-bold uppercase text-slate-700 focus:outline-hidden"
                >
                  <option value="all">TODAS CATEGORIAS</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setFilterStartDate("");
                    setFilterEndDate("");
                    setFilterCategory("all");
                    setFilterSearch("");
                  }}
                  className="w-full py-0.5 text-center bg-white border border-slate-200 hover:border-[#3b82f6] hover:bg-rose-50 text-slate-550 hover:text-[#3b82f6] font-black tracking-wide uppercase rounded-md transition-all cursor-pointer text-[9px]"
                  title="Limpar todos os filtros ativos"
                >
                  LIMPAR
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredQuotes.length > 0 ? (
          <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
            {filteredQuotes.map((quote) => {
              const isComparing = quote.id === selectedCompareQuoteId;

              return (
                <div
                  key={quote.id}
                  onClick={() => {
                    onLoadQuoteForEdit(quote);
                  }}
                  className={`p-1.5 rounded-lg transition-all border text-[9px]/tight cursor-pointer ${
                    isComparing 
                      ? "bg-[#3b82f6]/5 border-[#3b82f6]/30 hover:border-[#3b82f6]/50" 
                      : "bg-slate-50/50 border-slate-150 hover:bg-slate-100 uppercase"
                  }`}
                  title="Clique para carregar e editar esta cotação na planilha"
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5 flex-wrap">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-extrabold text-[#3b82f6] text-[9px]">
                        #{quote.id}
                      </span>
                      <span className="inline-block text-[8px] bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/25 px-1 py-0 rounded font-black uppercase">
                        {quote.categoryName || "Geral"}
                      </span>
                    </div>
                    <span className="text-[8px] text-slate-500 font-semibold font-mono">
                      {quote.savedAt}
                    </span>
                  </div>

                  <p className="text-slate-500 font-bold uppercase text-[8px] truncate">
                    por <strong className="text-slate-800 font-black">{quote.userName.split(" ")[0]}</strong>
                  </p>

                  {quote.title && (
                    <p className="text-[#3b82f6] font-black uppercase text-[8px] tracking-tight truncate mt-0.5">
                      {quote.title.toUpperCase()}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-0.5 pt-1 border-t border-dotted border-slate-200">
                    <span className="font-extrabold font-mono text-[9px] text-slate-900">
                      {formatCurrency(quote.summary.mixedTotal)}
                    </span>
                    
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCompareQuote(quote.id);
                        }}
                        className={`p-0.5 rounded-sm cursor-pointer transition-colors ${
                          isComparing 
                            ? "bg-[#3b82f6] text-white" 
                            : "bg-white border border-slate-200 hover:border-[#3b82f6] text-slate-500 hover:text-[#3b82f6]"
                        }`}
                        title="Usar esta cotação como referência para comparação"
                      >
                        <Check className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadQuoteForEdit(quote);
                        }}
                        className="p-0.5 rounded-sm bg-white border border-slate-200 hover:border-[#3b82f6] text-slate-405 hover:text-[#3b82f6] cursor-pointer transition-colors"
                        title="Carregar de volta na planilha para editar"
                      >
                        <FolderOpen className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteQuote(quote.id);
                        }}
                        className="p-0.5 rounded-sm bg-white border border-slate-200 hover:border-rose-600 hover:bg-rose-50 text-slate-405 hover:text-rose-605 cursor-pointer transition-colors"
                        title="Excluir permanentemente do histórico"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : archivedQuotes.length > 0 ? (
          <div className="py-3 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-150 text-slate-500">
            <Filter className="h-4 w-4 mx-auto text-slate-305 mb-0.5 text-slate-500" />
            <p className="text-[9px] font-bold">Nenhum resultado filtrado.</p>
            <p className="text-[9px] max-w-[190px] mx-auto text-slate-450 mt-0.5">
              Ajuste as datas/categoria ou clique em <strong>"Limpar"</strong> para ver tudo.
            </p>
          </div>
        ) : (
          <div className="py-3 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-150 text-slate-500">
            <FolderOpen className="h-4 w-4 mx-auto text-slate-300 mb-0.5" />
            <p className="text-[9px] font-bold">Nenhuma cotação arquivada.</p>
            <p className="text-[8px] max-w-[190px] mx-auto text-slate-450 mt-0.5">
              Insira preços e clique em <strong>"Nova Cotação"</strong> para arquivar.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

interface PriceInputCapacityProps {
  value: number;
  onChange: (val: number | null) => void;
}

function PriceInputCapacity({ value, onChange }: PriceInputCapacityProps) {
  const [localVal, setLocalVal] = React.useState<string>(
    value > 0 ? value.toFixed(2).replace(".", ",") : ""
  );

  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (document.activeElement !== ref.current) {
      setLocalVal(value > 0 ? value.toFixed(2).replace(".", ",") : "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^0-9.,]/g, "");
    setLocalVal(sanitized);

    if (sanitized === "") {
      onChange(0);
    } else {
      const cleanInput = sanitized.replace(",", ".");
      const parsed = parseFloat(cleanInput);
      if (!isNaN(parsed) && parsed >= 0) {
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    if (value > 0) {
      setLocalVal(value.toFixed(2).replace(".", ","));
    } else {
      setLocalVal("");
    }
  };

  return (
    <div className="flex items-center justify-end">
      <span className="text-[8px] text-slate-300 mr-0.5 font-bold font-mono">R$</span>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={localVal}
        onChange={handleChange}
        onBlur={handleBlur}
        className="text-right w-12 bg-transparent p-0 border-0 font-bold text-slate-700 focus:ring-0 outline-hidden focus:outline-hidden text-[9px]"
        placeholder="0,00"
      />
    </div>
  );
}

// Trend badge calculations
function renderTotalTrend(curr: number, prev: number) {
  const diff = curr - prev;
  if (prev === 0) return null;
  const pct = (diff / prev) * 100;

  if (diff < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-700 bg-emerald-50 px-1 rounded-sm leading-none mt-0.5">
        <TrendingDown className="h-2.5 w-2.5" />
        -{Math.abs(pct).toFixed(1)}% economizado
      </span>
    );
  } else if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-700 bg-amber-50 px-1 rounded-sm leading-none mt-0.5">
        <TrendingUp className="h-2.5 w-2.5" />
        +{pct.toFixed(1)}% custo
      </span>
    );
  }
  return <span className="text-[9px] text-slate-500 font-bold mt-0.5 block">Sem alteração</span>;
}

function renderQtyTrend(curr: number, prev: number) {
  const diff = curr - prev;
  if (diff < 0) {
    return (
      <span className="text-[9px] text-emerald-600 font-black">
        Redução ({diff} un)
      </span>
    );
  } else if (diff > 0) {
    return (
      <span className="text-[9px] text-orange-600 font-black">
        Aumento (+{diff} un)
      </span>
    );
  }
  return <span className="text-[9px] text-slate-500 font-bold">Inalterado</span>;
}

function renderBadgeDiff(diff: number) {
  if (diff === 0) {
    return <span className="px-1 py-0.5 rounded-md bg-slate-50 text-[9px] font-bold text-slate-500 border border-slate-200/50">0</span>;
  }
  if (diff > 0) {
    return (
      <span className="px-1 py-0.5 rounded-md bg-amber-50 text-[9px] font-extrabold text-[#F59E0B] border border-amber-200/50">
        +{diff}
      </span>
    );
  }
  return (
    <span className="px-1 py-0.5 rounded-md bg-emerald-50 text-[9px] font-extrabold text-emerald-705 border border-emerald-250/30">
      {diff}
    </span>
  );
}

// Render dynamic unit price direction (Aumentou ou Diminuiu)
function renderPriceTrendMarkup(current: number, previous: number, isNewItem: boolean) {
  if (isNewItem) {
    return (
      <span className="px-1 py-0.5 rounded-sm bg-blue-50 text-[9px] font-black text-blue-800 border border-blue-200/50">
        Novo Produto
      </span>
    );
  }
  if (previous === 0 || current === 0) {
    return (
      <span className="text-slate-300 text-[9px] flex items-center gap-0.5">
        <Minus className="h-2.5 w-2.5" />
        s/ inf.
      </span>
    );
  }

  const diff = current - previous;
  const pct = (diff / previous) * 100;

  if (diff > 0.005) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-600" title="Preço aumentou">
        <ArrowUpRight className="h-2.5 w-2.5 shrink-0 text-rose-500" />
        +{pct.toFixed(1)}%
      </span>
    );
  } else if (diff < -0.005) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600" title="Preço caiu">
        <ArrowDownRight className="h-2.5 w-2.5 shrink-0 text-emerald-500" />
        {pct.toFixed(1)}%
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-350" title="Preço mantido">
      <Minus className="h-2.5 w-2.5 shrink-0 text-slate-300" />
      Mantido
    </span>
  );
}
