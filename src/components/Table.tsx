import React, { useState, useEffect } from "react";
import { Supplier, QuoteItem, ComparisonSummary } from "../types";
import { formatCurrency } from "../utils";
import { Plus, Trash2, X, Star, FileDown, ArrowUpRight, Sparkles, BookOpen, MessageSquare, Copy, Check, Send, HelpCircle } from "lucide-react";
import FileImporter, { parseRawLine } from "./FileImporter";
import * as XLSX from "xlsx";
import { FACILITIES_MATERIALS_PRESET } from "../data";
import { PRE_REGISTERED_SUPPLIERS } from "../suppliers_preset";
import { dbFetchKnownSuppliers, dbUpsertKnownSupplier } from "../supabaseClient";

interface TableProps {
  suppliers: Supplier[];
  items: QuoteItem[];
  summary: ComparisonSummary;
  onUpdateSupplierName: (id: string, name: string) => void;
  onUpdateSupplierDetails: (id: string, details: { name: string; phone?: string; vendedor?: string }) => void;
  onAddSupplier: () => void;
  onRemoveSupplier: (id: string) => void;
  onUpdateItemName: (id: string, name: string) => void;
  onUpdateItemQty: (id: string, qty: number) => void;
  onUpdateItemPrice: (itemId: string, supplierId: string, price: number | null) => void;
  onUpdateMultiplePrices?: (supplierId: string, startRowIndex: number, text: string) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onImportItems: (itemsList: { name: string; quantity: number }[], replaceCurrent: boolean) => void;
  onQuickAddItem: (name: string, qty: number) => void;
  suggestionItems?: string[];
  activeCategoryName?: string;
  onUpdateItemStock?: (itemId: string, field: "currentStock" | "minStock", value: number) => void;
  onUpdateMultipleQtys?: (startRowIndex: number, text: string) => void;
  onUpdateMultipleStocks?: (field: "currentStock" | "minStock", startRowIndex: number, text: string) => void;
  onUpdateItemObservation?: (id: string, observation: string) => void;
  onToggleItemPreferredSupplier?: (itemId: string, supplierId: string) => void;
  onToggleItemComprado?: (id: string) => void;
  onApplyImportProposal?: (newSuppliers: Supplier[], newItems: QuoteItem[]) => void;
}

// Supplier pastel styling index (compact layout pairing)
const STYLE_PALETTE = [
  {
    headerBg: "bg-[#08D9D6]/20 border-[#08D9D6]/35 text-slate-900",
    cellBg: "bg-[#08D9D6]/5",
    inputBorder: "focus-within:border-[#08D9D6] focus-within:ring-cyan-50",
    topBorder: "border-t-4 border-t-[#08D9D6]",
  },
  {
    headerBg: "bg-sky-105/90 border-sky-250 text-sky-950",
    cellBg: "bg-sky-50/15",
    inputBorder: "focus-within:border-sky-400 focus-within:ring-sky-50",
    topBorder: "border-t-4 border-t-sky-500",
  },
  {
    headerBg: "bg-emerald-105/90 border-emerald-250 text-emerald-950",
    cellBg: "bg-emerald-50/15",
    inputBorder: "focus-within:border-emerald-400 focus-within:ring-emerald-50",
    topBorder: "border-t-4 border-t-emerald-500",
  },
  {
    headerBg: "bg-purple-105/90 border-purple-250 text-purple-950",
    cellBg: "bg-purple-50/15",
    inputBorder: "focus-within:border-purple-400 focus-within:ring-purple-50",
    topBorder: "border-t-4 border-t-purple-500",
  },
  {
    headerBg: "bg-pink-105/90 border-pink-250 text-pink-950",
    cellBg: "bg-pink-50/15",
    inputBorder: "focus-within:border-pink-400 focus-within:ring-pink-50",
    topBorder: "border-t-4 border-t-[#FF2E63]",
  },
];

// Helper function to turn pasted URLs into clickable anchor links in the app & print view
function renderTextWithLinks(text: string) {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);
  
  if (parts.length === 1) {
    return text;
  }
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const cleanUrl = part.trim();
      const href = cleanUrl.toLowerCase().startsWith("http") ? cleanUrl : `https://${cleanUrl}`;
      return (
        <a 
          key={index} 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[#FF2E63] hover:text-rose-700 hover:underline underline font-bold break-all inline print:text-[#A82047]"
        >
          {cleanUrl}
        </a>
      );
    }
    return part;
  });
}

export default function Table({
  suppliers,
  items,
  summary,
  onUpdateSupplierName,
  onUpdateSupplierDetails,
  onAddSupplier,
  onRemoveSupplier,
  onUpdateItemName,
  onUpdateItemQty,
  onUpdateItemPrice,
  onUpdateMultiplePrices,
  onAddItem,
  onRemoveItem,
  onImportItems,
  onQuickAddItem,
  suggestionItems = [],
  activeCategoryName,
  onUpdateItemStock,
  onUpdateMultipleQtys,
  onUpdateMultipleStocks,
  onUpdateItemObservation,
  onToggleItemPreferredSupplier,
  onToggleItemComprado,
  onApplyImportProposal,
}: TableProps) {
  const { supplierTotals, itemBestSuppliers } = summary;

  // Local control states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickQty, setQuickQty] = useState<number>(1);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showStockPlanning, setShowStockPlanning] = useState(false);
  const [showQuickGuide, setShowQuickGuide] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppMsgType, setWhatsAppMsgType] = useState<"request" | "order">("request");
  const [whatsAppTargetSupplierId, setWhatsAppTargetSupplierId] = useState<string>("");
  const [copiedMsgFeedback, setCopiedMsgFeedback] = useState(false);

  // States for Supplier Edit Popup Modal
  const [selectedSupplierToEdit, setSelectedSupplierToEdit] = useState<Supplier | null>(null);

  // States for Observation Popup Modal
  const [observationModalItem, setObservationModalItem] = useState<QuoteItem | null>(null);

  // Active items for purchase count
  const activeItemsForCounter = React.useMemo(() => {
    return items.filter((it) => it.name.trim() !== "" && (it.quantity || 0) > 0);
  }, [items]);
  const totalToBuy = activeItemsForCounter.length;
  const totalBought = activeItemsForCounter.filter((it) => !!it.comprado).length;
  const totalRemaining = totalToBuy - totalBought;

  // Map of item.id -> sequence number (e.g. 1, 2, 3...)
  const itemObservationsOrder = React.useMemo(() => {
    const result: Record<string, number> = {};
    let count = 0;
    items.forEach((item) => {
      if (item.observation && item.observation.trim() !== "") {
        count++;
        result[item.id] = count;
      }
    });
    return result;
  }, [items]);

  // Comprehensive observations order list with supplier name, original item etc.
  const observationsList = React.useMemo(() => {
    const list: { id: string; num: number; itemName: string; supplierName: string; text: string }[] = [];
    let count = 0;
    items.forEach((item) => {
      if (item.observation && item.observation.trim() !== "") {
        count++;
        const bestIds = itemBestSuppliers[item.id] || [];
        const winningSupplierId = bestIds[0];
        const supplierName = winningSupplierId
          ? (suppliers.find((s) => s.id === winningSupplierId)?.name || "Sem Fornecedor")
          : "Não cotado";

        list.push({
          id: `obs ${count}`,
          num: count,
          itemName: item.name,
          supplierName,
          text: item.observation.trim(),
        });
      }
    });
    return list;
  }, [items, suppliers, itemBestSuppliers]);

  const isLimpeza = activeCategoryName?.toLowerCase().includes("limpeza") && 
                    !activeCategoryName?.toLowerCase().includes("extra");

  // Default known suppliers list for autocomplete recommendation in the popup
  const [knownSuppliers, setKnownSuppliers] = useState<{ name: string; phone?: string; vendedor?: string }[]>(() => {
    const defaultData = [
      { name: "ELO DISTRIB", phone: "(11) 98765-4321", vendedor: "Roberto" },
      { name: "MUNDIAL", phone: "(11) 97766-5544", vendedor: "Alessandro" },
      { name: "MAXLIMP S/A", phone: "(11) 96123-4567", vendedor: "Cristina" },
      { name: "FACILITIES CLEAN", phone: "(21) 99888-7711", vendedor: "Mariana" },
      { name: "DISTRIBUIDORA MASTER", phone: "(11) 3222-1100", vendedor: "Fernando" },
      { name: "CANTINHO DA LIMPEZA", phone: "(19) 98122-3344", vendedor: "Pedro" },
      { name: "MEGA HIGIENE", phone: "(11) 94002-8922", vendedor: "Priscila" },
      { name: "SÃO JOSÉ DESCARTÁVEIS", phone: "(11) 3300-8888", vendedor: "Ricardo" }
    ];
    try {
      const saved = localStorage.getItem("clean_quotes_known_suppliers");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error loading known suppliers:", e);
    }
    return defaultData;
  });

  // Pull known suppliers from Supabase on mount
  useEffect(() => {
    async function loadRemoteSuppliers() {
      try {
        const remoteList = await dbFetchKnownSuppliers();
        if (remoteList && remoteList.length > 0) {
          setKnownSuppliers(remoteList);
        }
      } catch (err) {
        console.warn("Table could not load known suppliers from Supabase:", err);
      }
    }
    loadRemoteSuppliers();
  }, []);

  const handleEmptyStatePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;

    const lines = text.split(/\r?\n/);
    const newList: { name: string; quantity: number }[] = [];

    lines.forEach((line) => {
      const parsed = parseRawLine(line);
      if (parsed) {
        newList.push({
          name: parsed.name,
          quantity: parsed.quantity,
        });
      }
    });

    if (newList.length > 0) {
      onImportItems(newList, true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "xlsx" || fileExtension === "xls") {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawGrid = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          const newList: { name: string; quantity: number }[] = [];
          for (const row of rawGrid) {
            if (!row || row.length === 0) continue;
            let detectedName = "";
            let detectedQty = 1;

            for (let c = 0; c < row.length; c++) {
              const val = row[c];
              if (val === null || val === undefined) continue;
              const cleanStr = String(val).trim();
              if (cleanStr === "") continue;

              if (typeof val === "number") {
                detectedQty = Math.round(val);
              } else if (typeof val === "string") {
                const lower = val.toLowerCase().trim();
                const isHeader = ["nome", "item", "produto", "quantidade", "qtd", "descrição", "material"].includes(lower);
                if (!isHeader && val.length > 1) {
                  detectedName = val.trim();
                }
              }
            }

            if (detectedName) {
              newList.push({
                name: detectedName,
                quantity: detectedQty > 0 ? detectedQty : 1,
              });
            }
          }

          if (newList.length > 0) {
            onImportItems(newList, true);
          }
        } catch (err) {
          console.error("Erro ao processar planilha arrastada:", err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileExtension === "csv" || fileExtension === "txt") {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split(/\r?\n/);
          const newList: { name: string; quantity: number }[] = [];

          lines.forEach((line) => {
            const parsed = parseRawLine(line);
            if (parsed) {
              newList.push({
                name: parsed.name,
                quantity: parsed.quantity,
              });
            }
          });

          if (newList.length > 0) {
            onImportItems(newList, true);
          }
        } catch (err) {
          console.error("Erro ao processar arquivo texto arrastado:", err);
        }
      };
      reader.readAsText(file);
    }
  };

  // Calculate dynamic composition totals for mixed purchase
  const compositionTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    suppliers.forEach((s) => {
      totals[s.id] = 0;
    });

    items.forEach((item) => {
      const bestIds = itemBestSuppliers[item.id] || [];
      if (bestIds.length > 0) {
        // Assign the cheapest to the first in ties
        const winningSupplierId = bestIds[0];
        if (totals[winningSupplierId] !== undefined) {
          const price = item.prices[winningSupplierId] ?? 0;
          totals[winningSupplierId] += item.quantity * price;
        }
      }
    });

    return totals;
  }, [suppliers, items, itemBestSuppliers]);

  // Reorganize items for print: group by winning/cheapest supplier, sorted alphabetically.
  // Remaining items at the bottom, also sorted alphabetically.
  const sortedPrintItems = React.useMemo(() => {
    const supplierGroups: Record<string, QuoteItem[]> = {};
    suppliers.forEach((s) => {
      supplierGroups[s.id] = [];
    });
    const remainingGroup: QuoteItem[] = [];

    items.forEach((item) => {
      const bestIds = itemBestSuppliers[item.id] || [];
      if (bestIds.length > 0) {
        const winningSupplierId = bestIds[0];
        if (supplierGroups[winningSupplierId] !== undefined) {
          supplierGroups[winningSupplierId].push(item);
        } else {
          remainingGroup.push(item);
        }
      } else {
        remainingGroup.push(item);
      }
    });

    const finalSorted: QuoteItem[] = [];
    suppliers.forEach((s) => {
      const groupItems = [...supplierGroups[s.id]];
      // Sort alphabetically by item name
      groupItems.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      finalSorted.push(...groupItems);
    });

    const sortedRemaining = [...remainingGroup];
    sortedRemaining.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    finalSorted.push(...sortedRemaining);

    return finalSorted;
  }, [suppliers, items, itemBestSuppliers]);

  return (
    <div className="rounded-2xl border border-slate-205 bg-white shadow-3xs overflow-visible mb-3 print:border-slate-350 print:shadow-none font-sans text-[11px] relative">
      
      {/* File Importer overlay overlay */}
      {isImportOpen && (
        <FileImporter
          suppliers={suppliers}
          items={items}
          onImportItems={(list, replaceMode) => {
            onImportItems(list, replaceMode);
            setIsImportOpen(false);
          }}
          onApplyImportProposal={(newSuppliers, newItems) => {
            if (onApplyImportProposal) {
              onApplyImportProposal(newSuppliers, newItems);
            }
            setIsImportOpen(false);
          }}
          onClose={() => setIsImportOpen(false)}
        />
      )}

      {/* NEW Upper Workbench Tool Bar for rapid search-to-insert dropdown & importing */}
      <div className="border-b border-slate-150 bg-slate-50/50 p-3 flex flex-wrap gap-3 items-center justify-between print:hidden rounded-t-2xl">
        
        {/* Quick Add Autocomplete widget */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!quickName.trim()) return;
            onQuickAddItem(quickName.trim(), quickQty);
            setQuickName("");
            setQuickQty(1);
          }}
          className="flex flex-wrap items-center gap-2 flex-1 min-w-[320px]"
        >
          <div className="flex-1 min-w-[200px] max-w-sm">
            <AutocompleteItemInput
              value={quickName}
              onChange={setQuickName}
              placeholder="🔍 Busque material pelo nome para adicionar..."
              suggestions={suggestionItems}
              className="w-full rounded-lg border border-slate-220 bg-white px-2.5 py-1.5 font-bold text-slate-900 placeholder:text-slate-400 focus:outline-[#FF2E63] text-[11px]"
            />
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Qtd:</span>
            <input
              type="number"
              min={1}
              value={quickQty}
              onChange={(e) => setQuickQty(Math.max(1, parseInt(e.target.value, 10)))}
              className="w-10 text-center rounded-lg border border-slate-220 bg-white py-1.5 font-extrabold text-[#FF2E63] text-[11px] focus:outline-[#FF2E63]"
            />
          </div>

          <button
            type="submit"
            disabled={!quickName.trim()}
            className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 font-black text-[10px] uppercase shadow-2xs transition-all cursor-pointer ${
              quickName.trim()
                ? "bg-[#252A34] hover:bg-slate-800 text-white"
                : "bg-slate-200 text-slate-450 cursor-not-allowed"
            }`}
          >
            <Plus className="h-3 w-3 text-[#FF2E63]" />
            Inserir na Planilha
          </button>
        </form>

        {/* Action button to open Excel / CSV Parser */}
        {isLimpeza && (
          <button
            type="button"
            onClick={() => setShowStockPlanning(!showStockPlanning)}
            className={`inline-flex items-center gap-1.5 text-xs font-black rounded-full px-3.5 py-1.5 shadow-2xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all shrink-0 leading-none ${
              showStockPlanning
                ? "bg-emerald-600 border border-emerald-700 text-white hover:bg-emerald-700"
                : "bg-white border border-slate-200 text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            {showStockPlanning ? "Ocultar Controle de Estoque" : "🎒 Planejar com Estoque"}
          </button>
        )}

        {/* Toggleable Quick Guide */}
        <button
          type="button"
          onClick={() => setShowQuickGuide(!showQuickGuide)}
          className={`inline-flex items-center gap-1.5 text-xs font-black rounded-full px-3.5 py-1.5 shadow-2xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all shrink-0 leading-none ${
            showQuickGuide
              ? "bg-[#252A34] text-white hover:bg-slate-850"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-55"
          }`}
          title="💡 Dicas e truques de produtividade"
        >
          <BookOpen className="h-3.5 w-3.5" />
          {showQuickGuide ? "Ocultar Guia" : "💡 Guia de Uso"}
        </button>

        {/* WhatsApp Generator Trigger */}
        <button
          type="button"
          onClick={() => {
            setWhatsAppTargetSupplierId(suppliers[0]?.id || "");
            setIsWhatsAppModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-pink-100 bg-pink-50 hover:bg-[#FF2E63] hover:text-white text-[#FF2E63] px-3.5 py-1.5 font-black shadow-3xs transition-all cursor-pointer text-[10px] uppercase shrink-0"
          title="💬 Gerar solicitação ou pedido de compra para WhatsApp"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          WhatsApp / Msg
        </button>

        <button
          onClick={() => setIsImportOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-900 bg-slate-900 text-white hover:bg-[#FF2E63] hover:border-[#FF2E63] px-3.5 py-1.5 font-black shadow-3xs transition-all cursor-pointer text-[10px] uppercase group"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#FF2E63] group-hover:text-white transition-all shrink-0 animate-pulse" />
          Import IA
        </button>
      </div>

      {/* Toggleable Expanded Quick Guide */}
      {showQuickGuide && (
        <div className="p-4 border-b border-slate-200 bg-amber-50/20 text-slate-700 font-sans leading-relaxed text-[11px] space-y-3 animate-fade-in print:hidden">
          <div className="flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-[#FF2E63] shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-slate-900 uppercase text-[12px] tracking-wide">💡 Guia Rápido de Uso do Nexo Facilities</p>
              <p className="text-slate-500 font-medium">Melhore sua produtividade diária de compras com os atalhos abaixo:</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 pt-1 text-[11px]">
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-3xs hover:border-[#FF2E63]/30 transition-all">
              <span className="block font-black text-[#FF2E63] uppercase text-[9.5px] tracking-wider mb-1">📋 Preenchimento em Lote</span>
              <p className="text-slate-500 leading-normal font-semibold">
                Copie uma coluna de preços do Excel, clique na primeira célula de preço de um fornecedor e cole (<kbd className="font-mono text-[9px] bg-slate-100 border px-1 rounded-xs">Ctrl+V</kbd>). Todo o lote será preenchido automaticamente!
              </p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-3xs hover:border-[#FF2E63]/30 transition-all">
              <span className="block font-black text-[#FF2E63] uppercase text-[9.5px] tracking-wider mb-1">📂 Importar com Excel</span>
              <p className="text-slate-500 leading-normal font-semibold">
                Basta clicar em <strong>Import IA</strong> ou arrastar sua planilha (.xlsx) de cotação para qualquer lugar desta tela para importar produtos, quantidades e preços de uma só vez!
              </p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-3xs hover:border-[#FF2E63]/30 transition-all">
              <span className="block font-black text-[#FF2E63] uppercase text-[9.5px] tracking-wider mb-1">🔍 Cadastro & Autocomplete</span>
              <p className="text-slate-500 leading-normal font-semibold">
                Ao adicionar ou renomear produtos e fornecedores, use as recomendações inteligentes do nosso banco integrado para garantir a padronização das descrições.
              </p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-3xs hover:border-[#FF2E63]/30 transition-all">
              <span className="block font-black text-[#FF2E63] uppercase text-[9.5px] tracking-wider mb-1">💬 Integração WhatsApp</span>
              <p className="text-slate-500 leading-normal font-semibold">
                Clique no botão <strong>WhatsApp / Msg</strong> para formatar automaticamente solicitações de cotação ou ordens de pedido prontas para enviar aos vendedores!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table Container for horizontal scrolling */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
        <table className="w-full border-collapse text-left text-[13px] text-slate-700 print:text-[11px]/tight">
          <thead>
            {/* Primary Headers Group */}
            <tr className="border-b border-slate-200 bg-slate-50/60 print:bg-slate-100 print:border-b-2">
              <th className="px-3 py-1 font-extrabold text-slate-700 min-w-[200px] uppercase tracking-wider text-[13px] md:text-[14px] print:text-[11px]/tight" rowSpan={2}>
                Itens a Cotar
              </th>
              {showStockPlanning && isLimpeza && (
                <>
                  <th className="px-2 py-1 font-black text-emerald-950 text-center w-[100px] min-w-[100px] max-w-[100px] uppercase tracking-tight text-[10px] print:text-[9px]/tight bg-emerald-50/65 border-l border-slate-200" rowSpan={2}>
                    Estoque Atual
                  </th>
                  <th className="px-2 py-1 font-black text-emerald-950 text-center w-[105px] min-w-[105px] max-w-[105px] uppercase tracking-tight text-[10px] print:text-[9px]/tight bg-emerald-50/65 border-l border-slate-200" rowSpan={2}>
                    Mínimo Canal
                  </th>
                  <th className="px-2 py-1 font-extrabold text-emerald-950 text-center w-[115px] min-w-[115px] max-w-[115px] uppercase tracking-tight text-[10px] print:text-[9px]/tight bg-emerald-100/40 border-l border-slate-200" rowSpan={2}>
                    Diferença Ideal
                  </th>
                </>
              )}
              <th className="px-1 py-1 font-extrabold text-slate-700 text-center w-14 uppercase tracking-tight text-[11px] print:text-[10px]" rowSpan={2}>
                Pago?
              </th>
              <th className="px-1 py-1 font-extrabold text-slate-700 text-center w-12 uppercase tracking-tight text-[13px] md:text-[14px] print:text-[11px]/tight" rowSpan={2}>
                QTD
              </th>
              {suppliers.map((s, idx) => {
                const palette = STYLE_PALETTE[idx % STYLE_PALETTE.length];
                return (
                  <th
                    key={s.id}
                    colSpan={2}
                    className={`px-2 py-1 text-center font-bold tracking-wide border-l border-slate-200 border-b w-[190px] min-w-[190px] max-w-[190px] print:w-[160px] print:min-w-[160px] print:max-w-[160px] ${palette.headerBg} ${palette.topBorder || ""}`}
                  >
                    <div className="flex flex-col items-center justify-between w-full min-h-[76px] select-none py-1.5 mx-auto">
                      <div className="flex items-center justify-between w-full gap-1.5 px-0.5 pb-1 border-b border-slate-200/10">
                        <button
                          type="button"
                          onClick={() => setSelectedSupplierToEdit(s)}
                          className="flex-1 text-center font-black text-slate-905 hover:text-[#FF2E63] hover:border-[#FF2E63]/40 border-b border-dashed border-slate-400 focus:outline-[#FF2E63]/40 transition-all uppercase py-0.5 whitespace-normal break-words cursor-pointer text-[14px] md:text-[14.5px] print:text-[12px] leading-tight"
                          title="Clique para detalhar ou preencher este fornecedor"
                        >
                          {s.name || `FORNECEDOR ${idx + 1}`}
                        </button>
                        
                        {suppliers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onRemoveSupplier(s.id)}
                            className="p-0.5 rounded-full text-slate-400 hover:bg-slate-950/10 hover:text-rose-650 transition-all cursor-pointer print:hidden shrink-0"
                            title={`Remover fornecedor ${s.name || `Fornecedor ${idx + 1}`}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Informações de contato do fornecedor - Sem bordas, com fontes aumentadas e na mesma linha! */}
                      <div className="mt-1.5 text-[11px] md:text-[11.5px] print:text-[10px] font-black uppercase text-slate-650 flex flex-wrap gap-x-1.5 gap-y-0.5 items-center justify-center leading-none">
                        {s.phone && (
                          <span className="text-slate-700 flex items-center gap-0.5 shrink-0" title={`Telefone: ${s.phone}`}>
                            📞 {s.phone}
                          </span>
                        )}
                        {s.phone && s.vendedor && (
                          <span className="text-slate-350 select-none shrink-0 mx-0.5">|</span>
                        )}
                        {s.vendedor && (
                          <span className="text-slate-700 flex items-center gap-0.5 shrink-0" title={`Vendedor: ${s.vendedor}`}>
                            👤 {s.vendedor}
                          </span>
                        )}
                        {!s.phone && !s.vendedor && (
                          <span 
                            onClick={() => setSelectedSupplierToEdit(s)}
                            className="text-slate-400 text-[10px] md:text-[10.5px] font-bold lowercase tracking-wider block leading-none select-none hover:text-[#FF2E63] cursor-pointer"
                          >
                            (clique para cadastrar fone/vendedor)
                          </span>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
              <th className="px-2 py-1 text-center w-8 print:hidden text-[11px]" rowSpan={2}>
                Excl.
              </th>
            </tr>

            {/* Sub headers (Unit. and Total columns for each supplier) */}
            <tr className="border-b border-slate-200 bg-slate-50/30 print:bg-slate-50">
              {suppliers.map((s, idx) => (
                <React.Fragment key={s.id}>
                  <th className="px-2 py-1 text-right font-semibold text-slate-450 border-l border-slate-150 w-[90px] min-w-[90px] max-w-[90px] print:w-[75px] print:min-w-[75px] print:max-w-[75px] leading-none text-[9.5px] print:text-[8.5px]">
                    Unit (R$)
                  </th>
                  <th className="px-2 py-1 text-right font-bold text-slate-650 w-[100px] min-w-[100px] max-w-[100px] print:w-[85px] print:min-w-[85px] print:max-w-[85px] leading-none text-[9.5px] print:text-[8.5px]">
                    Total (R$)
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 print:hidden">
            {items.map((item, index) => {
              const bestIds = itemBestSuppliers[item.id] || [];
              const hasValidPrice = Object.values(item.prices).some(p => p !== null && p > 0);
              const isPrintHidden = !item.name.trim() || item.quantity <= 0 || !hasValidPrice;

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-55/40 transition-colors group print:hover:bg-transparent ${isPrintHidden ? "print:hidden" : ""}`}
                >
                  {/* Item name input built around Autocomplete directly */}
                  <td className="p-0.5 px-3 focus-within:bg-slate-50/50">
                    <div className="flex items-center gap-1 w-full justify-between">
                      <div className="flex-1 min-w-0">
                        <AutocompleteItemInput
                          value={item.name}
                          onChange={(val) => onUpdateItemName(item.id, val)}
                          onEnterPress={onAddItem}
                          autoFocus={index === items.length - 1 && item.name === ""}
                          placeholder="Ex. Álcool Gel"
                          suggestions={suggestionItems}
                          triggerOnBlurOnly={true}
                          className="w-full border-0 bg-transparent p-0.5 text-slate-900 font-bold focus:ring-0 outline-hidden placeholder:text-slate-300 leading-none print:p-0 text-[11px] print:text-[10px]"
                        />
                      </div>
                      {item.observation && item.observation.trim() !== "" && (
                        <button
                          type="button"
                          onClick={() => setObservationModalItem(item)}
                          className="flex items-center gap-0.5 px-1 py-0.5 text-[#FF2E63] hover:text-rose-700 hover:bg-rose-50 rounded-sm cursor-pointer select-none transition-all print:bg-transparent print:border-none print:px-0"
                          title={`Possui observação (obs${itemObservationsOrder[item.id]}): ${item.observation}`}
                        >
                          <span className="text-xs print:text-[10px]">📝</span>
                          <span className="text-[8px] font-black uppercase tracking-tighter bg-rose-50 text-rose-600 border border-rose-200 px-0.5 rounded-xs leading-none print:text-[7.5px]">
                            obs{itemObservationsOrder[item.id]}
                          </span>
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Pago/Comprado Checkbox Column */}
                  <td className="p-1 px-1.5 text-center w-14 border-l border-slate-100">
                    <input
                      type="checkbox"
                      checked={!!item.comprado}
                      onChange={() => onToggleItemComprado?.(item.id)}
                      className="h-4 w-4 rounded border-slate-300 text-[#FF2E63] focus:ring-[#FF2E63]/20 cursor-pointer"
                    />
                  </td>

                  {showStockPlanning && isLimpeza && (
                    <>
                      {/* Estoque Atual Input */}
                      <td className="p-1 px-1.5 bg-emerald-50/10 border-l border-slate-200 w-[100px] min-w-[100px] max-w-[100px]">
                        <div className="flex items-center justify-center bg-white rounded-lg border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 px-1 py-0.5 transition-all">
                          <StockInput
                            value={item.currentStock}
                            onChange={(val) => onUpdateItemStock?.(item.id, "currentStock", val)}
                            onPasteBulk={(text) => onUpdateMultipleStocks?.("currentStock", index, text)}
                            field="currentStock"
                            rowIndex={index}
                            className="w-full text-center bg-transparent p-0 pb-0.5 font-bold text-slate-850 focus:ring-0 focus:outline-none border-0 leading-none text-[11.5px]"
                            placeholder="0"
                          />
                        </div>
                      </td>

                      {/* Estoque Mínimo Input */}
                      <td className="p-1 px-1.5 bg-emerald-50/10 border-l border-slate-200 w-[105px] min-w-[105px] max-w-[105px]">
                        <div className="flex items-center justify-center bg-white rounded-lg border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 px-1 py-0.5 transition-all">
                          <StockInput
                            value={item.minStock}
                            onChange={(val) => onUpdateItemStock?.(item.id, "minStock", val)}
                            onPasteBulk={(text) => onUpdateMultipleStocks?.("minStock", index, text)}
                            field="minStock"
                            rowIndex={index}
                            className="w-full text-center bg-transparent p-0 pb-0.5 font-bold text-slate-850 focus:ring-0 focus:outline-none border-0 leading-none text-[11.5px]"
                            placeholder="0"
                          />
                        </div>
                      </td>

                      {/* Diferença Ideal (Sugestão de compra) */}
                      <td className="p-1 px-1.5 bg-emerald-100/5 border-l border-slate-200 text-center w-[115px] min-w-[115px] max-w-[115px]">
                        {(() => {
                          const estAtual = item.currentStock || 0;
                          const estMin = item.minStock || 0;
                          const sugestao = Math.max(0, estMin - estAtual);
                          
                          return (
                            <div className="flex items-center justify-between gap-1 w-full px-0.5">
                              <span className={`font-mono text-[11.5px] font-black ${sugestao > 0 ? "text-emerald-700" : "text-slate-450"}`}>
                                {sugestao} und
                              </span>
                              {sugestao > 0 && item.quantity !== sugestao && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateItemQty(item.id, sugestao)}
                                  className="px-1.5 py-1 bg-emerald-600 hover:bg-emerald-700 hover:shadow-2xs active:scale-95 text-white rounded-md text-[8.5px] font-black uppercase tracking-tight flex items-center justify-center leading-none cursor-pointer transition-all shrink-0"
                                  title="Aplicar sugestão como Quantidade de Compra"
                                >
                                  ⚡ Usar
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </>
                  )}

                  {/* Quantity input */}
                  <td className="p-0.5 px-0.5 focus-within:bg-slate-50/30">
                    <QtyInput
                      value={item.quantity}
                      onChange={(val) => onUpdateItemQty(item.id, val)}
                      onPasteBulk={(text) => onUpdateMultipleQtys?.(index, text)}
                      rowIndex={index}
                      className="w-full text-center border-0 bg-transparent p-0.5 font-extrabold text-slate-800 focus:ring-0 outline-hidden focus:bg-white rounded-md leading-none print:p-0 text-[11px] print:text-[10px]"
                    />
                  </td>

                  {/* Prices Columns */}
                  {suppliers.map((s, idx) => {
                    const price = item.prices[s.id];
                    const val = price !== undefined && price !== null ? price : 0;
                    const totalCost = item.quantity * val;

                    // Is this supplier the cheapest for this current row?
                    const isCheapest = bestIds.includes(s.id) && val > 0;
                    const isPreferred = item.preferredSupplierId === s.id;
                    const palette = STYLE_PALETTE[idx % STYLE_PALETTE.length];

                    return (
                      <React.Fragment key={s.id}>
                        {/* Unit price input */}
                        <td
                          className={`p-0.5 px-1 border-l border-slate-150 text-right w-[90px] min-w-[90px] max-w-[90px] print:w-[75px] print:min-w-[75px] print:max-w-[75px] ${palette.cellBg}`}
                        >
                          <div
                            className={`flex items-center justify-end rounded-md px-1 py-0.5 transition-all focus-within:bg-white focus-within:ring-2 focus-within:shadow-3xs focus-within:border-slate-350 border border-transparent ${palette.inputBorder}`}
                          >
                            <span className="text-[8.5px] text-slate-300 mr-0.5 font-bold print:hidden">R$</span>
                            <PriceInput
                              value={price}
                              onChange={(newPrice) => onUpdateItemPrice(item.id, s.id, newPrice)}
                              onPasteBulk={(text) => onUpdateMultiplePrices?.(s.id, index, text)}
                              supplierId={s.id}
                              rowIndex={index}
                              className="w-full text-right bg-transparent p-0 text-slate-800 font-extrabold focus:outline-hidden focus:ring-0 leading-none text-[11px] print:text-[10px]"
                            />
                          </div>
                        </td>

                        {/* Calculated total cost for this column with CHEAPEST or PREFERRED mark */}
                        <td
                          className={`p-0.5 px-2 text-right font-bold transition-colors border-r border-[#E2E8F0] w-[100px] min-w-[100px] max-w-[100px] print:w-[85px] print:min-w-[85px] print:max-w-[85px] ${
                            isCheapest
                              ? isPreferred
                                ? "bg-amber-100/35 text-amber-800 border-amber-200"
                                : "bg-[#08D9D6]/15 text-[#A82047] print:bg-[#08D9D6]/20"
                              : isPreferred
                                ? "bg-amber-50 text-amber-700"
                                : "text-[#A82047]"
                          }`}
                        >
                          <div className="flex items-center justify-end gap-1 font-mono text-[11px] print:text-[10px]">
                            {val > 0 && (
                              <button
                                type="button"
                                onClick={() => onToggleItemPreferredSupplier?.(item.id, s.id)}
                                className={`p-0.5 rounded-sm transition-all cursor-pointer print:hidden shrink-0 ${
                                  isPreferred
                                    ? "text-amber-500 scale-110"
                                    : "text-slate-300 hover:text-amber-400 opacity-20 hover:opacity-100"
                                }`}
                                title={isPreferred ? "Remover preferência de fornecedor" : "Marcar este fornecedor como preferencial para este item"}
                              >
                                <Star className={`h-3 w-3 ${isPreferred ? "fill-amber-400 text-amber-500" : ""}`} />
                              </button>
                            )}
                            {isCheapest && (
                              <span className={`text-[7.5px] font-black tracking-tighter text-white px-1 rounded-sm text-[7.5px] print:text-[7.5px] print:border ${
                                isPreferred
                                  ? "bg-amber-500 border-amber-500 print:border-amber-500 text-slate-900 font-extrabold"
                                  : "bg-[#A82047] border-[#A82047] print:border-[#A82047]"
                              }`}>
                                {isPreferred ? "PREF ★" : "MIN ★"}
                              </span>
                            )}
                            <span className={isCheapest ? "text-[#A82047] font-black" : "text-[#A82047] font-semibold"}>{formatCurrency(totalCost)}</span>
                          </div>
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* Exclude & Observation row action */}
                  <td className="p-0.5 px-1 text-center print:hidden">
                    <div className="flex items-center justify-center gap-1.5">
                      {item.observation && item.observation.trim() !== "" ? (
                        <button
                          type="button"
                          onClick={() => setObservationModalItem(item)}
                          className="px-1.5 py-0.5 font-mono text-[9.5px] font-black text-rose-600 bg-rose-50 border border-rose-200 rounded-sm hover:bg-rose-100 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                          title="Clique para visualizar, alterar ou excluir a observação"
                        >
                          obs{itemObservationsOrder[item.id]}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setObservationModalItem(item)}
                          className="p-1 rounded-md text-slate-350 hover:text-[#FF2E63] hover:bg-pink-50 transition-all cursor-pointer opacity-30 group-hover:opacity-100 focus:opacity-100 shrink-0"
                          title="Adicionar observação para este item"
                        >
                          📝
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer opacity-30 group-hover:opacity-100 focus:opacity-100 shrink-0"
                        title="Excluir este item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td colSpan={2 + suppliers.length * 2 + 1} className="p-4 bg-slate-50/50">
                  <div
                    tabIndex={0}
                    onPaste={handleEmptyStatePaste}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`p-10 text-center rounded-[20px] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center min-h-[260px] focus:outline-hidden focus:ring-2 focus:ring-[#FF2E63]/20 ${
                      isDraggingOver
                        ? "border-[#FF2E63] bg-pink-50/10 text-[#FF2E63]"
                        : "border-slate-200 bg-white hover:border-[#FF2E63]/40"
                    }`}
                    title="Clique aqui e cole ou arraste um arquivo para importar"
                  >
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-full bg-pink-50 flex items-center justify-center text-[#FF2E63] mx-auto animate-pulse">
                        <FileDown className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[#FF2E63] font-black text-xs uppercase tracking-tight">Planilha de Cotação Vazia</p>
                        <p className="text-slate-800 text-[10px] font-bold mt-1.5 leading-normal normal-case">
                          Cole (Ctrl+V) uma lista de materiais com quantidades aqui mesmo!
                        </p>
                        <p className="text-slate-450 text-[9px] font-semibold leading-normal mt-1 normal-case">
                          Ou simplesmente <span className="text-[#FF2E63] font-bold">arraste e solte</span> sua planilha Excel (.xlsx), CSV ou TXT nesta área de novos itens.
                        </p>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>

          {/* PRINT ONLY TBODY (reorganized: cheapest items of each supplier at the top, sorted alphabetically) */}
          <tbody className="hidden print:table-row-group divide-y divide-slate-100">
            {sortedPrintItems.map((item) => {
              const bestIds = itemBestSuppliers[item.id] || [];
              const hasValidPrice = Object.values(item.prices).some((p: any) => p !== null && p > 0);
              const isPrintHidden = !item.name.trim() || item.quantity <= 0 || !hasValidPrice;

              if (isPrintHidden) return null;

              return (
                <tr
                  key={`print-${item.id}`}
                  className="bg-white border-b border-slate-100"
                >
                  {/* Item name */}
                  <td className="p-1 px-3">
                    <div className="flex items-center gap-1 w-full justify-between">
                      <span className="text-slate-900 font-bold leading-tight text-[10.5px]">
                        {item.name}
                      </span>
                      {item.observation && item.observation.trim() !== "" && (
                        <span className="text-[8px] font-black uppercase tracking-tighter bg-rose-50 text-rose-600 border border-rose-200 px-1 rounded-xs leading-none">
                          obs{itemObservationsOrder[item.id]}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Print-only Pago column */}
                  <td className="p-1 text-center w-14 font-bold text-[10.5px] border-l border-slate-100">
                    {item.comprado ? "[ X ]" : "[   ]"}
                  </td>

                  {/* Stock Planning columns (if active) */}
                  {showStockPlanning && isLimpeza && (
                    <>
                      <td className="p-1 px-1.5 bg-emerald-50/5 border-l border-slate-200 text-center w-[100px] min-w-[100px] max-w-[100px]">
                        <span className="font-bold text-slate-800 text-[10.5px]">
                          {item.currentStock || 0}
                        </span>
                      </td>
                      <td className="p-1 px-1.5 bg-emerald-50/5 border-l border-slate-200 text-center w-[105px] min-w-[105px] max-w-[105px]">
                        <span className="font-bold text-slate-800 text-[10.5px]">
                          {item.minStock || 0}
                        </span>
                      </td>
                      <td className="p-1 px-1.5 bg-emerald-100/5 border-l border-slate-200 text-center w-[115px] min-w-[115px] max-w-[115px]">
                        <span className="font-mono text-[10.5px] font-black text-slate-650">
                          {Math.max(0, (item.minStock || 0) - (item.currentStock || 0))} und
                        </span>
                      </td>
                    </>
                  )}

                  {/* Quantity */}
                  <td className="p-1 text-center w-12 font-extrabold text-slate-800 text-[10.5px]">
                    {item.quantity}
                  </td>

                  {/* Prices Columns */}
                  {suppliers.map((s, idx) => {
                    const price = item.prices[s.id];
                    const val = price !== undefined && price !== null ? price : 0;
                    const totalCost = item.quantity * val;

                    const isCheapest = bestIds.includes(s.id) && val > 0;
                    const isPreferred = item.preferredSupplierId === s.id;
                    const palette = STYLE_PALETTE[idx % STYLE_PALETTE.length];

                    return (
                      <React.Fragment key={`print-price-${s.id}`}>
                        {/* Unit price */}
                        <td
                          className={`p-1 px-1 border-l border-slate-150 text-right w-[90px] min-w-[90px] max-w-[90px] print:w-[75px] print:min-w-[75px] print:max-w-[75px] ${palette.cellBg}`}
                        >
                          <span className="text-[10px] text-slate-800 font-extrabold font-mono">
                            {price !== null && price > 0 ? formatCurrency(price) : "-"}
                          </span>
                        </td>

                        {/* Calculated total cost with CHEAPEST mark */}
                        <td
                          className={`p-1 px-2 text-right font-bold border-r border-[#E2E8F0] w-[100px] min-w-[100px] max-w-[100px] print:w-[85px] print:min-w-[85px] print:max-w-[85px] ${
                            isCheapest
                              ? isPreferred
                                ? "bg-amber-100 text-amber-800"
                                : "bg-[#08D9D6]/20 text-[#A82047]"
                              : isPreferred
                                ? "bg-amber-50 text-amber-700"
                                : "text-[#A82047]"
                          }`}
                        >
                          <div className="flex items-center justify-end gap-1 font-mono text-[10px]">
                            {isCheapest && (
                              <span className={`text-[7.5px] font-black tracking-tighter text-white px-1 rounded-sm ${
                                isPreferred ? "bg-amber-500 text-slate-900" : "bg-[#A82047]"
                              }`}>
                                {isPreferred ? "PREF ★" : "MIN ★"}
                              </span>
                            )}
                            <span className={isCheapest ? "text-[#A82047] font-black" : "text-[#A82047] font-semibold"}>
                              {val > 0 ? formatCurrency(totalCost) : "-"}
                            </span>
                          </div>
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>

          {/* Table Footer Results */}
          <tfoot>
            {/* TOTAL GERAL ROW */}
            <tr className="border-t border-slate-300 bg-slate-50/50 font-bold text-slate-900 print:bg-slate-100 print:border-t-2">
              <td className="px-3 py-1.5 text-xs font-black uppercase text-slate-800">
                Total Fornecedor Único (100%)
              </td>
              <td className="px-1 py-1.5" colSpan={showStockPlanning && isLimpeza ? 4 : 1}></td>
              {suppliers.map((s) => {
                const total = supplierTotals[s.id] || 0;
                return (
                  <React.Fragment key={s.id}>
                    <td className="border-l border-slate-205 w-[90px] min-w-[90px] max-w-[90px] print:w-[75px] print:min-w-[75px] print:max-w-[75px]"></td>
                    <td className="px-2 py-1.5 text-right font-black text-slate-950 font-mono text-[10px] print:text-[9px]/none w-[100px] min-w-[100px] max-w-[100px] print:w-[85px] print:min-w-[85px] print:max-w-[85px]">
                      {formatCurrency(total)}
                    </td>
                  </React.Fragment>
                );
              })}
              <td className="print:hidden"></td>
            </tr>

            {/* COMPOSITION COMPONENT CONTRIBUTION ROW */}
            <tr className="border-y border-slate-200 bg-slate-50/40 font-bold text-slate-900 print:bg-white print:border-y-2">
              <td className="px-3 py-2 text-[#0B4F6C] font-semibold text-[11px]">
                Sua Contribuição em Compra Mista
              </td>
              <td className="px-1 py-2" colSpan={showStockPlanning && isLimpeza ? 4 : 1}></td>
              {suppliers.map((s) => {
                const amount = compositionTotals[s.id] || 0;
                const total = supplierTotals[s.id] || 0;
                const sharePercent = total > 0 ? Math.round((amount / total) * 100) : 0;

                return (
                  <React.Fragment key={s.id}>
                    <td className="border-l border-slate-200 w-[90px] min-w-[90px] max-w-[90px] print:w-[75px] print:min-w-[75px] print:max-w-[75px]"></td>
                    <td className="px-2 py-2 text-right font-mono w-[110px] min-w-[110px] max-w-[110px] print:w-[85px] print:min-w-[85px] print:max-w-[85px] bg-[#0B4F6C]/5">
                      <div className="flex flex-col items-end leading-none">
                        <span className="text-[13.5px] print:text-[11px] font-black text-[#0B4F6C]">
                          {formatCurrency(amount)}
                        </span>
                        {amount > 0 && (
                          <span className="text-[8.5px] font-bold text-[#0B4F6C] bg-[#0B4F6C]/10 px-1 py-0.5 rounded uppercase tracking-tighter mt-1">
                            {sharePercent}% itens
                          </span>
                        )}
                      </div>
                    </td>
                  </React.Fragment>
                );
              })}
              <td className="print:hidden"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Spreadsheet Control bar at bottom of table (compact padding) */}
      <div className="border-t border-slate-150 bg-slate-50/30 p-2.5 flex flex-wrap gap-2 items-center justify-between print:hidden">
        <button
          onClick={onAddItem}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-1.5 font-black text-[#FF2E63] hover:bg-[#FF2E63]/5 hover:border-[#FF2E63] shadow-3xs transition-all cursor-pointer leading-none"
        >
          <Plus className="h-3.5 w-3.5" />
          ITEM
        </button>

        <button
          onClick={onAddSupplier}
          className="inline-flex items-center gap-1 rounded-full border border-slate-205 bg-[#252A34] hover:bg-slate-800 px-4 py-1.5 font-bold text-white shadow-3xs transition-all cursor-pointer leading-none"
        >
          <Plus className="h-3.5 w-3.5" />
          ADICIONAR FORNECEDOR
        </button>
      </div>

      {/* Dynamic Purchase Control Info Bar - Visible on screen and nicely styled for print */}
      <div className="border-t border-slate-150 bg-slate-100/60 p-3 px-4 flex items-center gap-2 font-black text-[11px] text-slate-750 rounded-b-2xl print:bg-white print:border-t print:p-2 print:text-[10px] print:rounded-none">
        <span className="text-base print:text-[11px]">🛍️</span>
        {totalToBuy > 0 ? (
          <span>
            CONTROLE DE COMPRA: <span className="text-[#FF2E63] font-black">{totalRemaining} {totalRemaining === 1 ? 'item restante' : 'itens restantes'}</span> por comprar (de {totalToBuy} ativos na planilha, {totalBought} já comprados)
          </span>
        ) : (
          <span className="text-slate-500 font-bold uppercase">Controle de Compra: Nenhuma quantidade de item ativa nesta cotação.</span>
        )}
      </div>

      {/* Dynamic Observations Bottom Section - Prints at the end of report */}
      {observationsList.length > 0 && (
        <div className="border-t border-slate-200 bg-white p-5 rounded-b-2xl">
          <h3 className="text-[12.5px] font-black uppercase text-[#FF2E63] tracking-wide mb-3 flex items-center gap-1.5 border-b border-pink-100 pb-2">
            📝 Observações da Cotação
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-1">
            {observationsList.map((obs) => (
              <div 
                key={obs.id} 
                className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between hover:bg-slate-50 transition-colors print:bg-white print:border-slate-300 print:rounded-none print:p-2 print:border-b"
              >
                <div>
                  <div className="flex flex-col gap-1.5 mb-2.5 border-b border-slate-150 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[9px]/tight font-black uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded-sm print:bg-slate-100 print:border shrink-0">
                        {obs.id}
                      </span>
                      <span className="text-[11px] font-black text-[#A82047] uppercase truncate max-w-[190px] print:max-w-none" title={obs.supplierName}>
                        🏢 {obs.supplierName}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-600 flex items-center gap-1 mt-0.5">
                      <span>📦 Item:</span>
                      <span className="text-slate-800 font-extrabold truncate print:whitespace-normal">{obs.itemName}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                    {renderTextWithLinks(obs.text)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popup de preenchimento detalhado do fornecedor (🏢📞👤) */}
      {selectedSupplierToEdit && (
        <SupplierModal
          supplier={selectedSupplierToEdit}
          knownSuppliers={knownSuppliers}
          onClose={() => setSelectedSupplierToEdit(null)}
          onSave={(name, phone, vendedor) => {
            // 1. Sincroniza dados no estado pai da planilha atual
            onUpdateSupplierDetails(selectedSupplierToEdit.id, { name, phone, vendedor });
            
            // 2. Incrementar fornecedores conhecidos históricos para sugestões futuras de autocomplete
            const cleanName = name.trim().toUpperCase();
            if (cleanName) {
              // Upsert to Supabase
              dbUpsertKnownSupplier({ name: cleanName, phone, vendedor }).catch((e) => {
                console.error("Failed to upsert known supplier:", e);
              });

              setKnownSuppliers((prev) => {
                const exists = prev.some((k) => k.name.toUpperCase() === cleanName);
                let updated;
                if (!exists) {
                  updated = [...prev, { name: cleanName, phone, vendedor }];
                } else {
                  updated = prev.map((k) =>
                    k.name.toUpperCase() === cleanName
                      ? { ...k, phone, vendedor }
                      : k
                  );
                }
                localStorage.setItem("clean_quotes_known_suppliers", JSON.stringify(updated));
                return updated;
              });
            }
            setSelectedSupplierToEdit(null);
          }}
        />
      )}

      {/* Popup de preenchimento de observação do item (📝) */}
      {observationModalItem && (
        <ObservationModal
          item={observationModalItem}
          obsNumber={itemObservationsOrder[observationModalItem.id] || (Object.keys(itemObservationsOrder).length + 1)}
          onClose={() => setObservationModalItem(null)}
          onSave={(text) => {
            if (onUpdateItemObservation) {
              onUpdateItemObservation(observationModalItem.id, text);
            }
            setObservationModalItem(null);
          }}
        />
      )}

      {/* WhatsApp Integrated Modal Popup */}
      {isWhatsAppModalOpen && (
        <WhatsAppModal
          suppliers={suppliers}
          items={items}
          activeCategoryName={activeCategoryName}
          summary={summary}
          onClose={() => setIsWhatsAppModalOpen(false)}
        />
      )}
    </div>
  );
}


// --- DETAIL OBSERVATIONS POPUP MODAL COMPONENT (📝) ---

interface ObservationModalProps {
  item: QuoteItem;
  obsNumber: number;
  onClose: () => void;
  onSave: (text: string) => void;
}

function ObservationModal({ item, obsNumber, onClose, onSave }: ObservationModalProps) {
  const [text, setText] = useState(item.observation || "");

  const handleSave = () => {
    onSave(text);
  };

  const handleDelete = () => {
    onSave("");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in print:hidden">
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden p-6 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-rose-50">
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <h2 className="text-sm font-black uppercase text-slate-800 tracking-wide font-sans">
              {item.observation ? `Editar Observação (obs ${obsNumber})` : "Adicionar Observação"}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-250 active:scale-90 transition-all cursor-pointer font-bold text-xs"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <span className="text-[10px] font-black uppercase text-[#FF2E63] block mb-1">
            Referência do Item:
          </span>
          <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 text-[11.5px] font-bold text-slate-800">
            {item.name} {item.quantity > 0 ? `(${item.quantity} un)` : ""}
          </div>
        </div>

        {/* Text Area */}
        <div className="mb-5">
          <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
            Texto da Observação:
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-32 text-[11.5px] font-medium text-slate-800 bg-slate-55 border border-slate-200 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-pink-400/20 focus:border-[#FF2E63] placeholder-slate-400/70"
            placeholder="Digite aqui os detalhes extras, requisitos de entrega ou condições especiais para este item..."
            autoFocus
          />
        </div>

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          {item.observation ? (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 text-[10.5px] font-black uppercase rounded-full border border-rose-200 cursor-pointer transition-all active:scale-95"
            >
              Excluir
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 text-[10.5px] font-black uppercase rounded-full cursor-pointer transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!text.trim() && !item.observation}
              className={`px-5 py-2 text-[10.5px] font-black uppercase rounded-full cursor-pointer transition-all active:scale-95 text-white ${
                text.trim() || item.observation
                  ? "bg-[#252A34] hover:bg-slate-800"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              Salvar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}


// --- WHATSAPP / CLIPBOARD INTEGRATED MESSAGE GENERATOR ---

interface WhatsAppModalProps {
  suppliers: Supplier[];
  items: QuoteItem[];
  activeCategoryName?: string;
  summary: ComparisonSummary;
  onClose: () => void;
}

function WhatsAppModal({ suppliers, items, activeCategoryName, summary, onClose }: WhatsAppModalProps) {
  const [msgType, setMsgType] = useState<"request" | "order">("request");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || "");
  const [copied, setCopied] = useState(false);

  const activeSupplier = suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];

  const generatedText = React.useMemo(() => {
    const quoteDate = localStorage.getItem("clean_quotes_date") || "jul/26";
    const chamadoNum = localStorage.getItem("clean_quotes_chamado_number") || "00000000";
    const opName = localStorage.getItem("clean_quotes_username") || "Comprador";
    const categoryLabel = activeCategoryName || "Material de Higiene e Limpeza";

    const filteredItems = items.filter(it => it.name.trim() !== "" && (it.quantity || 0) > 0);

    if (filteredItems.length === 0) {
      return "⚠️ NENHUM ITEM COM QUANTIDADE ADICIONADO NA PLANILHA.";
    }

    if (msgType === "request") {
      let text = `*SOLICITAÇÃO DE ORÇAMENTO — NEXO FACILITIES*\n`;
      text += `*Chamado:* #${chamadoNum}\n`;
      text += `*Categoria:* ${categoryLabel.toUpperCase()}\n`;
      text += `*Data de Referência:* ${quoteDate}\n\n`;
      text += `Olá! Gostaria de solicitar a cotação de preços para os materiais abaixo listados:\n\n`;

      filteredItems.forEach((it, idx) => {
        text += `${idx + 1}. *${it.name.trim()}* — Qtd: *${it.quantity}*\n`;
      });

      text += `\nFavor responder com os preços unitários e condições de faturamento/entrega.\n`;
      text += `Atenciosamente,\n*${opName}* — Nexo Facilities 🏢`;
      return text;
    } else {
      // Pedido de compra mista com itens vencedores
      const { itemBestSuppliers } = summary;
      const winningItems = filteredItems.filter(it => {
        const bestIds = itemBestSuppliers[it.id] || [];
        return bestIds[0] === selectedSupplierId && (it.prices[selectedSupplierId] ?? 0) > 0;
      });

      if (winningItems.length === 0) {
        return `⚠️ O fornecedor "${activeSupplier?.name || "Selecionado"}" não possui itens vencedores ou preços preenchidos nesta cotação.`;
      }

      let text = `*CONFIRMAÇÃO DE PEDIDO DE COMPRA — NEXO FACILITIES*\n`;
      text += `*Chamado:* #${chamadoNum}\n`;
      text += `*Para:* ${activeSupplier?.name || "Fornecedor"}\n`;
      if (activeSupplier?.vendedor) text += `*A/C Vendedor:* ${activeSupplier.vendedor}\n`;
      text += `*Data de Pedido:* ${new Date().toLocaleDateString("pt-BR")}\n\n`;
      text += `Olá! Confirmamos o pedido de faturamento dos itens vencedores em nosso mapa comparativo:\n\n`;

      let grandTotal = 0;
      winningItems.forEach((it, idx) => {
        const price = it.prices[selectedSupplierId] || 0;
        const total = it.quantity * price;
        grandTotal += total;
        text += `• *${it.name.trim()}*\n   Qtd: ${it.quantity} un x R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} = *R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n`;
      });

      text += `\n*VALOR TOTAL DO PEDIDO:* *R$ ${grandTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n\n`;
      text += `Solicitamos emissão de nota fiscal de acordo com as condições faturadas e envio para entrega.\n`;
      text += `Atenciosamente,\n*${opName}* — Nexo Facilities 🏢`;
      return text;
    }
  }, [msgType, selectedSupplierId, items, summary, activeCategoryName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    let cleanPhone = activeSupplier?.phone ? activeSupplier.phone.replace(/[^0-9]/g, "") : "";
    // If phone number doesn't have country code, prepend Brazil country code (55)
    if (cleanPhone && cleanPhone.length <= 11) {
      if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = "55" + cleanPhone;
      }
    }
    
    const url = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(generatedText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(generatedText)}`;
    
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in print:hidden leading-normal">
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col font-sans">
        
        {/* Modal Header */}
        <div className="bg-[#252A34] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">💬</span>
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-100">
              Gerador de Mensagem Integrada WhatsApp / E-mail
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 max-h-[75vh]">
          
          {/* Segmented Message Type Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMsgType("request")}
              className={`flex-1 text-center py-2 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                msgType === "request"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              1. Solicitar Orçamento
            </button>
            <button
              type="button"
              onClick={() => setMsgType("order")}
              className={`flex-1 text-center py-2 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                msgType === "order"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              2. Confirmar Pedido de Compra
            </button>
          </div>

          {/* Supplier Selector for Purchase Orders */}
          {msgType === "order" && (
            <div className="flex flex-col space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-[#FF2E63] leading-none">
                Selecionar Fornecedor Ganhador
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full rounded-lg border border-slate-220 bg-slate-50/50 p-2 font-bold text-slate-800 focus:outline-[#FF2E63] text-[11px]"
              >
                {suppliers.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {s.name ? s.name.toUpperCase() : `FORNECEDOR ${idx + 1}`} {s.vendedor ? `(${s.vendedor})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Contact Details Display */}
          <div className="bg-slate-55 p-3 rounded-xl text-[10px] font-semibold text-slate-600 flex flex-wrap gap-4 items-center border border-slate-150">
            <div>
              <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-tight leading-none mb-1">Destinatário:</span>
              <span className="font-extrabold text-slate-805 uppercase">
                {msgType === "request" 
                  ? "Todos os fornecedores selecionados" 
                  : (activeSupplier?.name || "Fornecedor")}
              </span>
            </div>
            {msgType === "order" && activeSupplier?.phone && (
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-tight leading-none mb-1">Telefone:</span>
                <span className="font-mono text-slate-850 font-bold">📞 {activeSupplier.phone}</span>
              </div>
            )}
            {msgType === "order" && activeSupplier?.vendedor && (
              <div>
                <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-tight leading-none mb-1">Vendedor AC:</span>
                <span className="text-slate-850 uppercase font-bold">👤 {activeSupplier.vendedor}</span>
              </div>
            )}
          </div>

          {/* Textarea Preview */}
          <div className="flex flex-col space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest text-[#FF2E63] leading-none">
              Pré-visualização do Texto Gerado
            </label>
            <textarea
              readOnly
              value={generatedText}
              rows={8}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[10px] leading-relaxed text-slate-800 focus:outline-hidden resize-none scrollbar-thin"
            />
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-150 p-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-200 hover:bg-slate-100 py-2.5 text-[9px] font-black text-slate-650 transition-colors uppercase cursor-pointer"
          >
            Fechar
          </button>
          
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 rounded-full border border-slate-350 bg-white hover:bg-slate-50 py-2.5 text-[9px] font-black text-slate-800 transition-colors uppercase cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copiar Mensagem</span>
              </>
            )}
          </button>

          {/* Send direct WhatsApp button */}
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="flex-1 rounded-full bg-[#25D366] hover:bg-[#20ba56] text-white py-2.5 text-[9px] font-black uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5 fill-white" />
            Enviar WhatsApp
          </button>
        </div>

      </div>
    </div>
  );
}


// --- DETAIL SUPPLIER DETAILED FILL MODAL COMPONENT (🏢 📞 👤) ---

interface SupplierModalProps {
  supplier: Supplier;
  knownSuppliers: { name: string; phone?: string; vendedor?: string }[];
  onClose: () => void;
  onSave: (name: string, phone: string, vendedor: string) => void;
}

function SupplierModal({ supplier, knownSuppliers, onClose, onSave }: SupplierModalProps) {
  const [name, setName] = useState(supplier.name || "");
  const [phone, setPhone] = useState(supplier.phone || "");
  const [vendedor, setVendedor] = useState(supplier.vendedor || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close suggestions dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAutocompleteOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter existing historical records for suppliers drop list
  const filteredSuggestions = React.useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    // Map PRE_REGISTERED_SUPPLIERS to the standardized object shape
    const mappedPresets = PRE_REGISTERED_SUPPLIERS.map((name) => ({
      name: name.toUpperCase(),
      phone: "",
      vendedor: "",
    }));

    // Merge both list of suppliers, avoiding duplicates
    const seenNames = new Set<string>();
    const merged: { name: string; phone?: string; vendedor?: string }[] = [];

    // Prioritize knownSuppliers first (they have contact detailed values)
    knownSuppliers.forEach((k) => {
      const uName = k.name.toUpperCase();
      if (!seenNames.has(uName)) {
        seenNames.add(uName);
        merged.push({ name: uName, phone: k.phone, vendedor: k.vendedor });
      }
    });

    // Add preset suppliers next
    mappedPresets.forEach((p) => {
      const uName = p.name.toUpperCase();
      if (!seenNames.has(uName)) {
        seenNames.add(uName);
        merged.push(p);
      }
    });

    if (!term) {
      // By default show some top predictions or first items from merged list
      return merged.slice(0, 30);
    }

    // Filter by name match
    return merged
      .filter((item) => item.name.toLowerCase().includes(term))
      .slice(0, 50);
  }, [searchTerm, knownSuppliers]);

  const selectSuggested = (ks: { name: string; phone?: string; vendedor?: string }) => {
    setName(ks.name.toUpperCase());
    setPhone(ks.phone || "");
    setVendedor(ks.vendedor || "");
    setSearchTerm(ks.name);
    setIsAutocompleteOpen(false);
  };

  const clearForm = () => {
    setName("");
    setPhone("");
    setVendedor("");
    setSearchTerm("");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name, phone, vendedor);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in print:hidden leading-normal">
      <div className="bg-white rounded-2xl border border-slate-205 shadow-2xl max-w-md w-full overflow-hidden flex flex-col font-sans">
        
        {/* Modal Top title bar */}
        <div className="bg-[#252A34] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#FF2E63] animate-pulse shrink-0" />
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-100">
              Cadastrar / Sincronizar Fornecedor
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content & Inputs */}
        <form onSubmit={handleFormSubmit} className="p-5 flex flex-col space-y-4">
          
          {/* Autocomplete Input */}
          <div className="flex flex-col space-y-1 relative" ref={dropdownRef}>
            <label className="text-[8px] font-black uppercase tracking-widest text-[#FF2E63] block leading-none">
              Pesquisar Fornecedores Cadastrados (Digite para Filtrar)
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsAutocompleteOpen(true);
                }}
                onFocus={() => setIsAutocompleteOpen(true)}
                placeholder="🔍 Comece a digitar o nome do fornecedor..."
                className="w-full rounded-lg border border-slate-220 bg-slate-50/50 hover:bg-slate-50 focus:bg-white px-3 py-1.5 font-bold text-slate-800 placeholder:text-slate-400 focus:outline-[#FF2E63] text-[11px] transition-all"
              />

              {isAutocompleteOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  <div className="p-1 text-[7.5px] font-black tracking-wider text-slate-400 bg-slate-50 uppercase">
                    Fornecedores Pré-Cadastrados
                  </div>
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((ks, index) => (
                      <button
                        key={`${ks.name}_${index}`}
                        type="button"
                        onClick={() => selectSuggested(ks)}
                        className="w-full text-left p-2 hover:bg-pink-50/40 text-slate-800 hover:text-[#FF2E63] transition-colors flex flex-col cursor-pointer"
                      >
                        <span className="font-extrabold text-[10px] uppercase text-slate-850">{ks.name}</span>
                        {(ks.phone || ks.vendedor) && (
                          <div className="text-[7.5px] text-slate-400 mt-0.5 font-medium flex items-center gap-1.5">
                            {ks.phone && <span>📞 {ks.phone}</span>}
                            {ks.vendedor && <span>👤 {ks.vendedor}</span>}
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-center text-slate-400 italic text-[9.5px]">
                      Nenhum correspondente. Registre um novo abaixo!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="h-[2px] bg-slate-100 w-full" />

          {/* New / Clear Button */}
          <div className="flex items-center justify-between leading-none">
            <span className="text-[8.5px] font-black uppercase tracking-wider text-[#FF2E63]">
              🏢 Dados Requeridos do Fornecedor
            </span>
            <button
              type="button"
              onClick={clearForm}
              className="text-[8px] font-black text-rose-600 hover:text-rose-800 uppercase hover:underline cursor-pointer flex items-center gap-1 shrink-0"
            >
              Novo / Limpar Tudo
            </button>
          </div>

          {/* Form Fields: Name, Phone, Seller */}
          <div className="space-y-3">
            {/* NAME */}
            <div className="flex flex-col space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-500 leading-none">
                Nome do Fornecedor <span className="text-[#FF2E63] font-bold">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. CANTINHO DA LIMPEZA E FACILITIES"
                className="w-full rounded-lg border border-slate-220 bg-white px-3 py-1.5 font-black text-slate-900 placeholder:text-slate-300 focus:outline-[#FF2E63] uppercase text-[11px] transition-all"
              />
            </div>

            {/* PHONE */}
            <div className="flex flex-col space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-500 leading-none">
                Telefone de Contato
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex. (11) 98765-4321 ou (11) 3222-1000"
                className="w-full rounded-lg border border-slate-220 bg-white px-3 py-1.5 font-extrabold text-slate-900 placeholder:text-slate-300 focus:outline-[#FF2E63] text-[11px] transition-all"
              />
            </div>

            {/* SELLER */}
            <div className="flex flex-col space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-500 leading-none">
                Representante / Vendedor
              </label>
              <input
                type="text"
                value={vendedor}
                onChange={(e) => setVendedor(e.target.value)}
                placeholder="Ex. Roberto comercial"
                className="w-full rounded-lg border border-slate-220 bg-white px-3 py-1.5 font-bold text-slate-900 placeholder:text-slate-300 focus:outline-[#FF2E63] text-[11px] transition-all"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-slate-200 hover:bg-slate-50 py-2.5 text-[9px] font-black text-slate-650 transition-colors uppercase cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className={`flex-1 rounded-full py-2.5 text-[9px] font-black text-white uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1 ${
                name.trim()
                  ? "bg-[#FF2E63] hover:bg-[#E3227E] cursor-pointer"
                  : "bg-slate-300 text-slate-400 cursor-not-allowed"
              }`}
            >
              ✓ Salvar Cadastro
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}


// --- INLINE AUTOCOMPLETE INPUT COMPONENT ---

interface AutocompleteItemInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  onEnterPress?: () => void;
  autoFocus?: boolean;
  suggestions?: string[];
  triggerOnBlurOnly?: boolean;
}

function AutocompleteItemInput({
  value,
  onChange,
  placeholder,
  className,
  onEnterPress,
  autoFocus,
  suggestions = [],
  triggerOnBlurOnly = false,
}: AutocompleteItemInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState(value);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const blurTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Keep internal text synced with outer state on blur
  React.useEffect(() => {
    setFilterText(value);
  }, [value]);

  React.useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  React.useEffect(() => {
    return () => {
      if (blurTimeout.current) clearTimeout(blurTimeout.current);
    };
  }, []);

  const filteredSuggestions = React.useMemo(() => {
    const rawList = suggestions && suggestions.length > 0 ? suggestions : FACILITIES_MATERIALS_PRESET;
    // Deduplicate and sort alphabetically
    const listToFilter = Array.from(new Set(rawList)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    const term = filterText.toLowerCase().trim();
    if (!term) return listToFilter;
    return listToFilter.filter((m) =>
      m.toLowerCase().includes(term)
    );
  }, [filterText, suggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setFilterText(nextVal);
    if (!triggerOnBlurOnly) {
      onChange(nextVal);
    }
    setIsOpen(true);
  };

  const selectSuggestion = (suggestion: string) => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    onChange(suggestion);
    setFilterText(suggestion);
    setIsOpen(false);
  };

  const handleFocus = () => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setIsOpen(true);
  };

  const handleBlur = () => {
    if (triggerOnBlurOnly) {
      onChange(inputRef.current?.value || filterText);
    }
    // Delay slightly to prevent premature closing before dropdown onClick can fire
    blurTimeout.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsOpen(false);
      if (triggerOnBlurOnly) {
        onChange(filterText);
      }
      if (onEnterPress) {
        onEnterPress();
      }
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={filterText}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Escreva ou selecione..."}
        className={className}
      />
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50 text-[10px]/snug text-slate-700 print:hidden font-sans"
        >
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion}_${index}`}
                type="button"
                onMouseDown={() => selectSuggestion(suggestion)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-pink-50 hover:text-[#FF2E63] font-bold border-b border-slate-50 last:border-0 transition-colors cursor-pointer block"
              >
                {suggestion}
              </button>
            ))
          ) : (
            <div className="px-2.5 py-1.5 text-slate-400 italic">
              Nenhum material sugerido. Continue digitando...
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// --- SUB COMPONENTS FOR INPUT STATE STABILIZATION ---

interface PriceInputProps {
  value: number | null;
  onChange: (val: number | null) => void;
  className?: string;
  placeholder?: string;
  supplierId?: string;
  rowIndex?: number;
  onPasteBulk?: (text: string) => void;
}

function PriceInput({ value, onChange, className, placeholder, supplierId, rowIndex, onPasteBulk }: PriceInputProps) {
  const [localVal, setLocalVal] = React.useState<string>(
    value !== null && value !== undefined ? value.toString().replace(".", ",") : ""
  );

  const ref = React.useRef<HTMLInputElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastCommittedRef = React.useRef<number | null>(value);

  React.useEffect(() => {
    const parentStr = value !== null && value !== undefined ? value.toString().replace(".", ",") : "";
    if (document.activeElement !== ref.current) {
      setLocalVal(parentStr);
      lastCommittedRef.current = value;
    }
  }, [value]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const commitValue = (valStr: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (valStr === "") {
      if (lastCommittedRef.current !== null) {
        lastCommittedRef.current = null;
        onChange(null);
      }
    } else {
      const cleanInput = valStr.replace(",", ".");
      const parsed = parseFloat(cleanInput);
      if (!isNaN(parsed) && parsed >= 0) {
        if (lastCommittedRef.current !== parsed) {
          lastCommittedRef.current = parsed;
          onChange(parsed);
        }
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^0-9.,]/g, "");
    setLocalVal(sanitized);

    // Debounce the state commit to make typing 100% lag-free
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      commitValue(sanitized);
    }, 450);
  };

  const handleBlur = () => {
    commitValue(localVal);
    // Format on blur
    const cleanInput = localVal.replace(",", ".");
    const parsed = parseFloat(cleanInput);
    if (!isNaN(parsed) && parsed >= 0) {
      setLocalVal(parsed.toFixed(2).replace(".", ","));
    } else {
      setLocalVal("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      commitValue(localVal);
      const sId = e.currentTarget.getAttribute("data-supplier");
      const rIdxStr = e.currentTarget.getAttribute("data-row");
      if (sId && rIdxStr) {
        const nextRowIndex = parseInt(rIdxStr, 10) + 1;
        const nextInput = document.querySelector(
          `input[data-supplier="${sId}"][data-row="${nextRowIndex}"]`
        ) as HTMLInputElement | null;

        if (nextInput) {
          e.preventDefault();
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (text && text.includes("\n") && onPasteBulk) {
      e.preventDefault();
      onPasteBulk(text);
    }
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      data-supplier={supplierId}
      data-row={rowIndex}
      className={`${className} w-full text-right outline-hidden font-extrabold text-slate-805 placeholder:text-slate-300`}
      placeholder={placeholder || "0,00"}
    />
  );
}

interface QtyInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  onPasteBulk?: (text: string) => void;
  rowIndex?: number;
}

function QtyInput({ value, onChange, className, onPasteBulk, rowIndex }: QtyInputProps) {
  const [localVal, setLocalVal] = React.useState<string>(value.toString());
  const ref = React.useRef<HTMLInputElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastCommittedRef = React.useRef<number>(value);

  React.useEffect(() => {
    if (document.activeElement !== ref.current) {
      setLocalVal(value.toString());
      lastCommittedRef.current = value;
    }
  }, [value]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const commitValue = (valStr: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const parsed = parseInt(valStr, 10);
    const finalVal = !isNaN(parsed) && parsed >= 0 ? parsed : 0;
    
    if (lastCommittedRef.current !== finalVal) {
      lastCommittedRef.current = finalVal;
      onChange(finalVal);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^0-9]/g, "");
    setLocalVal(sanitized);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      commitValue(sanitized);
    }, 450);
  };

  const handleBlur = () => {
    commitValue(localVal);
    setLocalVal(lastCommittedRef.current.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      commitValue(localVal);
      const rIdxStr = e.currentTarget.getAttribute("data-row");
      if (rIdxStr) {
        const nextRowIndex = parseInt(rIdxStr, 10) + 1;
        const nextInput = document.querySelector(
          `input[data-field="quantity"][data-row="${nextRowIndex}"]`
        ) as HTMLInputElement | null;

        if (nextInput) {
          e.preventDefault();
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (text && text.includes("\n") && onPasteBulk) {
      e.preventDefault();
      onPasteBulk(text);
    }
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      data-field="quantity"
      data-row={rowIndex}
      className={className}
    />
  );
}

interface StockInputProps {
  value: number | undefined | null;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  onPasteBulk?: (text: string) => void;
  field: "currentStock" | "minStock";
  rowIndex?: number;
}

function StockInput({ value, onChange, className, placeholder, onPasteBulk, field, rowIndex }: StockInputProps) {
  const [localVal, setLocalVal] = React.useState<string>(
    value !== undefined && value !== null ? value.toString() : ""
  );
  const ref = React.useRef<HTMLInputElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastCommittedRef = React.useRef<number>(value || 0);

  React.useEffect(() => {
    if (document.activeElement !== ref.current) {
      setLocalVal(value !== undefined && value !== null ? value.toString() : "");
      lastCommittedRef.current = value || 0;
    }
  }, [value]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const commitValue = (valStr: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const parsed = parseInt(valStr, 10);
    const finalVal = !isNaN(parsed) && parsed >= 0 ? parsed : 0;
    
    if (lastCommittedRef.current !== finalVal) {
      lastCommittedRef.current = finalVal;
      onChange(finalVal);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^0-9]/g, "");
    setLocalVal(sanitized);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      commitValue(sanitized);
    }, 450);
  };

  const handleBlur = () => {
    commitValue(localVal);
    setLocalVal(lastCommittedRef.current.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      commitValue(localVal);
      const fld = e.currentTarget.getAttribute("data-field");
      const rIdxStr = e.currentTarget.getAttribute("data-row");
      if (fld && rIdxStr) {
        const nextRowIndex = parseInt(rIdxStr, 10) + 1;
        const nextInput = document.querySelector(
          `input[data-field="${fld}"][data-row="${nextRowIndex}"]`
        ) as HTMLInputElement | null;

        if (nextInput) {
          e.preventDefault();
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (text && text.includes("\n") && onPasteBulk) {
      e.preventDefault();
      onPasteBulk(text);
    }
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      data-field={field}
      data-row={rowIndex}
      className={className}
      placeholder={placeholder || "0"}
    />
  );
}
