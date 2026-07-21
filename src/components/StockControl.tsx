import React, { useState, useEffect, useMemo } from "react";
import { 
  Package, 
  Trash2, 
  Plus, 
  Calendar, 
  TrendingDown, 
  Users, 
  BarChart3, 
  ArrowLeft, 
  CalendarDays, 
  Sparkles, 
  Printer, 
  FileSpreadsheet, 
  RefreshCw, 
  Tags,
  Briefcase,
  Layers,
  ChevronDown,
  Info,
  Copy,
  Check
} from "lucide-react";
import { CapacityRow, Category, Measurement } from "../types";
import { parseRawLine } from "./FileImporter";
import { dbFetchMeasurements, dbUpsertMeasurements, dbDeleteMeasurement } from "../supabaseClient";

interface StockItem {
  id: string;
  name: string;
  category: string;
}

interface StockControlProps {
  onBack: () => void;
  capacityRows: CapacityRow[];
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  onExportToQuotation?: (
    categoryId: string,
    stockData: Record<string, { minStock: number; currentStock: number }>
  ) => void;
}

const ATTENTION_ITEMS: any[] = [];

const getAttentionItemValue = (balances: Record<string, number>, lookupKeys: string[]) => {
  return 0;
};

const DEFAULT_STOCK_ITEMS: StockItem[] = [];

// Helper utility to safely retrieve balance for any item, keeping backwards/id compatibility
const getItemBalanceVal = (m: Measurement | undefined, item: { id: string; name: string }) => {
  if (!m) return 0;
  // 1. Try by exact name
  if (m.balances[item.name] !== undefined) {
    return m.balances[item.name];
  }
  // 1.5 Try by lowercase trimmed name
  const foundByName = Object.keys(m.balances).find(k => k.trim().toLowerCase() === item.name.trim().toLowerCase());
  if (foundByName !== undefined) {
    return m.balances[foundByName];
  }
  // 2. Try by historical ID mapping (if it's one of the original default items)
  const defaultMatch = DEFAULT_STOCK_ITEMS.find(d => d.name.toLowerCase().trim() === item.name.toLowerCase().trim());
  if (defaultMatch && m.balances[defaultMatch.id] !== undefined) {
    return m.balances[defaultMatch.id];
  }
  // 3. Try by local id
  if (m.balances[item.id] !== undefined) {
    return m.balances[item.id];
  }
  return 0;
};

const DEFAULT_MEASUREMENTS: Measurement[] = [];

export default function StockControl({ onBack, capacityRows, categories, setCategories, onExportToQuotation }: StockControlProps) {
  // Active selected category for stock tracking
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    const saved = localStorage.getItem("clean_quotes_stock_selected_category_id");
    if (saved && categories.some(cat => cat.id === saved)) return saved;
    const cleaning = categories.find(cat => cat.id === "material_limpeza" || cat.name.toUpperCase().includes("LIMPEZA"));
    return cleaning ? cleaning.id : (categories[0]?.id || "");
  });

  const activeCategory = useMemo(() => {
    return categories.find(c => c.id === selectedCategoryId) || categories[0] || { id: "default", name: "Estoque", items: [] };
  }, [categories, selectedCategoryId]);

  // Load measurements with persistence
  const [measurements, setMeasurements] = useState<Measurement[]>(() => {
    const saved = localStorage.getItem("clean_quotes_stock_measurements");
    if (saved) {
      try {
        return JSON.parse(saved) as Measurement[];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Derive tracked items dynamically from active category's items list with custom sorting:
  // First alphabetical of items with quantity > 0, then alphabetical of items with quantity = 0.
  const items = useMemo(() => {
    const rawItems = activeCategory.items.map((name, i) => ({
      id: `st-${activeCategory.id}-${i}`,
      name: name,
      category: activeCategory.name
    }));

    // Find last measurement chronologically
    const sorted = [...measurements].sort((a, b) => {
      const [da, ma, ya] = a.date.split("/").map(Number);
      const [db, mb, yb] = b.date.split("/").map(Number);
      return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
    });
    const lastM = sorted[sorted.length - 1];

    return rawItems.sort((a, b) => {
      const qtyA = lastM ? getItemBalanceVal(lastM, a) : 0;
      const qtyB = lastM ? getItemBalanceVal(lastM, b) : 0;
      const hasQtyA = qtyA > 0;
      const hasQtyB = qtyB > 0;

      if (hasQtyA && !hasQtyB) return -1;
      if (!hasQtyA && hasQtyB) return 1;

      return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
    });
  }, [activeCategory, measurements]);

  const [isLoadedFromCloud, setIsLoadedFromCloud] = useState(false);

  // Load initial measurements from Supabase on mount
  useEffect(() => {
    async function loadMeasurements() {
      try {
        const cloudMeasurements = await dbFetchMeasurements();
        if (cloudMeasurements && cloudMeasurements.length > 0) {
          setMeasurements(cloudMeasurements);
        }
      } catch (e) {
        console.error("Failed to load measurements from Supabase:", e);
      } finally {
        setIsLoadedFromCloud(true);
      }
    }
    loadMeasurements();
  }, []);

  const [showCategorySelectorModal, setShowCategorySelectorModal] = useState(false);
  const [selectedCountCategoryId, setSelectedCountCategoryId] = useState<string>("");
  const [modalItems, setModalItems] = useState<StockItem[]>([]);

  // Record measurement modal state
  const [showCountModal, setShowCountModal] = useState(false);
  const [deleteConfirmMeasurement, setDeleteConfirmMeasurement] = useState<{ id: string; date: string } | null>(null);
  const [modalDate, setModalDate] = useState("");
  const [modalBalances, setModalBalances] = useState<Record<string, number>>({});
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null);
  const [draftMeasurement, setDraftMeasurement] = useState<{
    date: string;
    balances: Record<string, number>;
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [modalError, setModalError] = useState("");
  const [stockSubView, setStockSubView] = useState<"tabela" | "relatorio">("tabela");

  // Item CRUD states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; name: string } | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ id: string; name: string } | null>(null);
  const [itemCrudError, setItemCrudError] = useState("");

  // Persistence triggers for measurements with Supabase sync
  useEffect(() => {
    localStorage.setItem("clean_quotes_stock_measurements", JSON.stringify(measurements));

    if (!isLoadedFromCloud) return;

    const syncTimeout = setTimeout(async () => {
      try {
        // Find deleted measurements to remove from database
        const remoteData = await dbFetchMeasurements();
        const remoteIds = remoteData.map((m) => m.id);
        const localIds = measurements.map((m) => m.id);
        const deletedIds = remoteIds.filter((id) => !localIds.includes(id));

        for (const delId of deletedIds) {
          await dbDeleteMeasurement(delId);
        }

        if (measurements.length > 0) {
          await dbUpsertMeasurements(measurements);
        }
      } catch (err) {
        console.error("Autosync measurements to Supabase failed:", err);
      }
    }, 1500);

    return () => clearTimeout(syncTimeout);
  }, [measurements, isLoadedFromCloud]);

  // Clipboard copy vertical list states & handlers
  const [copiedColumnId, setCopiedColumnId] = useState<string | null>(null);
  const [isolatedColumnId, setIsolatedColumnId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const toggleIsolateColumn = (colId: string) => {
    if (isolatedColumnId === colId) {
      setIsolatedColumnId(null);
      showToast("🔓 Seleção restaurada. Todas as colunas estão liberadas!");
    } else {
      setIsolatedColumnId(colId);
      let colName = colId;
      if (colId === "names") colName = "Nomes de Materiais";
      else if (colId === "projection") colName = "Coluna de Projeção";
      else if (colId === "saldo") colName = "Coluna do Saldo";
      else {
        const mObj = measurements.find(rm => rm.id === colId);
        if (mObj) colName = mObj.date;
      }
      showToast(`🎯 Coluna [${colName}] isolada! Arraste o mouse sobre ela para marcar apenas estes números.`);
    }
  };

  // Esc key down handler to clear selection isolation mode
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isolatedColumnId) {
          setIsolatedColumnId(null);
          showToast("🔓 Seleção restaurada. Modo de isolamento desativado.");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isolatedColumnId]);

  const copyMeasurementVertical = (m: Measurement) => {
    const values = items.map(it => getItemBalanceVal(m, it));
    const text = values.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedColumnId(m.id);
      showToast(`📋 Coluna (${m.date}) copiada com sucesso na vertical para colar no Excel!`);
      setTimeout(() => setCopiedColumnId(null), 2000);
    }).catch(err => {
      console.error("Erro ao copiar medição:", err);
      showToast("❌ Falha ao copiar quantidades para a área de transferência.");
    });
  };

  const copyProjectionVertical = () => {
    const values = items.map(it => {
      const mLast = reportMeasurements[reportMeasurements.length - 1];
      const mPenultimate = reportMeasurements[reportMeasurements.length - 2];
      const valLast = mLast ? getItemBalanceVal(mLast, it) : 0;
      const valPenultimate = mPenultimate ? getItemBalanceVal(mPenultimate, it) : 0;
      const consumed = valPenultimate > valLast ? (valPenultimate - valLast) : 0;
      const projectedQty = Math.max(0, valLast - consumed);
      return projectedQty;
    });
    const text = values.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedColumnId("projection");
      showToast("📋 Coluna de Projeção copiada na vertical com sucesso!");
      setTimeout(() => setCopiedColumnId(null), 2000);
    }).catch(err => {
      console.error("Erro ao copiar projeção:", err);
      showToast("❌ Falha ao copiar projeções para a área de transferência.");
    });
  };

  const copyConsumoPerCapitaVertical = () => {
    const values = items.map(it => {
      const history = reportMeasurements.map(meas => ({
        date: meas.date,
        qty: getItemBalanceVal(meas, it)
      }));
      const res = calculateConsumoPerCapita(history, capacityRows);
      if (res.value === null) return "—";
      return res.value.toFixed(5);
    });
    const text = values.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedColumnId("consumoPerCapita");
      showToast("📋 Coluna de Consumo Per Capita copiada na vertical com sucesso!");
      setTimeout(() => setCopiedColumnId(null), 2000);
    }).catch(err => {
      console.error("Erro ao copiar consumo per capita:", err);
      showToast("❌ Falha ao copiar consumo per capita para a área de transferência.");
    });
  };

  const copyItemNamesVertical = () => {
    const text = items.map(it => it.name).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedColumnId("names");
      showToast("📋 Nomes dos materiais copiados na vertical com sucesso!");
      setTimeout(() => setCopiedColumnId(null), 2000);
    }).catch(err => {
      console.error("Erro ao copiar nomes:", err);
      showToast("❌ Falha ao copiar nomes para a área de transferência.");
    });
  };

  // Map dates helper: translates standard dd/mm/yyyy to "jun/26" for mapping capacity
  const getCapacityForDate = (dateStr: string) => {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const monthIndex = parseInt(parts[1], 10);
      const yearStr = parts[2].substring(2); // "26"
      const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      const m = months[monthIndex - 1] || "jun";
      const key = `${m}/${yearStr}`;

      const found = capacityRows.find(row => row.month.toLowerCase().trim() === key.toLowerCase().trim());
      if (found) return found.capacity;
    }
    return 538; // Default to historical capacity if unavailable
  };

  const getCapacityForDateNullable = (dateStr: string, rows: CapacityRow[]) => {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const monthIndex = parseInt(parts[1], 10);
      const yearStr = parts[2].substring(2); // "26"
      const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      const m = months[monthIndex - 1] || "jun";
      const key = `${m}/${yearStr}`;

      const found = rows.find(row => row.month.toLowerCase().trim() === key.toLowerCase().trim());
      if (found) return found.capacity;
    }
    return null;
  };

  const calculateConsumoPerCapita = (
    history: { date: string; qty: number }[],
    capacityRows: CapacityRow[]
  ): { value: number | null; status: 'consumo' | 'mantido' | 'zerado' } => {
    if (history.length < 2) {
      return { value: 0, status: 'zerado' };
    }

    let lastValidValue: number | null = 0;
    let currentStatus: 'consumo' | 'mantido' | 'zerado' = 'zerado';
    let hasHadAnyValidInterval = false;

    // Chronologic traversal
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];

      const delta = prev.qty - curr.qty;

      if (delta > 0) {
        const cap = getCapacityForDateNullable(curr.date, capacityRows);
        if (cap !== null) {
          lastValidValue = delta / cap;
          currentStatus = 'consumo';
          hasHadAnyValidInterval = true;
        } else {
          lastValidValue = null;
          currentStatus = 'zerado';
          hasHadAnyValidInterval = true;
        }
      } else {
        if (hasHadAnyValidInterval) {
          if (lastValidValue !== null) {
            currentStatus = 'mantido';
          }
        } else {
          lastValidValue = 0;
          currentStatus = 'zerado';
        }
      }
    }

    return {
      value: lastValidValue,
      status: currentStatus
    };
  };

  const findRealItemByLookupKeys = (lookupKeys: string[]): { id: string; name: string } => {
    for (const cat of categories) {
      for (const item of cat.items) {
        if (lookupKeys.some(key => key.toLowerCase().trim() === item.toLowerCase().trim())) {
          return { id: item, name: item };
        }
      }
    }
    for (const d of DEFAULT_STOCK_ITEMS) {
      if (lookupKeys.some(key => key.toLowerCase().trim() === d.name.toLowerCase().trim())) {
        return d;
      }
    }
    return { id: lookupKeys[0], name: lookupKeys[0] };
  };

  // Selected item state for statistics popup
  const [selectedItemStatsPopup, setSelectedItemStatsPopup] = useState<{ id: string; name: string } | null>(null);

  // Chronologically sort measurements
  const sortedMeasurements = useMemo(() => {
    return [...measurements].sort((a, b) => {
      const partsA = a.date.split("/");
      const partsB = b.date.split("/");
      if (partsA.length === 3 && partsB.length === 3) {
        const dateA = new Date(parseInt(partsA[2], 10), parseInt(partsA[1], 10) - 1, parseInt(partsA[0], 10));
        const dateB = new Date(parseInt(partsB[2], 10), parseInt(partsB[1], 10) - 1, parseInt(partsB[0], 10));
        return dateA.getTime() - dateB.getTime();
      }
      return 0;
    });
  }, [measurements]);

    // Last 5 measurements for the report
  const reportMeasurements = useMemo(() => {
    return sortedMeasurements.slice(-5);
  }, [sortedMeasurements]);

  // Generate statistics & evolutions base on last and penultimate measurements
  const lastMeasurement = sortedMeasurements[sortedMeasurements.length - 1];
  const penultimateMeasurement = sortedMeasurements[sortedMeasurements.length - 2];
  const skipAutoOpen = React.useRef(false);

  // Open modal to record or edit count
  const handleOpenCountModal = (existing?: Measurement) => {
    setModalError("");
    
    // Check if there are measurements for this category
    const categoryMeasurements = measurements.filter(m => {
      return items.some(it => m.balances[it.id] !== undefined || m.balances[it.name] !== undefined);
    });
    const hasNoMeasurementsForCategory = categoryMeasurements.length === 0;

    if (existing) {
      setEditingMeasurementId(existing.id);
      setModalDate(existing.date);
      setModalItems(items);
      
      const initial: Record<string, number> = {};
      items.forEach(it => {
        initial[it.id] = getItemBalanceVal(existing, it);
      });
      setModalBalances(initial);
    } else {
      setEditingMeasurementId(null);
      // Format today
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      setModalDate(`${dd}/${mm}/${yyyy}`);
      
      // REQUIREMENT 1: Ask for item registration ONLY if there are no registered items.
      // If items already exist, skip registration phase and load them directly.
      if (items.length > 0) {
        setModalItems(items);
        const initial: Record<string, number> = {};
        items.forEach(it => {
          initial[it.id] = lastMeasurement ? getItemBalanceVal(lastMeasurement, it) : 0;
        });
        setModalBalances(initial);
      } else {
        // No registered items at all: start empty so they can paste/create items
        setModalItems([]);
        setModalBalances({});
      }
    }
    setShowCountModal(true);
  };

  // Open the select category modal or start inline count directly
  const handleOpenNewCountSelector = () => {
    const targetCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];
    if (targetCategory) {
      const targetItems = targetCategory.items.map((name, idx) => ({
        id: `st-${targetCategory.id}-${idx}`,
        name,
        category: targetCategory.name
      }));

      const targetCategoryMeasurements = measurements.filter(m => {
        return targetItems.some(it => m.balances[it.id] !== undefined || m.balances[it.name] !== undefined);
      });

      const hasNoMeasurementsForCategory = targetCategoryMeasurements.length === 0;

      // REQUIREMENT 2: If we have items and previous measurements, open inline draft column immediately!
      if (targetItems.length > 0 && !hasNoMeasurementsForCategory) {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const dateStr = `${dd}/${mm}/${yyyy}`;
        
        setDraftMeasurement({
          date: dateStr,
          balances: {}
        });
        showToast(`Nova coluna de contagem aberta para ${targetCategory.name.toUpperCase()}!`);
        return;
      }
    }

    // Otherwise (no items or no previous measurements), show standard selector or open modal
    setSelectedCountCategoryId(selectedCategoryId || (categories[0]?.id || ""));
    setShowCategorySelectorModal(true);
  };

  // Paste multiple quantities starting from a specific row inside the modal
  const handleModalPasteBulk = (startItemId: string, text: string) => {
    const lines = text.split(/\r?\n/).map(l => l.trim());
    if (lines.length <= 1 && lines[0] === "") return;

    const startIdx = modalItems.findIndex(it => it.id === startItemId);
    if (startIdx === -1) return;

    setModalBalances(prev => {
      const updated = { ...prev };
      let lineOffset = 0;
      for (let i = startIdx; i < modalItems.length && lineOffset < lines.length; i++) {
        const line = lines[lineOffset];
        let val = 0;
        if (line !== "") {
          let valStr = line.replace(/[^\d.,-]/g, "");
          if (valStr.includes(".") && valStr.includes(",")) {
            if (valStr.indexOf(".") < valStr.indexOf(",")) {
              valStr = valStr.replace(/\./g, "").replace(",", ".");
            } else {
              valStr = valStr.replace(/,/g, "");
            }
          } else if (valStr.includes(",")) {
            valStr = valStr.replace(",", ".");
          }
          const num = parseFloat(valStr);
          if (!isNaN(num) && num >= 0) {
            val = Math.round(num);
          }
        }
        updated[modalItems[i].id] = val;
        lineOffset++;
      }
      return updated;
    });
  };

  // Paste multiple quantities starting from a specific row directly in the table (inline draft)
  const handleDraftPasteBulk = (startItemId: string, text: string) => {
    const lines = text.split(/\r?\n/).map(l => l.trim());
    if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) return;

    const startIdx = items.findIndex(it => it.id === startItemId);
    if (startIdx === -1) return;

    setDraftMeasurement(prev => {
      if (!prev) return null;
      const updatedBalances = { ...prev.balances };
      let lineOffset = 0;
      for (let i = startIdx; i < items.length && lineOffset < lines.length; i++) {
        const line = lines[lineOffset];
        let val = 0;
        if (line !== "") {
          let valStr = line.replace(/[^\d.,-]/g, "");
          if (valStr.includes(".") && valStr.includes(",")) {
            if (valStr.indexOf(".") < valStr.indexOf(",")) {
              valStr = valStr.replace(/\./g, "").replace(",", ".");
            } else {
              valStr = valStr.replace(/,/g, "");
            }
          } else if (valStr.includes(",")) {
            valStr = valStr.replace(",", ".");
          }
          const num = parseFloat(valStr);
          if (!isNaN(num) && num >= 0) {
            val = Math.round(num);
          }
        }
        updatedBalances[items[i].id] = val;
        lineOffset++;
      }
      return { ...prev, balances: updatedBalances };
    });
  };

  // Save the inline draft measurement
  const handleSaveDraftMeasurement = () => {
    if (!draftMeasurement || !draftMeasurement.date.trim()) {
      showToast("Por favor, digite uma data válida!");
      return;
    }

    const itemBalances: Record<string, number> = {};
    items.forEach((item, idx) => {
      const permanentId = `st-${activeCategory.id}-${idx}`;
      const val = Number(draftMeasurement.balances[item.id] || draftMeasurement.balances[item.name] || 0);
      itemBalances[permanentId] = val;
      itemBalances[item.name] = val;
    });

    const newMeasurement: Measurement = {
      id: "m-" + Date.now(),
      date: draftMeasurement.date,
      balances: itemBalances
    };

    setMeasurements(prev => [...prev, newMeasurement]);
    setDraftMeasurement(null);
    showToast("Medição de estoque salva com sucesso!");
  };

  // Automatically open count modal when selected category changes (user clicks filter/selection)
  const isFirstCategoryRender = React.useRef(true);
  useEffect(() => {
    if (isFirstCategoryRender.current) {
      isFirstCategoryRender.current = false;
      return;
    }
    if (skipAutoOpen.current) {
      skipAutoOpen.current = false;
      return;
    }
    handleOpenCountModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  // Save measurement
  const handleSaveMeasurement = () => {
    if (!modalDate.trim()) {
      setModalError("Por favor, digite uma data válida!");
      return;
    }
    setModalError("");

    // 1. Register any new items to active category permanently
    const currentCategoryItems = [...activeCategory.items];
    const newItemsAdded: string[] = [];
    
    modalItems.forEach(item => {
      if (!currentCategoryItems.some(it => it.toLowerCase().trim() === item.name.toLowerCase().trim())) {
        currentCategoryItems.push(item.name.trim());
        newItemsAdded.push(item.name.trim());
      }
    });

    if (newItemsAdded.length > 0) {
      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.id === activeCategory.id) {
            return {
              ...cat,
              items: currentCategoryItems
            };
          }
          return cat;
        })
      );
    }

    const itemBalances: Record<string, number> = {};
    modalItems.forEach(item => {
      const finalIndex = currentCategoryItems.findIndex(it => it.toLowerCase().trim() === item.name.toLowerCase().trim());
      const permanentId = `st-${activeCategory.id}-${finalIndex}`;
      const val = Number(modalBalances[item.id] || modalBalances[item.name] || 0);
      
      itemBalances[permanentId] = val;
      itemBalances[item.name] = val;
    });

    if (editingMeasurementId) {
      setMeasurements(prev => prev.map(m => {
        if (m.id === editingMeasurementId) {
          return { ...m, date: modalDate, balances: { ...m.balances, ...itemBalances } };
        }
        return m;
      }));
    } else {
      const newMeasurement: Measurement = {
        id: "m-" + Date.now(),
        date: modalDate,
        balances: itemBalances
      };
      setMeasurements(prev => [...prev, newMeasurement]);
    }

    setShowCountModal(false);
  };

  // Delete measurement
  const handleDeleteMeasurement = (id: string, date: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  };

  // Item CRUD handler: Add item to selected category
  const handleAddItem = () => {
    const trimmed = newItemName.trim();
    if (!trimmed) {
      setItemCrudError("Por favor, informe o nome do material.");
      return;
    }

    // Check if item already exists in active category
    const alreadyExists = activeCategory.items.some(
      (it) => it.toLowerCase().trim() === trimmed.toLowerCase()
    );

    if (alreadyExists) {
      setItemCrudError("Esse material já existe nesta categoria!");
      return;
    }

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === activeCategory.id) {
          return {
            ...cat,
            items: [...cat.items, trimmed]
          };
        }
        return cat;
      })
    );

    setNewItemName("");
    setShowAddItemModal(false);
    showToast(`✅ Material "${trimmed}" adicionado com sucesso!`);
  };

  // Item CRUD handler: Edit item name
  const handleEditItem = () => {
    const trimmed = editingItemName.trim();
    if (!trimmed) {
      setItemCrudError("O nome do material não pode ser vazio.");
      return;
    }

    if (!editingItem) return;

    // Check if name already exists for another item in the category
    const alreadyExists = activeCategory.items.some(
      (it) => it.toLowerCase().trim() === trimmed.toLowerCase() && it.toLowerCase().trim() !== editingItem.name.toLowerCase().trim()
    );

    if (alreadyExists) {
      setItemCrudError("Já existe outro material com esse nome nesta categoria!");
      return;
    }

    // 1. Update in categories list
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === activeCategory.id) {
          return {
            ...cat,
            items: cat.items.map((it) => (it === editingItem.name ? trimmed : it))
          };
        }
        return cat;
      })
    );

    // 2. Also rename inside measurements balances so historical data is kept
    setMeasurements((prev) =>
      prev.map((m) => {
        const updatedBalances = { ...m.balances };
        // If there was a balance recorded for the old name, copy it to the new name and delete old key
        if (updatedBalances[editingItem.name] !== undefined) {
          updatedBalances[trimmed] = updatedBalances[editingItem.name];
          delete updatedBalances[editingItem.name];
        }
        // Also do for id if needed
        if (updatedBalances[editingItem.id] !== undefined) {
          updatedBalances[trimmed] = updatedBalances[editingItem.id];
        }
        return {
          ...m,
          balances: updatedBalances
        };
      })
    );

    setEditingItem(null);
    setShowEditItemModal(false);
    showToast(`📝 Material alterado para "${trimmed}" com sucesso!`);
  };

  // Item CRUD handler: Delete item
  const handleDeleteItem = (itemName: string) => {
    // 1. Remove from categories list
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === activeCategory.id) {
          return {
            ...cat,
            items: cat.items.filter((it) => it !== itemName)
          };
        }
        return cat;
      })
    );

    // 2. Optionally clean up balances from measurements
    setMeasurements((prev) =>
      prev.map((m) => {
        const updatedBalances = { ...m.balances };
        delete updatedBalances[itemName];
        return {
          ...m,
          balances: updatedBalances
        };
      })
    );

    setDeleteConfirmItem(null);
    showToast(`🗑️ Material "${itemName}" removido com sucesso!`);
  };

  // Computed comparison list for current items between last and penultimate measurements
  const comparativeEvolution = useMemo(() => {
    if (!lastMeasurement) return [];
    
    return items.map(item => {
      const valLast = getItemBalanceVal(lastMeasurement, item);
      const valPenultimate = penultimateMeasurement ? getItemBalanceVal(penultimateMeasurement, item) : valLast;
      
      // If last measurement is greater than penultimate, consumption is 0, since the latest count represents the updated stock.
      const consumedAmount = valPenultimate > valLast ? (valPenultimate - valLast) : 0;
      
      return {
        item,
        valLast,
        valPenultimate,
        consumedAmount
      };
    });
  }, [items, lastMeasurement, penultimateMeasurement]);

  // Overall calculations dynamically adapted to the active category (re-aligned to show Toilet Paper statistics if found)
  const summaryCounters = useMemo(() => {
    const lastCap = lastMeasurement ? getCapacityForDate(lastMeasurement.date) : 538;
    const toiletPaper = items.find(it => it.name.toUpperCase().includes("PAPEL HIG"));

    let activeCategoryLastTotal = 0;
    let activeCategoryConsumption = 0;

    if (toiletPaper) {
      const paperLastVal = lastMeasurement ? getItemBalanceVal(lastMeasurement, toiletPaper) : 0;
      activeCategoryLastTotal = paperLastVal * 4;

      const paperPenultimateVal = penultimateMeasurement ? getItemBalanceVal(penultimateMeasurement, toiletPaper) : paperLastVal;
      const consumedAmount = paperPenultimateVal > paperLastVal ? (paperPenultimateVal - paperLastVal) * 4 : 0;
      activeCategoryConsumption = consumedAmount;
    } else {
      comparativeEvolution.forEach(({ valLast, consumedAmount }) => {
        activeCategoryLastTotal += valLast;
        activeCategoryConsumption += consumedAmount;
      });
    }

    return {
      activeCategoryLastTotal,
      activeCategoryConsumption,
      lastCap,
      perCapita: lastCap > 0 ? activeCategoryConsumption / lastCap : 0,
    };
  }, [comparativeEvolution, lastMeasurement, penultimateMeasurement, items]);

  // Hook designed to compute the next projected measurement date based on day interval between last and penultimate measurements
  const nextScheduledInfo = useMemo(() => {
    if (sortedMeasurements.length < 2) {
      return { dateStr: "-", intervalDays: 14 };
    }
    const lastM = sortedMeasurements[sortedMeasurements.length - 1];
    const penM = sortedMeasurements[sortedMeasurements.length - 2];
    
    const pA = penM.date.split("/");
    const pB = lastM.date.split("/");
    if (pA.length === 3 && pB.length === 3) {
      const dA = new Date(parseInt(pA[2], 10), parseInt(pA[1], 10) - 1, parseInt(pA[0], 10));
      const dB = new Date(parseInt(pB[2], 10), parseInt(pB[1], 10) - 1, parseInt(pB[0], 10));
      const intervalDays = Math.max(1, Math.round(Math.abs(dB.getTime() - dA.getTime()) / (1000 * 60 * 60 * 24)));
      
      const nextDate = new Date(dB.getTime() + intervalDays * 1000 * 60 * 60 * 24);
      const dd = String(nextDate.getDate()).padStart(2, '0');
      const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
      const yyyy = nextDate.getFullYear();
      return { dateStr: `${dd}/${mm}/${yyyy}`, intervalDays };
    }
    return { dateStr: "-", intervalDays: 14 };
  }, [sortedMeasurements]);

  // Hook designed to compute consolidated analytics and per-item metrics over all available history
  const detailedStats = useMemo(() => {
    if (sortedMeasurements.length < 2) {
      return {
        hasData: false,
        totalPeriods: 0,
        totalDays: 0,
        averageInterval: 0,
        averageCapacity: 0,
        totalConsumedAll: 0,
        itemStats: [],
        topConsumed: []
      };
    }

    let totalDays = 0;
    let intervalsCount = 0;
    let totalCapSum = 0;

    const parseDateHelper = (dStr: string) => {
      const parts = dStr.split("/");
      if (parts.length !== 3) return new Date();
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    };

    for (let i = 1; i < sortedMeasurements.length; i++) {
      const d1 = parseDateHelper(sortedMeasurements[i - 1].date);
      const d2 = parseDateHelper(sortedMeasurements[i].date);
      const diff = Math.max(1, Math.round(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
      totalDays += diff;
      intervalsCount++;
    }

    sortedMeasurements.forEach(m => {
      totalCapSum += getCapacityForDate(m.date);
    });

    const averageInterval = intervalsCount > 0 ? Math.round(totalDays / intervalsCount) : 14;
    const averageCapacity = Math.round(totalCapSum / sortedMeasurements.length);

    let totalConsumedAll = 0;
    const itemStats = items.map(item => {
      let totalItemConsumed = 0;
      for (let i = 1; i < sortedMeasurements.length; i++) {
        const valPrev = getItemBalanceVal(sortedMeasurements[i - 1], item);
        const valCurr = getItemBalanceVal(sortedMeasurements[i], item);
        if (valPrev > valCurr) {
          totalItemConsumed += (valPrev - valCurr);
        }
      }
      totalConsumedAll += totalItemConsumed;
      
      const dailyAverage = totalDays > 0 ? totalItemConsumed / totalDays : 0;
      const perCapita = averageCapacity > 0 ? (totalItemConsumed / averageCapacity) : 0;

      return {
        item,
        totalItemConsumed,
        dailyAverage,
        perCapita
      };
    });

    const sortedConsumed = [...itemStats].sort((a, b) => b.totalItemConsumed - a.totalItemConsumed);
    const topConsumed = sortedConsumed.slice(0, 3).map(x => ({
      name: x.item.name,
      qty: x.totalItemConsumed
    }));

    return {
      hasData: true,
      totalPeriods: intervalsCount,
      totalDays,
      averageInterval,
      averageCapacity,
      totalConsumedAll,
      itemStats,
      topConsumed
    };
  }, [sortedMeasurements, items]);

  // Helper designed specifically to render beautiful mini-insights and richer stats on each measurement card (aligned for Toilet Paper)
  const getMeasurementStats = (m: Measurement, idx: number) => {
    const cap = getCapacityForDate(m.date);
    const toiletPaper = items.find(it => it.name.toUpperCase().includes("PAPEL HIG"));
    
    let totalStock = 0;
    items.forEach(it => {
      totalStock += getItemBalanceVal(m, it);
    });

    let zeroCount = 0;
    items.forEach(it => {
      const val = getItemBalanceVal(m, it);
      if (val === 0) {
        zeroCount++;
      }
    });

    const perColab = cap > 0 ? (totalStock / cap).toFixed(2) : "0.00";

    // Variation compared to previous chronological measurement
    let variationText = "Início";
    let variationColor = "text-slate-500 bg-slate-100";
    if (idx > 0) {
      const prevM = sortedMeasurements[idx - 1];
      let prevTotalStock = 0;
      items.forEach(it => {
        prevTotalStock += getItemBalanceVal(prevM, it);
      });
      if (prevTotalStock > 0) {
        const pct = ((totalStock - prevTotalStock) / prevTotalStock) * 100;
        if (pct > 0) {
          variationText = `+${pct.toFixed(1)}% Vol`;
          variationColor = "text-emerald-700 bg-emerald-50 border border-emerald-100";
        } else if (pct < 0) {
          variationText = `${pct.toFixed(1)}% Vol`;
          variationColor = "text-[#111c2e] bg-[#ff2a6d]/10 border border-[#ff2a6d]/15";
        } else {
          variationText = "Estável";
          variationColor = "text-slate-500 bg-slate-100 border border-slate-150";
        }
      }
    }

    let highestItemName = "-";
    let highestVal = -1;
    let lowestItemName = "-";
    let lowestVal = Infinity;

    items.forEach(it => {
      const val = getItemBalanceVal(m, it);
      if (val > highestVal) {
        highestVal = val;
        highestItemName = it.name;
      }
      if (val > 0 && val < lowestVal) {
        lowestVal = val;
        lowestItemName = it.name;
      }
    });

    return {
      cap,
      itemCount: items.length,
      totalStock,
      zeroCount,
      highestItemName,
      highestVal,
      lowestItemName,
      lowestVal: lowestVal === Infinity ? 0 : lowestVal,
      perColab,
      variationText,
      variationColor
    };
  };

  const getFirstMeasurementOfMonth = (dateStr: string): Measurement | null => {
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    const monthStr = `/${parts[1]}/${parts[2]}`;
    const monthMeasurements = sortedMeasurements.filter(x => x.date.includes(monthStr));
    return monthMeasurements.length > 0 ? monthMeasurements[0] : null;
  };

  const checkCriticalStockState = (it: StockItem) => {
    if (sortedMeasurements.length < 2) {
      return { isCritical: false, text: "", explanation: "", dailyAverage: 0 };
    }
    
    const lastM = sortedMeasurements[sortedMeasurements.length - 1];
    const penM = sortedMeasurements[sortedMeasurements.length - 2];
    
    const valLast = getItemBalanceVal(lastM, it);
    const valPen = getItemBalanceVal(penM, it);
    
    const parseDate = (dStr: string) => {
      const parts = dStr.split("/");
      if (parts.length !== 3) return new Date();
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    };
    
    const dLast = parseDate(lastM.date);
    const dPen = parseDate(penM.date);
    const daysElapsed = Math.max(1, Math.round(Math.abs(dLast.getTime() - dPen.getTime()) / (1000 * 60 * 60 * 24)));
    
    const consumed = Math.max(0, valPen - valLast);
    const dailyAverage = consumed / daysElapsed;
    
    const firstM = getFirstMeasurementOfMonth(lastM.date);
    const refVal = firstM ? getItemBalanceVal(firstM, it) : 10;
    
    let isCritical = false;
    let text = "";
    let explanation = "";
    
    if (valLast === 0) {
      isCritical = true;
      text = "🚨 CRÍTICO (ZERADO)";
      explanation = "Sem estoque!";
    } else if (dailyAverage > 0) {
      const projectedDays = valLast / dailyAverage;
      if (projectedDays < daysElapsed) {
        isCritical = true;
        text = `⚠️ CRÍTICO`;
        explanation = `Esgota em ${projectedDays.toFixed(1)} dias (consumo médio: ${dailyAverage.toFixed(2)}/dia)`;
      }
    } else {
      if (valLast < refVal * 0.2) {
        isCritical = true;
        text = "⚠️ CRÍTICO (BAIXO)";
        explanation = `Saldo atual (${valLast}) está abaixo de 20% da referência de início de mês (${refVal})`;
      }
    }
    
    return { isCritical, text, explanation, dailyAverage };
  };

  // Export stock measurements dynamically to build Quotation lists
  const handleExportStockToQuotation = () => {
    if (measurements.length === 0) {
      alert("Nenhuma medição encontrada para exportação.");
      return;
    }

    // Match chronological bounds for currently tracked month/year
    let targetMonthStr = "";
    if (sortedMeasurements.length > 0) {
      const lastM = sortedMeasurements[sortedMeasurements.length - 1];
      const parts = lastM.date.split("/");
      if (parts.length === 3) {
        targetMonthStr = `/${parts[1]}/${parts[2]}`;
      }
    } else {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      targetMonthStr = `/${mm}/${yyyy}`;
    }

    const currentMonthMeasurements = sortedMeasurements.filter(m => m.date.includes(targetMonthStr));

    if (currentMonthMeasurements.length === 0) {
      alert("Nenhuma medição encontrada no mês corrente para exportação.");
      return;
    }

    const firstMonthM = currentMonthMeasurements[0];
    const lastMonthM = currentMonthMeasurements[currentMonthMeasurements.length - 1];

    const stockData: Record<string, { minStock: number; currentStock: number }> = {};
    items.forEach(it => {
      const minStock = getItemBalanceVal(firstMonthM, it);
      const currentStock = getItemBalanceVal(lastMonthM, it);
      stockData[it.name] = { minStock, currentStock };
    });

    if (onExportToQuotation) {
      onExportToQuotation(selectedCategoryId, stockData);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 animate-fade-in leading-normal">
      
      {/* Upper Navigation & Compact Brand Bar */}
      <div className="showcase-card p-3 sm:p-4 px-4 sm:px-6 flex flex-wrap sm:flex-nowrap justify-between items-start sm:items-center gap-3 print:hidden mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button 
            onClick={onBack}
            className="p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-transform active:scale-95 text-[#ff2a6d] hover:text-[#ff2a6d]/80 cursor-pointer shrink-0"
            title="Voltar para a Cotação"
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest bg-[#ff2a6d]/8 text-[#ff2a6d] border border-[#ff2a6d]/15 px-1.5 sm:px-2 py-0.5 rounded-sm">
                Acompanhamento & Evolução
              </span>
            </div>
            <h1 className="text-[13px] sm:text-[17px] font-black uppercase text-slate-900 mt-0.5 flex items-center gap-1.5 sm:gap-2 truncate">
              📊 <span className="hidden sm:inline">Controle de Estoque de Consumíveis</span><span className="sm:hidden">Estoque</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenNewCountSelector}
            className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-[#ff2a6d] hover:bg-pink-600 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase text-white shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer leading-none"
          >
            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden xs:inline">Lançar Medição</span>
            <span className="xs:hidden">Medição</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase text-slate-600 border border-slate-200 transition-all active:scale-95 cursor-pointer leading-none"
          >
            <Printer className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Imprimir Relatório</span>
            <span className="sm:hidden">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Printable Header - visible only when printing */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-950 pb-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-xl font-black text-slate-950 uppercase">
              📊 RELATÓRIO DO CONTROLE DE ESTOQUE
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-bold">
              Consumo de Materiais de Limpeza e Informática baseados na Capacidade de Funcionários (Capacity)
            </p>
          </div>
          <div className="text-right text-[11px] font-mono text-slate-500">
            Gerado em: {new Date().toLocaleDateString("pt-BR")}
          </div>
        </div>
      </div>

      {/* Main Bento Dashboard Grid - asymmetric modules */}
      <div className="grid grid-cols-2 lg:grid-cols-12 gap-4 mb-6 print:hidden">
        
        {/* Card 1: Last Measurement - Dominant module (6 cols) */}
        <div className="col-span-2 lg:col-span-6 relative bp-card p-4 sm:p-5 transition-all flex flex-col justify-between overflow-hidden">
          <div className="flex items-start justify-between gap-1">
            <div className="space-y-1">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-[#ff2a6d] shrink-0 border border-pink-100">
                <CalendarDays className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#ff2a6d] block leading-none font-display">
                Última Contagem
              </span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xl lg:text-[22px] xl:text-[24px] font-black text-[#111c2e] block truncate font-display tracking-tight leading-none">
              {lastMeasurement ? lastMeasurement.date : "Nenhuma lançada"}
            </span>
            <span className="text-[11px] font-bold text-slate-500 mt-1.5 block leading-normal">
              Proporção baseada no capacity da equipe cadastrada.
            </span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-12 h-12 rounded-full bg-[#ff2a6d]/5 blur-xs pointer-events-none" />
        </div>

        {/* Card 2: Consumer Capacity -> Petroleum Blue (#111c2e) */}
        <div className="col-span-1 lg:col-span-2 relative bp-card p-4 transition-all flex flex-col justify-between overflow-hidden">
          <div className="flex items-start justify-between gap-1">
            <div className="space-y-1">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#111c2e]/5 text-[#111c2e] shrink-0 border border-[#111c2e]/15">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#111c2e] block leading-none font-display">
                Capacity Vigente
              </span>
            </div>
            <span className="inline-flex items-center rounded-full bg-[#111c2e]/10 px-1.5 py-0.5 text-[11px] font-black text-[#111c2e] uppercase border border-[#111c2e]/20 print:hidden shrink-0">
              Profissionais
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xl lg:text-[22px] xl:text-[24px] font-black text-[#111c2e] block font-display tracking-tight leading-none">
              {summaryCounters.lastCap} Colaboradores
            </span>
            <span className="text-[11px] font-bold text-slate-500 mt-1.5 block leading-normal">
              Ajustado automaticamente à data de cada medição de estoque.
            </span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-12 h-12 rounded-full bg-[#111c2e]/5 blur-xs pointer-events-none" />
        </div>

        {/* Card 3: Stock Volume */}
        <div className="col-span-1 lg:col-span-2 relative bp-card p-4 transition-all flex flex-col justify-between overflow-hidden">
          <div className="flex items-start justify-between gap-1">
            <div className="space-y-1">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff2a6d]/10 text-[#ff2a6d] shrink-0 border border-[#ff2a6d]/20">
                <TrendingDown className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#c21e54] block leading-none font-display truncate max-w-[150px]">
                Total Estocado ({activeCategory.name})
              </span>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xl lg:text-[22px] xl:text-[24px] font-black text-[#c21e54] block font-display tracking-tight leading-none">
              {summaryCounters.activeCategoryLastTotal} Unidades
            </span>
            <span className="text-[11px] font-bold text-slate-500 mt-1.5 block leading-normal">
              Volume total somado de todos os itens monitorados nesta categoria.
            </span>
          </div>
          <div className="absolute -bottom-6 -right-6 w-12 h-12 rounded-full bg-[#ff2a6d]/10 blur-xs pointer-events-none" />
        </div>

        {/* Card 4: Consumption per Capita -> Magenta (#c21e54) */}
        <div className="col-span-1 lg:col-span-2 relative bp-card p-4 transition-all flex flex-col justify-between overflow-hidden">
          <div className="flex items-start justify-between gap-1">
            <div className="space-y-1">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#c21e54]/10 text-[#c21e54] shrink-0 border border-[#c21e54]/20">
                <BarChart3 className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#c21e54] block leading-none font-display">
                Consumo por Colaborador
              </span>
            </div>
          </div>
          <div className="mt-4">
            {reportMeasurements.length < 2 ? (
              <>
                <span className="text-[11px] font-black text-[#c21e54] block uppercase tracking-tight font-display leading-none">
                  Mínimo 2 Contagens
                </span>
                <span className="text-[11px] font-bold text-slate-500 mt-1.5 block leading-normal">
                  Insira mais contagens para liberar as estatísticas.
                </span>
              </>
            ) : (
              <>
                <span className="text-xl lg:text-[22px] xl:text-[24px] font-black text-[#c21e54] block font-display tracking-tight leading-none">
                  {summaryCounters.perCapita.toFixed(3)} Unidades
                </span>
                <span className="text-[11px] font-bold text-slate-500 mt-1.5 block leading-normal">
                  Consumo médio diário por profissional no período.
                </span>
              </>
            )}
          </div>
          <div className="absolute -bottom-6 -right-6 w-12 h-12 rounded-full bg-[#c21e54]/10 blur-xs pointer-events-none" />
        </div>
      </div>

      {/* Category Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs mb-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-pink-50 rounded-xl flex items-center justify-center text-[#ff2a6d] border border-pink-100 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#ff2a6d] block">Categoria para Controle</span>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Categoria Ativa para Acompanhamento</h2>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 md:max-w-2xl justify-end">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <span className="text-xs font-bold text-slate-500 shrink-0">Filtrar:</span>
              <div className="relative flex-1">
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    localStorage.setItem("clean_quotes_stock_selected_category_id", e.target.value);
                    setStockSubView("tabela");
                  }}
                  className="w-full text-xs font-extrabold border border-slate-200 hover:border-slate-350 focus:border-pink-500 rounded-xl p-2.5 bg-slate-50 text-slate-800 appearance-none cursor-pointer pr-10 shadow-3xs focus:outline-hidden"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name.toUpperCase()}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setItemCrudError("");
                setNewItemName("");
                setShowAddItemModal(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#111c2e] hover:bg-slate-800 text-white px-4 py-2.5 text-[11px] font-black uppercase transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
              title="Cadastrar um novo material nesta categoria"
            >
              <Plus className="h-4 w-4" />
              Novo Material
            </button>

            <button
              type="button"
              onClick={handleExportStockToQuotation}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-[11px] font-black uppercase transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
              title="Exportar quantidades do mês como Mínimo Canal e Estoque Atual para esta categoria de Cotação"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar para Cotação
            </button>
          </div>
        </div>
      </div>

      {/* Subview Selector */}
      <div className="flex bg-slate-100 hover:bg-slate-250/60 p-1 rounded-2xl max-w-md mb-6 print:hidden transition-colors">
        <button
          type="button"
          onClick={() => setStockSubView("tabela")}
          className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-black uppercase text-center transition-all cursor-pointer ${
            stockSubView === "tabela" 
              ? "bg-white text-[#ff2a6d] shadow-xs font-black animate-pulse-subtle" 
              : "text-slate-500 hover:text-slate-800 font-bold"
          }`}
        >
          📋 Painel Geral
        </button>
        <button
          type="button"
          onClick={() => setStockSubView("relatorio")}
          className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-black uppercase text-center transition-all cursor-pointer ${
            stockSubView === "relatorio" 
              ? "bg-white text-[#ff2a6d] shadow-xs font-black animate-pulse-subtle" 
              : "text-slate-500 hover:text-slate-800 font-bold"
          }`}
        >
          📊 Relatório & Estatísticas
        </button>
      </div>

      {/* Report view - Detailed Stats & Analytics (Hiding Projection Column) */}
      {stockSubView === "relatorio" && (
        <div className="bg-indigo-950/5 border border-indigo-150 rounded-2xl p-5 mb-6 animate-fade-in print:bg-white print:border-slate-300">
          <h4 className="text-[12px] font-black uppercase text-indigo-900 tracking-wider mb-4 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>Relatório de Medições e Estatísticas de Consumo ({activeCategory.name})</span>
          </h4>
          
          {detailedStats.hasData ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-indigo-100 p-4 rounded-xl shadow-2xs">
                  <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest block">Período de Análise</span>
                  <span className="text-[13px] font-black text-slate-850 block mt-1.5">
                    {sortedMeasurements[0]?.date} até {sortedMeasurements[sortedMeasurements.length - 1]?.date}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 mt-1 block uppercase">
                    {detailedStats.totalDays} dias cobertos
                  </span>
                </div>

                <div className="bg-white border border-indigo-100 p-4 rounded-xl shadow-2xs">
                  <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest block">Freq. Média de Contagens</span>
                  <span className="text-[13px] font-black text-slate-850 block mt-1.5">
                    A cada {detailedStats.averageInterval} dias
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 mt-1 block uppercase">
                    {detailedStats.totalPeriods} intervalos registrados
                  </span>
                </div>

                <div className="bg-white border border-indigo-100 p-4 rounded-xl shadow-2xs">
                  <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest block">Uso Total Acumulado</span>
                  <span className="text-[13px] font-black text-emerald-600 block mt-1.5">
                    {detailedStats.totalConsumedAll} un consumidas
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 mt-1 block uppercase">
                    Unidades físicas totais usadas
                  </span>
                </div>

                <div className="bg-white border border-indigo-100 p-4 rounded-xl shadow-2xs">
                  <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest block">Top 3 Consumidos</span>
                  <div className="mt-1.5 space-y-0.5 min-w-0">
                    {detailedStats.topConsumed.map((item, id) => (
                      <div key={id} className="text-[11px] font-bold text-slate-800 flex justify-between gap-1 truncate">
                        <span className="truncate">{id+1}. {item.name}</span>
                        <span className="font-mono font-black text-indigo-700 shrink-0">{item.qty} un</span>
                      </div>
                    ))}
                    {detailedStats.topConsumed.length === 0 && (
                      <span className="text-[11px] text-slate-500 font-bold">Nenhum consumo detectado</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-50 border-b border-slate-200 py-2.5 px-4">
                  <span className="text-[11px] font-black uppercase text-slate-600 tracking-wider">Consumo Analítico Médio por Item</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-slate-700">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200 font-black text-slate-900 uppercase text-[11px] tracking-wider leading-none">
                        <th className="px-4 py-3">Descrição do Material</th>
                        <th className="px-4 py-3 text-center">Consumo Total</th>
                        <th className="px-4 py-3 text-center">Média Consumo / Dia</th>
                        <th className="px-4 py-3 text-center">Consumo per Capita</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-700">
                      {detailedStats.itemStats.map((st, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-bold text-slate-850">{st.item.name}</td>
                          <td className="px-4 py-2.5 text-center font-mono text-slate-900">{st.totalItemConsumed} un</td>
                          <td className="px-4 py-2.5 text-center font-mono text-indigo-700">
                            {st.dailyAverage > 0 ? `${st.dailyAverage.toFixed(2)} un/dia` : "0.00 un/dia"}
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono text-emerald-600">
                            {st.perCapita > 0 ? `${st.perCapita.toFixed(3)} un/colab` : "0.000 un/colab"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-white rounded-xl border-2 border-dashed border-indigo-150 text-center">
              <span className="text-xl block">📈</span>
              <p className="text-[11px] font-black text-indigo-550 uppercase tracking-wider mt-1">Estatísticas indisponíveis temporariamente</p>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">Lance pelo menos duas medições para gerar relatórios e estatísticas automatizadas.</p>
            </div>
          )}
        </div>
      )}

      {/* Main Single Roster Layout */}
      {stockSubView === "tabela" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs p-4 mb-6 print:hidden">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              📅 Registro de Medições de Estoque
            </h3>
            <button
              type="button"
              onClick={handleOpenNewCountSelector}
              className="inline-flex items-center gap-1 bg-[#ff2a6d] hover:bg-pink-600 text-white rounded-lg px-2.5 py-1 text-[11px] font-black uppercase shadow-xs transition-colors cursor-pointer text-xs"
            >
              <Plus className="h-3 w-3" />
              Nova Contagem
            </button>
          </div>
        
        {measurements.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-slate-150 rounded-xl">
            <span className="text-2xl">🗳️</span>
            <p className="text-xs font-black text-slate-600 mt-1 uppercase">Ainda não há medições gravadas</p>
            <p className="text-[11px] text-slate-500 font-bold leading-normal mt-0.5">
              Lance a primeira medição clicando no botão "Lançar Medição" acima.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedMeasurements.map((m, idx) => {
              const stats = getMeasurementStats(m, idx);

              return (
                <div 
                  key={m.id}
                  className="bg-white border-2 border-slate-200 hover:border-pink-400 rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-md"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full bg-[#ff2a6d] shrink-0" />
                      <span className="text-[12.5px] font-black text-slate-850 font-mono truncate">
                        {idx + 1}ª Medição ({m.date})
                      </span>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md shrink-0 border border-slate-150">
                      Cap: {stats.cap} colab
                    </span>
                  </div>

                  {/* Dense mini stats grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/50 rounded-xl p-3 border border-slate-150/70 mb-3">
                    <div>
                      <span className="text-slate-500 font-bold uppercase tracking-tight block text-[11px]">Volume Físico</span>
                      <span className="text-slate-900 font-extrabold text-[14.5px] mt-1 block">{stats.totalStock} unidades</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold uppercase tracking-tight block text-[11px]">Qtd / Colaborador</span>
                      <span className="text-[#ff2a6d] font-extrabold text-[14.5px] mt-1 block">{stats.perColab} un/colab</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold uppercase tracking-tight block text-[11px]">Itens Zerados</span>
                      <span className="text-slate-800 font-extrabold text-[14.5px] mt-1 block">{stats.zeroCount} itens</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold uppercase tracking-tight block text-[11px]">Histórico Fluxo</span>
                      <div className="mt-1 block">
                        <span className={`inline-block text-[11px] font-black px-2 py-0.5 rounded ${stats.variationColor}`}>
                          {stats.variationText}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Individual Items Balance inside the card */}
                  <div className="bg-[#ff2a6d]/5 border border-[#ff2a6d]/15 rounded-xl p-3 mb-3">
                    <span className="text-[11px] font-black uppercase text-[#111c2e] tracking-wider block mb-2 border-b border-[#ff2a6d]/15 pb-1 select-none">
                      📍 Itens Sob Mais Atenção ({activeCategory.name})
                    </span>
                    
                    <div className="space-y-3">
                      {(() => {
                        const cardAttentionItems = ATTENTION_ITEMS.filter(it => {
                          const normItem = it.category.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                          const normActive = activeCategory.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                          return normActive.includes(normItem) || normItem.includes(normActive);
                        });

                        if (cardAttentionItems.length === 0) {
                          return (
                            <div className="text-center py-2">
                              <span className="text-[11px] font-bold text-slate-500 uppercase">
                                Não há itens sob atenção monitorados para esta categoria.
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div className="flex flex-col gap-2">
                            {cardAttentionItems.map(it => {
                              const val = getAttentionItemValue(m.balances, it.lookupKeys);
                              const realIt = findRealItemByLookupKeys(it.lookupKeys);
                              
                              // We use the same history as the table's "P/ Capita" column (reportMeasurements)
                              const historyForOverall = reportMeasurements.map(meas => ({
                                date: meas.date,
                                qty: getItemBalanceVal(meas, realIt)
                              }));
                              const { value, status } = calculateConsumoPerCapita(historyForOverall, capacityRows);
                              const isConsumo = status === "consumo";
                              const isMantido = status === "mantido";
                              
                              const textVal = value === null ? "—" : value.toFixed(5);
                              const badgeBg = isConsumo ? "bg-rose-50 text-[#ff2a6d] border-rose-100" 
                                              : isMantido ? "bg-amber-50 text-amber-700 border-amber-100"
                                              : "bg-slate-50 text-slate-450 border-slate-100";
                              const badgeText = isConsumo ? "Consumo"
                                                : isMantido ? "Estoque Entrada"
                                                : "Sem hist.";

                              return (
                                <div key={it.name} className="border-b border-dashed border-slate-150 pb-1.5 last:border-b-0 last:pb-0">
                                  <div className="flex items-center justify-between text-[11px] leading-none mb-1">
                                    <span className="text-slate-700 font-bold truncate pr-3" title={it.name}>{it.name}</span>
                                    <span className={`font-mono font-black rounded-sm px-1 leading-none ${val === 0 ? "bg-rose-100 text-[#ff2a6d] font-black" : "bg-slate-100/95 text-[#111c2e]"}`}>
                                      {val}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] leading-none font-bold text-slate-500">
                                    <span>{textVal} / colab</span>
                                    <span className={`px-1 py-0.2 rounded-sm border uppercase scale-90 ${badgeBg}`}>{badgeText}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Micro insight */}
                  <div className="text-[11.5px] text-slate-600 font-bold mb-3.5 truncate px-1">
                    {stats.highestVal > 0 ? (
                      <span>🔥 Maior: <strong className="text-slate-800 font-black">{stats.highestItemName}</strong> ({stats.highestVal} un)</span>
                    ) : (
                      <span className="text-slate-500">Nenhum saldo</span>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenCountModal(m)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-black uppercase hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                    >
                      Editar Saldos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirmMeasurement({ id: m.id, date: m.date });
                      }}
                      className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-[11px] font-black uppercase cursor-pointer transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* COMPREHENSIVE STOCK REPORT TABLE (visible always, formatted for layout and printing) */}
      <div className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-3xs p-4 md:p-6 print:border-none print:shadow-none print:bg-transparent print:p-0">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3.5 border-b border-slate-200 gap-2 mb-4 print:mb-2 text-slate-800">
          <div>
            <h3 className="text-sm md:text-[15px] font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
              <span>📋 Grade Comparativa Evolution</span>
              <span className="text-slate-500 font-medium">-</span>
              <span className="text-[#ff2a6d] font-black bg-pink-50 border border-pink-100 rounded-lg px-2.5 py-1 text-xs">{activeCategory.name.toUpperCase()}</span>
              <span className="text-xs text-slate-500 font-bold">({reportMeasurements.length} Contagens)</span>
            </h3>
            <p className="text-[11px] text-slate-550 font-bold leading-normal mt-1 print:-mt-0.5">
              Histórico de saldo atualizado por item em conformidade com as medições vigentes. Exclua a medição clicando no emoji ❌ na data.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={handleOpenNewCountSelector}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#111c2e] hover:bg-slate-800 text-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer leading-none"
              title="Lançar uma nova medição física de estoque"
            >
              <Calendar className="h-3 w-3 text-pink-400" />
              Incluir Nova Data
            </button>
          </div>
        </div>

        {isolatedColumnId && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border-l-4 border-amber-500 p-2.5 sm:p-3.5 mb-4 rounded-r-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs animate-fade-in print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-black uppercase text-amber-800 tracking-wide flex items-center gap-1.5 shrink-0 select-none">
                🎯 MODO SELEÇÃO VERTICAL ATIVO
              </span>
              <span className="text-[11.5px] font-bold text-slate-750 leading-normal select-none">
                Esta coluna foi isolada. Agora você pode clicar no primeiro número dela,{" "}
                <strong className="text-amber-950 font-extrabold underline decoration-amber-500 decoration-2">arrastar o mouse direto para baixo</strong> para marcar apenas essas quantidades, e apertar <kbd className="bg-slate-200 border border-slate-300 rounded px-1 text-[11px] font-mono shadow-5xs">Ctrl+C</kbd> para copiar! Os outros itens estão bloqueados para não atrapalhar.
              </span>
            </div>
            <button 
              type="button"
              onClick={() => setIsolatedColumnId(null)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95 shrink-0 shadow-3xs"
            >
              Concluir / Sair (Esc)
            </button>
          </div>
        )}

        {reportMeasurements.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-slate-150 rounded-xl">
            <p className="text-xs font-black text-slate-500 uppercase">Não há medições disponíveis para o relatório</p>
          </div>
        ) : (
          (() => {
            const isDenserTable = reportMeasurements.length >= 3;
            const textClass = isDenserTable ? "text-[11px]" : "text-[12.5px]";
            const labelClass = isDenserTable ? "text-[11px]" : "text-[11.5px]";
            const nameTextClass = isDenserTable ? "text-[12px] md:text-[13px]" : "text-[13.0px] md:text-[14.5px]";
            const cellPaddingClass = isDenserTable ? "px-2 py-0.5" : "px-3.5 py-1";
            const numTextClass = isDenserTable ? "text-[11.5px]" : "text-[13px]";

            return (
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full border-collapse text-left text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-50/80 font-black uppercase text-slate-900 tracking-tight print:bg-slate-100">
                      <th className={`${cellPaddingClass} ${labelClass} text-left w-full sm:w-[290px] transition-all duration-300 ${
                        isolatedColumnId && isolatedColumnId !== "names" 
                          ? "select-none opacity-15 pointer-events-none" 
                          : ""
                      }`}>
                        <div className="flex items-center justify-between gap-1">
                          <span>Descrição do Material</span>
                          <div className="flex items-center gap-1 shrink-0 print:hidden">
                            <button
                              type="button"
                              onClick={() => copyItemNamesVertical()}
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider tracking-tight transition-all active:scale-95 cursor-pointer leading-none ${
                                copiedColumnId === "names" 
                                  ? "bg-emerald-500 text-white shadow-2xs" 
                                  : "bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-800"
                              }`}
                              title="Copiar lista de nomes de materiais na vertical"
                            >
                              {copiedColumnId === "names" ? "Copiado" : "Copiar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleIsolateColumn("names")}
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider tracking-tight transition-all active:scale-95 cursor-pointer leading-none ${
                                isolatedColumnId === "names"
                                  ? "bg-amber-600 text-white animate-pulse"
                                  : "bg-amber-100 hover:bg-amber-205 text-amber-850"
                              }`}
                              title="Isolar esta coluna de nomes de material para marcar e arrastar com o mouse"
                            >
                              {isolatedColumnId === "names" ? "Foco 🎯" : "Marcar 🎯"}
                            </button>
                          </div>
                        </div>
                      </th>
                      
                      {/* Dynamic Measurement Columns */}
                      {reportMeasurements.map((m) => {
                        const mappedCap = getCapacityForDate(m.date);
                        const isSelfIsolated = isolatedColumnId === m.id;
                        return (
                          <th 
                            key={m.id} 
                            className={`${cellPaddingClass} text-center border-l border-slate-200 relative group transition-all duration-300 ${
                              isolatedColumnId && !isSelfIsolated 
                                ? "select-none opacity-15 pointer-events-none" 
                                : isSelfIsolated 
                                  ? "bg-amber-50/45 border-x-2 border-amber-400 font-extrabold scale-[1.01] shadow-xs" 
                                  : "bg-pink-50/20"
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="block text-[#ff2a6d] font-black text-[11.5px]">{m.date}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteConfirmMeasurement({ id: m.id, date: m.date });
                                }}
                                className="text-[12px] hover:scale-130 transition-transform duration-100 cursor-pointer ml-1 text-slate-500 hover:text-red-650 animate-bounce print:hidden"
                                title="Excluir esta data inteira"
                              >
                                ❌
                              </button>
                            </div>
                            <span className="block text-[11px] font-bold text-slate-500 lowercase mt-0.5">Cap: {mappedCap} colab</span>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 mt-1.5 px-0.5 print:hidden">
                              <button
                                type="button"
                                onClick={() => copyMeasurementVertical(m)}
                                className={`inline-flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider tracking-tight shadow-5xs transition-all active:scale-95 cursor-pointer leading-none w-full sm:w-auto ${
                                  copiedColumnId === m.id 
                                    ? "bg-emerald-500 text-white" 
                                    : "bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900"
                                }`}
                                title="Copiar quantidades desta coluna em formato vertical"
                              >
                                {copiedColumnId === m.id ? "Copiado" : "Copiar"}
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => toggleIsolateColumn(m.id)}
                                className={`inline-flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider tracking-tight shadow-5xs transition-all active:scale-95 cursor-pointer leading-none w-full sm:w-auto ${
                                  isSelfIsolated
                                    ? "bg-amber-600 text-white font-black animate-pulse"
                                    : "bg-amber-100 hover:bg-amber-205 text-amber-800"
                                }`}
                                title="Isolar esta coluna para selecionar arrastando com o mouse na vertical"
                              >
                                {isSelfIsolated ? "Foco 🎯" : "Marcar 🎯"}
                              </button>
                            </div>
                          </th>
                        );
                      })}

                      {/* Interactive Draft Column Header */}
                      {draftMeasurement && (
                        <th className={`${cellPaddingClass} text-center border-l-2 border-dashed border-[#ff2a6d] bg-rose-50/20 min-w-[150px] transition-all`}>
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5 bg-white border border-[#ff2a6d] rounded-lg px-2 py-1 shadow-3xs">
                              <Calendar className="h-3 w-3 text-[#ff2a6d] shrink-0 animate-pulse" />
                              <input
                                type="text"
                                value={draftMeasurement.date}
                                onChange={(e) => setDraftMeasurement(prev => prev ? { ...prev, date: e.target.value } : null)}
                                placeholder="DD/MM/YYYY"
                                className="w-20 text-[11px] font-black text-slate-800 border-0 p-0 focus:ring-0 focus:outline-hidden"
                              />
                            </div>
                            <span className="block text-[11px] font-bold text-slate-500 mt-0.5 lowercase">Cap: {getCapacityForDate(draftMeasurement.date)} colab</span>
                            <div className="flex items-center justify-center gap-1.5 mt-1.5 print:hidden">
                              <button
                                type="button"
                                onClick={handleSaveDraftMeasurement}
                                className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded px-2 py-0.5 text-[11px] font-black uppercase tracking-wider shadow-5xs transition-all active:scale-95 cursor-pointer leading-none"
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={() => setDraftMeasurement(null)}
                                className="inline-flex items-center gap-1 bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 rounded px-2 py-0.5 text-[11px] font-black uppercase tracking-wider shadow-5xs transition-all active:scale-95 cursor-pointer leading-none"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </th>
                      )}

                      {/* NEW COLUMN: Projeção (only if stockSubView !== "relatorio" and we have at least 2 measurements) */}
                      {stockSubView === "tabela" && reportMeasurements.length >= 2 && (
                        <th className={`${cellPaddingClass} text-center border-l border-indigo-150 min-w-[125px] w-[125px] transition-all duration-300 ${
                          isolatedColumnId && isolatedColumnId !== "projection" 
                            ? "select-none opacity-15 pointer-events-none" 
                            : isolatedColumnId === "projection" 
                              ? "bg-amber-50/45 border-x-2 border-amber-400 font-extrabold scale-[1.01] shadow-xs" 
                              : "bg-indigo-50/20"
                        }`}>
                          <span className="block text-[#ff2a6d] font-black text-[11.5px]">{nextScheduledInfo.dateStr}</span>
                          <span className="block text-[11px] font-bold text-slate-500 mt-0.5">Projeção</span>
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 mt-1.5 px-0.5 print:hidden">
                            <button
                              type="button"
                              onClick={() => copyProjectionVertical()}
                              className={`inline-flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider tracking-tight shadow-5xs transition-all active:scale-95 cursor-pointer leading-none w-full sm:w-auto ${
                                copiedColumnId === "projection" 
                                  ? "bg-emerald-500 text-white" 
                                  : "bg-indigo-100 hover:bg-indigo-200 text-indigo-700 hover:text-indigo-900"
                              }`}
                              title="Copiar quantidades projetadas em formato vertical"
                            >
                              {copiedColumnId === "projection" ? "Copiado" : "Copiar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleIsolateColumn("projection")}
                              className={`inline-flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider tracking-tight shadow-5xs transition-all active:scale-95 cursor-pointer leading-none w-full sm:w-auto ${
                                isolatedColumnId === "projection"
                                  ? "bg-amber-600 text-white font-black animate-pulse"
                                  : "bg-amber-100 hover:bg-amber-205 text-amber-800"
                              }`}
                              title="Isolar coluna de projeção para marcar e arrastar com o mouse na vertical"
                            >
                              {isolatedColumnId === "projection" ? "Foco 🎯" : "Marcar 🎯"}
                            </button>
                          </div>
                        </th>
                      )}
                      {reportMeasurements.length >= 2 && (
                        <th className={`${cellPaddingClass} text-center bg-[#111c2e] text-white border-l border-slate-300 min-w-[120px] w-[120px] transition-all duration-300 ${
                          isolatedColumnId && isolatedColumnId !== "saldo" 
                            ? "select-none opacity-15 pointer-events-none" 
                            : isolatedColumnId === "saldo"
                              ? "bg-amber-800 border-x-2 border-amber-400 font-extrabold"
                              : ""
                        }`}>
                          <span className="block text-[11px] font-black tracking-wider uppercase">Saldo</span>
                          <span className="block text-[11px] font-extrabold text-slate-500 mt-0.5">Último - Penúltimo</span>
                          <div className="flex justify-center mt-1.5 print:hidden">
                            <button
                              type="button"
                              onClick={() => toggleIsolateColumn("saldo")}
                              className={`inline-flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider tracking-tight shadow-5xs transition-all active:scale-95 cursor-pointer leading-none ${
                                isolatedColumnId === "saldo"
                                  ? "bg-amber-650 text-white font-black animate-pulse"
                                  : "bg-amber-100 hover:bg-amber-205 text-amber-850"
                              }`}
                              title="Isolar a coluna de saldo para marcar e arrastar com o mouse na vertical"
                            >
                              {isolatedColumnId === "saldo" ? "Foco 🎯" : "Marcar 🎯"}
                            </button>
                          </div>
                        </th>
                      )}
                      {reportMeasurements.length >= 2 && (
                        <th className={`${cellPaddingClass} text-center bg-[#111c2e] text-white border-l border-slate-300 min-w-[145px] w-[145px] transition-all duration-300 ${
                          isolatedColumnId && isolatedColumnId !== "consumoPerCapita" 
                            ? "select-none opacity-15 pointer-events-none" 
                            : isolatedColumnId === "consumoPerCapita"
                              ? "bg-amber-805 border-x-2 border-amber-400 font-extrabold"
                              : ""
                        }`}>
                          <span className="block text-[11px] font-black tracking-wider uppercase text-slate-400">P/ Capita</span>
                          <span className="block text-[11px] font-extrabold text-[#ff2a6d] mt-0.5">Consumo Per Capita</span>
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 mt-1.5 px-0.5 print:hidden">
                            <button
                              type="button"
                              onClick={() => copyConsumoPerCapitaVertical()}
                              className={`inline-flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider tracking-tight shadow-5xs transition-all active:scale-95 cursor-pointer leading-none w-full sm:w-auto ${
                                copiedColumnId === "consumoPerCapita" 
                                  ? "bg-emerald-500 text-white shadow-5xs" 
                                  : "bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900"
                              }`}
                              title="Copiar consumo per capita em formato vertical"
                            >
                              {copiedColumnId === "consumoPerCapita" ? "Copiado" : "Copiar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleIsolateColumn("consumoPerCapita")}
                              className={`inline-flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider tracking-tight shadow-5xs transition-all active:scale-95 cursor-pointer leading-none w-full sm:w-auto ${
                                isolatedColumnId === "consumoPerCapita"
                                  ? "bg-amber-600 text-white font-black animate-pulse"
                                  : "bg-amber-100 hover:bg-amber-205 text-amber-800"
                              }`}
                              title="Isolar a coluna de consumo per capita para marcar e arrastar com o mouse"
                            >
                              {isolatedColumnId === "consumoPerCapita" ? "Foco 🎯" : "Marcar 🎯"}
                            </button>
                          </div>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {items.map((it) => {
                      const mPenultimate = reportMeasurements[reportMeasurements.length - 2];
                      const mLast = reportMeasurements[reportMeasurements.length - 1];
     
                      const valPenultimate = mPenultimate ? getItemBalanceVal(mPenultimate, it) : 0;
                      const valLast = mLast ? getItemBalanceVal(mLast, it) : 0;
                      
                      const needsCalculation = valLast < valPenultimate;
                      const finalValue = needsCalculation ? valPenultimate - valLast : valLast;
                      
                      const consumed = valPenultimate > valLast ? (valPenultimate - valLast) : 0;
                      const projectedQty = Math.max(0, valLast - consumed);
                      const crit = checkCriticalStockState(it);
     
                      return (
                        <tr key={it.id} className="hover:bg-slate-55/40 transition-colors leading-normal group">
                          <td className={`${cellPaddingClass} ${nameTextClass} font-bold text-slate-900 transition-all duration-300 ${
                            isolatedColumnId && isolatedColumnId !== "names" 
                              ? "select-none opacity-15 pointer-events-none" 
                              : isolatedColumnId === "names"
                                ? "bg-amber-100/40 border-x-2 border-amber-350 font-black text-amber-955 scale-[1.012] shadow-xs cursor-ns-resize select-all hover:bg-amber-150/60"
                                : ""
                          }`}>
                            <div className="flex items-center justify-between gap-1.5 select-text">
                              <span className="truncate group-hover:text-[#ff2a6d] transition-colors" title={it.name}>
                                {it.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedItemStatsPopup(it)}
                                  className="inline-flex items-center justify-center h-4.5 w-4.5 rounded bg-pink-50 hover:bg-[#ff2a6d] hover:text-white text-[#ff2a6d] border border-pink-100/50 font-extrabold text-[11px] shadow-3xs cursor-pointer active:scale-90 transition-all select-none print:hidden shrink-0"
                                  title="Visualizar histórico completo de estatísticas"
                                >
                                  📈
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setItemCrudError("");
                                    setEditingItem({ id: it.id, name: it.name });
                                    setEditingItemName(it.name);
                                    setShowEditItemModal(true);
                                  }}
                                  className="inline-flex items-center justify-center h-4.5 w-4.5 rounded bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-100/50 font-extrabold text-[11px] shadow-3xs cursor-pointer active:scale-90 transition-all select-none print:hidden shrink-0"
                                  title="Editar nome deste material"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteConfirmItem({ id: it.id, name: it.name });
                                  }}
                                  className="inline-flex items-center justify-center h-4.5 w-4.5 rounded bg-red-50 hover:bg-red-600 hover:text-white text-red-600 border border-red-100/50 font-extrabold text-[11px] shadow-3xs cursor-pointer active:scale-90 transition-all select-none print:hidden shrink-0"
                                  title="Excluir este material"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Display measurements balances */}
                          {reportMeasurements.map((m) => {
                            const bal = getItemBalanceVal(m, it);
                            const bgCell = "bg-slate-50/20 border-l border-slate-150";
                            const isColumnIsolated = isolatedColumnId === m.id;
                            const isAnyIsolated = isolatedColumnId !== null;
  
                            return (
                              <td 
                                key={m.id} 
                                className={`${cellPaddingClass} ${numTextClass} text-center font-mono font-bold transition-all duration-300 ${
                                  isAnyIsolated && !isColumnIsolated 
                                    ? "select-none opacity-15 pointer-events-none" 
                                    : isColumnIsolated 
                                      ? "bg-amber-100/40 border-x-2 border-amber-300 font-extrabold text-amber-955 text-[15px] scale-[1.015] shadow-xs cursor-ns-resize select-all hover:bg-amber-150/60" 
                                      : "text-slate-850 " + bgCell
                                  }`}
                              >
                                <div className="flex flex-col items-center justify-center select-text">
                                  <span className={isColumnIsolated ? "font-black" : ""}>
                                    {bal}
                                  </span>
                                </div>
                              </td>
                            );
                          })}

                          {/* Interactive Draft Column Cell */}
                          {draftMeasurement && (
                            <td className={`${cellPaddingClass} text-center font-mono font-bold bg-rose-50/5 border-l-2 border-dashed border-[#ff2a6d]/30 min-w-[150px]`}>
                              <div className="flex items-center justify-center">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={draftMeasurement.balances[it.id] !== undefined ? draftMeasurement.balances[it.id] : ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                                    setDraftMeasurement(prev => prev ? {
                                      ...prev,
                                      balances: { ...prev.balances, [it.id]: val }
                                    } : null);
                                  }}
                                  onPaste={(e) => {
                                    const pastedText = e.clipboardData.getData("text");
                                    if (pastedText && pastedText.includes("\n")) {
                                      e.preventDefault();
                                      handleDraftPasteBulk(it.id, pastedText);
                                    }
                                  }}
                                  className="w-20 text-center text-xs font-bold font-mono bg-white border border-slate-200 hover:border-pink-300 focus:border-[#ff2a6d] focus:ring-1 focus:ring-[#ff2a6d] rounded px-1 py-0.5"
                                />
                              </div>
                            </td>
                          )}

                          {/* NEW COLUMN: Projeção cell value (only if stockSubView !== "relatorio" and we have at least 2 measurements) */}
                          {stockSubView === "tabela" && reportMeasurements.length >= 2 && (() => {
                            const isColumnIsolated = Math.max(0, 0) === 0 && isolatedColumnId === "projection";
                            const isAnyIsolated = isolatedColumnId !== null;
                            return (
                              <td className={`${cellPaddingClass} ${numTextClass} text-center font-mono font-bold transition-all duration-300 ${
                                isAnyIsolated && !isColumnIsolated 
                                  ? "select-none opacity-15 pointer-events-none" 
                                  : isColumnIsolated 
                                    ? "bg-amber-100/40 border-x-2 border-amber-300 font-extrabold text-[15px] scale-[1.015] shadow-xs cursor-ns-resize select-all hover:bg-amber-150/50" 
                                    : "bg-indigo-50/5 border-l border-indigo-150"
                              }`}>
                                <div className="flex flex-col items-center justify-center p-0.5 select-text">
                                  <div className={`inline-flex flex-col items-center justify-center px-2.5 py-1.5 rounded-[12px] shadow-3xs min-w-[65px] ${
                                    isColumnIsolated 
                                      ? "bg-amber-100 border border-amber-350" 
                                      : "bg-indigo-50/30 border border-indigo-100"
                                  }`}>
                                    <span className={`text-[13px] font-extrabold font-mono ${isColumnIsolated ? "text-amber-955 text-sm font-black" : "text-indigo-800"}`}>
                                      {projectedQty}
                                    </span>
                                    <span className={`text-[11px]/tight font-bold mt-0.5 uppercase tracking-tighter ${isColumnIsolated ? "text-amber-600 font-black" : "text-indigo-400"}`}>
                                      {consumed > 0 ? `-${consumed} uso` : "estável"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            );
                          })()}

                          {/* Consumption difference (Último-Penúltimo) */}
                          {reportMeasurements.length >= 2 && (() => {
                            const isColumnIsolated = isolatedColumnId === "saldo";
                            const isAnyIsolated = isolatedColumnId !== null;
                            return (
                              <td className={`${cellPaddingClass} ${numTextClass} text-center font-mono font-black transition-all duration-300 ${
                                isAnyIsolated && !isColumnIsolated 
                                  ? "select-none opacity-15 pointer-events-none" 
                                  : isColumnIsolated 
                                    ? "bg-amber-100/40 border-x-2 border-amber-300 text-[15px] scale-[1.015] cursor-ns-resize select-all hover:bg-amber-150/50" 
                                    : "border-l border-slate-200 bg-slate-100"
                              }`}>
                                {mPenultimate ? (
                                  <div className="flex flex-col items-center justify-center p-1 select-text">
                                    {needsCalculation ? (
                                      <div className={`inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-[12px] shadow-sm min-w-[55px] animate-fade-in ${
                                        isColumnIsolated 
                                          ? "bg-amber-100 border border-amber-350" 
                                          : "bg-slate-250 border border-slate-350"
                                      }`}>
                                        <span className={`text-[13.5px] font-extrabold font-mono ${isColumnIsolated ? "text-amber-955 font-black" : "text-slate-850"}`}>
                                          {finalValue}
                                        </span>
                                        {mLast && (
                                          <span className="text-[11px]/tight font-bold text-slate-500 tracking-tighter mt-0.5">
                                            ({(finalValue / getCapacityForDate(mLast.date)).toFixed(3)} per/cap)
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className={`inline-flex items-center justify-center px-3 py-1 rounded-[12px] min-w-[55px] ${
                                        isColumnIsolated 
                                          ? "bg-amber-200 border border-amber-400" 
                                          : "bg-emerald-50 border border-emerald-200"
                                      }`}>
                                        <span className={`text-[12px] font-black font-mono ${isColumnIsolated ? "text-amber-955 font-black" : "text-emerald-700"}`}>
                                          {finalValue}
                                        </span>
                                      </div>
                                    )}
                                    {crit.isCritical && (
                                      <span 
                                        className="text-[11px] font-black text-white bg-[#ff2a6d] px-1.5 py-0.5 rounded mt-1 shadow-2xs text-center block max-w-[100px] break-words uppercase animate-pulse leading-none shrink-0"
                                        title={crit.explanation}
                                      >
                                        ⚠️ CRÍTICO
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center select-text">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">-</span>
                                    {crit.isCritical && (
                                      <span 
                                        className="text-[11px] font-black text-white bg-[#ff2a6d] px-1.5 py-0.5 rounded mt-1 shadow-2xs text-center block max-w-[100px] break-words uppercase animate-pulse leading-none shrink-0"
                                        title={crit.explanation}
                                      >
                                        ⚠️ CRÍTICO
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })()}

                          {/* NEW COLUMN: Consumo Per Capita cell value */}
                          {reportMeasurements.length >= 2 && (() => {
                            const isColumnIsolated = isolatedColumnId === "consumoPerCapita";
                            const isAnyIsolated = isolatedColumnId !== null;
                            
                            // History of the item's balances
                            const history = reportMeasurements.map(meas => ({
                              date: meas.date,
                              qty: getItemBalanceVal(meas, it)
                            }));
                            
                            const { value, status } = calculateConsumoPerCapita(history, capacityRows);
                            const isConsumo = status === "consumo";
                            const isMantido = status === "mantido";
                            
                            const textVal = value === null ? "—" : value.toFixed(5);
                            
                            const badgeBg = isConsumo ? "bg-rose-50 text-[#ff2a6d] border-rose-100" 
                                            : isMantido ? "bg-amber-50 text-[#C16200] border-amber-100/80"
                                            : "bg-slate-50 text-slate-450 border-slate-100";
                                            
                            const badgeText = isConsumo ? "Consumo"
                                              : isMantido ? "Mantido"
                                              : "Sem hist.";

                            return (
                              <td className={`${cellPaddingClass} ${numTextClass} text-center font-mono font-bold transition-all duration-300 ${
                                isAnyIsolated && !isColumnIsolated 
                                  ? "select-none opacity-15 pointer-events-none" 
                                  : isColumnIsolated 
                                    ? "bg-amber-100/40 border-x-2 border-amber-305 text-[15px] scale-[1.015] cursor-ns-resize select-all hover:bg-amber-150/50" 
                                    : "border-l border-slate-200 bg-slate-50/40"
                              }`}>
                                <div className="flex flex-col items-center justify-center p-1 select-text">
                                  <div className={`inline-flex flex-col items-center justify-center px-1.5 py-1.5 rounded-[12px] shadow-3xs min-w-[70px] ${
                                    isColumnIsolated 
                                      ? "bg-amber-100 border border-amber-350" 
                                      : "bg-white border border-slate-200/80"
                                  }`}>
                                    <span className={`text-[12px] font-black font-mono leading-none ${isColumnIsolated ? "text-amber-955 text-sm font-black" : "text-slate-850"}`}>
                                      {textVal}
                                    </span>
                                    <span className={`mt-1.5 px-1 py-0.2 rounded-sm border uppercase text-[11px]/none font-black ${badgeBg}`}>
                                      {badgeText}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            );
                          })()}
     
                        </tr>
                      );
                    })}

     
                  </tbody>
                </table>
              </div>
            );
          })()
        )}

        {/* Footnote of printable table showing capacity mapping */}
        <div className="mt-5 border-t border-slate-200 pt-3 flex flex-wrap gap-4 items-center justify-between text-[11px] font-bold text-slate-450 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Info className="h-3 w-3 text-slate-500 shrink-0" />
            <span>* Saldo calculado considerando penúltima medição menos a atual. Os destaques em cinza sinalizam a diferença de consumo/perda de saldo, e verde sinaliza refil/entrada de saldo.</span>
          </div>
          <div>
            facilities bp-compras • divisão de planejamento
          </div>
        </div>

      </div>

      {/* ==================================== MODAL ESTATÍSTICA DEDICADA DE CONSUMO (POPUP) ==================================== */}
      {selectedItemStatsPopup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-fade-in leading-normal">
          <div className="modal-scroll-area-parent bg-slate-100 rounded-[24px] border border-slate-205 shadow-md max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden p-6 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-50 shrink-0 mb-4 bg-white -m-6 p-6 rounded-t-[24px]">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📈</span>
                <div>
                  <h2 className="text-sm font-black uppercase text-[#111c2e] tracking-wide leading-none">
                    Estatísticas Dedicadas de Consumo
                  </h2>
                  <p className="text-[11px] text-slate-500 font-bold mt-1.5">
                    Histórico detalhado p/ o item: <strong className="text-[#ff2a6d] font-black">{selectedItemStatsPopup.name}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItemStatsPopup(null)}
                className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-250 active:scale-95 transition-all cursor-pointer font-bold text-xs"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Scrollable grid contents */}
            <div className="flex-1 overflow-y-auto pr-1 py-4 mt-6">
              {sortedMeasurements.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-150 rounded-xl bg-white">
                  <span className="text-2xl">🗳️</span>
                  <p className="text-xs font-black text-slate-600 mt-1 uppercase">Ainda não há medições gravadas</p>
                  <p className="text-[11px] text-slate-500 font-bold leading-normal mt-0.5">
                    Lançe pelo menos duas medições para gerar estatísticas.
                  </p>
                </div>
              ) : (
                <>
                  {/* Overall Per Capita Summary Box matching the table's "P/ Capita" column precisely */}
                  {(() => {
                    const overallHistory = reportMeasurements.map(meas => ({
                      date: meas.date,
                      qty: getItemBalanceVal(meas, selectedItemStatsPopup)
                    }));
                    const { value, status } = calculateConsumoPerCapita(overallHistory, capacityRows);
                    const textVal = value === null ? "—" : value.toFixed(5);
                    const isConsumo = status === "consumo";
                    const isMantido = status === "mantido";
                    const badgeBg = isConsumo ? "bg-rose-100 text-[#ff2a6d] border-rose-250 animate-pulse" 
                                    : isMantido ? "bg-amber-100 text-[#C16200] border-amber-250"
                                    : "bg-slate-100 text-slate-500 border-slate-250";
                    const badgeText = isConsumo ? "Consumo Ativo" : isMantido ? "Mantido / Estável" : "Sem Histórico";

                    return (
                      <div className="bg-white border-2 border-[#ff2a6d]/40 rounded-2xl p-4.5 mb-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:border-[#ff2a6d]/60">
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                            Consumo Per Capita Geral da Tabela (Mapeado)
                          </span>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-[#111c2e] tracking-tight font-mono">
                              {textVal}
                            </span>
                            <span className="text-xs font-black text-slate-500 font-mono uppercase">unidades / colaborador</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-bold mt-2 leading-relaxed">
                            Esta é a métrica padrão calculada a partir das últimas {reportMeasurements.length} medições de estoque em sincronização com o quadro de colaboradores cadastrados para os meses correspondentes.
                          </p>
                        </div>
                        <div className="flex flex-col items-center sm:items-end gap-1.5 shrink-0 bg-slate-50/80 p-3 rounded-xl border border-slate-150 min-w-[150px]">
                          <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Status Geral</span>
                          <span className={`inline-block text-[11px] font-black px-3.5 py-1.5 rounded-full border text-center uppercase tracking-wider leading-none shadow-3xs ${badgeBg}`}>
                            {badgeText}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedMeasurements.map((m, idx) => {
                    const valCurr = getItemBalanceVal(m, selectedItemStatsPopup);
                    const historyUpTo = sortedMeasurements.slice(0, idx + 1).map(meas => ({
                      date: meas.date,
                      qty: getItemBalanceVal(meas, selectedItemStatsPopup)
                    }));
                    
                    const { value, status } = calculateConsumoPerCapita(historyUpTo, capacityRows);
                    
                    const isFirst = idx === 0;
                    const prevM = isFirst ? null : sortedMeasurements[idx - 1];
                    const valPrev = prevM ? getItemBalanceVal(prevM, selectedItemStatsPopup) : 0;
                    const delta = isFirst ? 0 : (valPrev - valCurr);
                    const cap = getCapacityForDateNullable(m.date, capacityRows);
                    
                    const isConsumo = status === "consumo";
                    const isMantido = status === "mantido";
                    
                    const textVal = value === null ? "—" : value.toFixed(5);
                    const badgeBg = isConsumo ? "bg-rose-50 text-[#ff2a6d] border-rose-100" 
                                    : isMantido ? "bg-amber-50 text-[#C16200] border-amber-100/80"
                                    : "bg-slate-50 text-slate-450 border-slate-205";
                                    
                    const badgeText = isConsumo ? "Consumo"
                                      : isMantido ? "Mantido"
                                      : "Sem hist.";
                    
                    return (
                      <div 
                        key={m.id}
                        className="bg-white border rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-xs shadow-3xs"
                      >
                        {/* Card Header resembling standard measurement cards */}
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2 w-2 rounded-full bg-[#ff2a6d] shrink-0" />
                            <span className="text-[12px] font-black text-[#111c2e] font-mono truncate">
                              {idx + 1}ª Medição ({m.date})
                            </span>
                          </div>
                          <span className="text-[11px]/none font-bold uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-150">
                            Cap: {cap || "—"} colab
                          </span>
                        </div>

                        {/* Dense mini stats grid */}
                        <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50/50 rounded-xl p-3 border border-slate-150 mb-1">
                          <div>
                            <span className="text-slate-500 font-bold uppercase tracking-tight block text-[11px]">Qtd física em Estoque</span>
                            <span className="text-slate-900 font-black text-[13px] mt-1 block font-mono">
                              {valCurr} un
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold uppercase tracking-tight block text-[11px]">Proporção p/ Colaborador</span>
                            <span className="text-indigo-700 font-black text-[13px] mt-1 block font-mono">
                              {cap && cap > 0 ? (valCurr / cap).toFixed(5) : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold uppercase tracking-tight block text-[11px]">Fluxo / Comportamento</span>
                            {isFirst ? (
                              <span className="text-slate-500 font-bold block mt-1 text-[11px] uppercase">Inicial (—)</span>
                            ) : delta > 0 ? (
                              <span className="text-[#ff2a6d] font-black text-[11px] mt-1 block uppercase">
                                -{delta} un (Consumo)
                              </span>
                            ) : delta < 0 ? (
                              <span className="text-emerald-600 font-black text-[11px] mt-1 block uppercase">
                                +{Math.abs(delta)} un (Reposição)
                              </span>
                            ) : (
                              <span className="text-slate-500 font-black text-[11px] mt-1 block uppercase">
                                0 un (Estável)
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold uppercase tracking-tight block text-[11px]">Consumo Per Capita</span>
                            <div className="mt-1 flex flex-col gap-0.5">
                              <span className="text-[#111c2e] font-black text-[13px] font-mono leading-none">
                                {textVal}
                              </span>
                              <span className={`inline-block text-[11px] font-black px-1.5 py-0.5 rounded border text-center uppercase leading-none self-start mt-1.5 ${badgeBg}`}>
                                {badgeText}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </div>

            {/* Footer buttons */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedItemStatsPopup(null)}
                className="bg-[#111c2e] hover:bg-slate-800 text-white px-6 py-2.5 text-[11px] font-black uppercase rounded-full cursor-pointer transition-all active:scale-95 shadow-md hover:shadow-lg"
              >
                Fechar Painel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================== MODAL CONFIRMAÇÃO DE EXCLUSÃO DE MEDIÇÃO ==================================== */}
      {deleteConfirmMeasurement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-fade-in leading-normal">
          <div className="bg-white rounded-[24px] border border-slate-150 shadow-md max-w-md w-full flex flex-col p-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-50 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <h2 className="text-xs md:text-[13px] font-black uppercase text-red-600 tracking-wide">
                  Confirmar Exclusão
                </h2>
              </div>
              <button 
                onClick={() => setDeleteConfirmMeasurement(null)}
                className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-250 active:scale-90 transition-all cursor-pointer font-bold text-xs"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-xs md:text-[13px] text-slate-705 font-bold leading-relaxed">
                Tem certeza de que deseja excluir permanentemente a medição do dia <strong className="text-slate-900 underline font-extrabold">{deleteConfirmMeasurement.date}</strong> e todos os saldos físicos correspondentes?
              </p>
              <div className="text-[11px] text-rose-650 font-black uppercase mt-4 tracking-tight bg-rose-50 border border-rose-100/80 rounded-xl p-3 leading-snug">
                ⚠️ Atenção: essa ação removerá a data de todas as visualizações e grade comparativa, de forma irreversível.
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmMeasurement(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-black uppercase transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteMeasurement(deleteConfirmMeasurement.id, deleteConfirmMeasurement.date);
                  setDeleteConfirmMeasurement(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#ff2a6d] hover:bg-[#E01E4F] text-white text-[11px] font-black uppercase transition-all shadow-md active:scale-95 cursor-pointer animate-pulse"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================== MODAL REGISTRAR MEDIÇÃO FÍSICA ==================================== */}
      {showCountModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-fade-in leading-normal">
          <div className="modal-scroll-area-parent bg-white rounded-[24px] border border-slate-100 shadow-md max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden p-6 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-50 shrink-0 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗳️</span>
                <h2 className="text-sm font-black uppercase text-slate-800 tracking-wide">
                  {editingMeasurementId ? "Editar Medição Existente" : "Registrar Saldos da Medição"}
                </h2>
              </div>
              <button 
                onClick={() => setShowCountModal(false)}
                className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-250 active:scale-90 transition-all cursor-pointer font-bold text-xs"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Inputs controls details */}
            <div className="grid grid-cols-2 gap-4 shrink-0 mb-4 bg-slate-50 border border-slate-150 p-3.5 rounded-xl">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                  Data da Contagem (DD/MM/YYYY):
                </label>
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#ff2a6d]/20">
                  <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Tab") {
                        e.preventDefault();
                        const parent = e.currentTarget.closest(".modal-scroll-area-parent");
                        if (parent) {
                          const firstInput = parent.querySelector("input[type='number']") as HTMLInputElement | null;
                          if (firstInput) {
                            firstInput.focus();
                            firstInput.select();
                          }
                        }
                      }
                    }}
                    placeholder="Ex. 19/06/2026"
                    className="w-full text-xs font-black text-slate-800 border-0 p-0 focus:ring-0 focus:outline-hidden"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                  Capacity do Mês Equivalente:
                </label>
                <div className="p-2 bg-white rounded-lg border border-slate-150 text-[11px] font-black font-mono text-[#c21e54]">
                  🏢 {getCapacityForDate(modalDate)} colaboradores
                </div>
              </div>
            </div>

            {/* Scrollable list items physical input */}
            <div className="modal-scroll-area flex-1 overflow-y-auto pr-1 space-y-4 max-h-[50vh] divide-y divide-slate-100 mb-5">
              
              {modalItems.length === 0 ? (
                <div className="p-1">
                  <div 
                    tabIndex={0}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData("text");
                      if (!text) return;

                      const lines = text.split(/\r?\n/);
                      const parsedList: { name: string; quantity: number }[] = [];

                      lines.forEach((line) => {
                        const parsed = parseRawLine(line);
                        if (parsed && parsed.name.trim()) {
                          parsedList.push({
                            name: parsed.name.trim(),
                            quantity: parsed.quantity
                          });
                        }
                      });

                      if (parsedList.length > 0) {
                        const newModalItems: StockItem[] = parsedList.map((p, idx) => ({
                          id: `st-temp-${idx}-${Date.now()}`,
                          name: p.name,
                          category: activeCategory.name
                        })).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }));
                        setModalItems(newModalItems);

                        const initialBalances: Record<string, number> = {};
                        newModalItems.forEach((it) => {
                          const matchedParsed = parsedList.find(p => p.name.toLowerCase().trim() === it.name.toLowerCase().trim());
                          initialBalances[it.id] = matchedParsed ? matchedParsed.quantity : 0;
                        });
                        setModalBalances(initialBalances);
                      }
                    }}
                    className="p-8 text-center rounded-2xl border-2 border-dashed border-[#ff2a6d]/30 bg-[#f5f5f5] hover:border-[#ff2a6d]/40 hover:bg-[#f5f5f5]/10 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px] focus:outline-hidden focus:ring-2 focus:ring-[#ff2a6d]/20"
                    title="Clique aqui e cole (Ctrl+V) sua lista de itens e quantidades"
                  >
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#ff2a6d] mx-auto animate-pulse">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[#ff2a6d] font-black text-xs uppercase tracking-tight">Planilha de Medições Vazia</p>
                        <p className="text-slate-800 text-[11px] font-bold mt-1.5 leading-normal normal-case">
                          Cole (Ctrl+V) uma lista de materiais com quantidades aqui mesmo!
                        </p>
                        <p className="text-slate-500 text-[11px] font-semibold leading-normal mt-1 normal-case">
                          Por exemplo, copie duas colunas do Excel (Item e Quantidade) e cole aqui.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center mt-5">
                    <span className="text-slate-450 text-[11px] font-bold block mb-2">Ou se preferir:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setModalItems(items);
                        const initial: Record<string, number> = {};
                        items.forEach(it => {
                          initial[it.id] = lastMeasurement ? getItemBalanceVal(lastMeasurement, it) : 0;
                        });
                        setModalBalances(initial);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                    >
                      Carregar Itens Padrão de {activeCategory.name}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-2.5 px-1 mt-2">
                    <h4 className="text-[11px] font-black uppercase text-[#ff2a6d] tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff2a6d]" />
                      {activeCategory.name} ({modalItems.length} itens)
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setModalItems([]);
                        setModalBalances({});
                      }}
                      className="text-[11px] font-black uppercase text-rose-500 hover:text-rose-650 tracking-wider transition-all"
                    >
                      Limpar Planilha
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1">
                    {modalItems.map((item) => (
                      <div key={item.id} className="bg-slate-55/70 border border-slate-150 rounded-lg p-2.5 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-black text-slate-800 truncate" title={item.name}>
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 shrink-0 max-w-[90px]">
                          <input
                            type="number"
                            min="0"
                            value={modalBalances[item.id] !== undefined ? modalBalances[item.id] : ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                              setModalBalances(prev => ({ ...prev, [item.id]: val }));
                            }}
                            onPaste={(e) => {
                              const pastedText = e.clipboardData.getData("text");
                              if (pastedText && pastedText.includes("\n")) {
                                e.preventDefault();
                                handleModalPasteBulk(item.id, pastedText);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Tab") {
                                e.preventDefault();
                                const container = e.currentTarget.closest(".modal-scroll-area");
                                if (container) {
                                  const inputs = Array.from(container.querySelectorAll("input[type='number']")) as HTMLInputElement[];
                                  const idx = inputs.indexOf(e.currentTarget);
                                  if (idx !== -1 && idx < inputs.length - 1) {
                                    inputs[idx + 1].focus();
                                    inputs[idx + 1].select();
                                    inputs[idx + 1].scrollIntoView({ block: "center", behavior: "smooth" });
                                  } else {
                                    const saveBtn = document.getElementById("btn-save-measurement");
                                    if (saveBtn) saveBtn.focus();
                                  }
                                }
                              }
                            }}
                            className="w-full text-center border-0 p-0 text-xs font-black text-[#ff2a6d] outline-hidden focus:ring-0 leading-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Error notifications */}
            {modalError && (
              <div className="bg-red-50 text-red-650 p-2.5 rounded-lg border border-red-200 text-xs font-black shrink-0 mb-3 uppercase flex items-center gap-1.5 animate-pulse">
                <span>⚠️</span>
                <span>{modalError}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 shrink-0 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCountModal(false)}
                className="bg-slate-100 hover:bg-slate-250 px-5 py-2.5 text-[11px] font-black uppercase rounded-full cursor-pointer transition-all text-slate-650"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-save-measurement"
                onClick={handleSaveMeasurement}
                className="bg-[#2a2f3b] hover:bg-slate-800 text-white px-6 py-2.5 text-[11px] font-black uppercase rounded-full cursor-pointer transition-all active:scale-95 shadow-md hover:shadow-lg"
              >
                Salvar Medição
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================== MODAL ADICIONAR NOVO MATERIAL ==================================== */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-fade-in leading-normal">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-md max-w-md w-full flex flex-col p-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-50 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📦</span>
                <h2 className="text-sm font-black uppercase text-slate-850 tracking-wide">
                  Adicionar Novo Material
                </h2>
              </div>
              <button 
                onClick={() => setShowAddItemModal(false)}
                className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-250 active:scale-90 transition-all cursor-pointer font-bold text-xs"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Form Content */}
            <div className="space-y-4 mb-6">
              <div>
                <span className="text-[11px] font-black uppercase text-indigo-500 tracking-wider block">Categoria de Destino</span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200/85 px-2.5 py-1.5 rounded-lg block mt-1 uppercase">
                  {activeCategory.name}
                </span>
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                  Nome do Material:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem();
                    }
                  }}
                  placeholder="Ex: Pano de microfibra vermelho"
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:border-slate-350 focus:border-indigo-500 rounded-xl p-2.5 shadow-3xs focus:outline-hidden"
                />
              </div>
            </div>

            {/* Error notifications */}
            {itemCrudError && (
              <div className="bg-rose-50 text-rose-650 p-2.5 rounded-lg border border-rose-200 text-xs font-black shrink-0 mb-4 uppercase flex items-center gap-1.5 animate-pulse">
                <span>⚠️</span>
                <span>{itemCrudError}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 shrink-0 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="bg-slate-100 hover:bg-slate-250 px-5 py-2.5 text-[11px] font-black uppercase rounded-full cursor-pointer transition-all text-slate-650"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddItem}
                className="bg-[#2a2f3b] hover:bg-slate-800 text-white px-6 py-2.5 text-[11px] font-black uppercase rounded-full cursor-pointer transition-all active:scale-95 shadow-md hover:shadow-lg"
              >
                Adicionar Material
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================== MODAL EDITAR MATERIAL ==================================== */}
      {showEditItemModal && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-fade-in leading-normal">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-md max-w-md w-full flex flex-col p-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-50 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                <h2 className="text-sm font-black uppercase text-slate-850 tracking-wide">
                  Editar Nome do Material
                </h2>
              </div>
              <button 
                onClick={() => setShowEditItemModal(false)}
                className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-250 active:scale-90 transition-all cursor-pointer font-bold text-xs"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Form Content */}
            <div className="space-y-4 mb-6">
              <div>
                <span className="text-[11px] font-black uppercase text-indigo-500 tracking-wider block">Nome Atual</span>
                <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-150 px-2.5 py-1.5 rounded-lg block mt-1 line-through opacity-70">
                  {editingItem.name}
                </span>
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                  Novo Nome do Material:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={editingItemName}
                  onChange={(e) => setEditingItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleEditItem();
                    }
                  }}
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:border-slate-350 focus:border-indigo-500 rounded-xl p-2.5 shadow-3xs focus:outline-hidden"
                />
              </div>
            </div>

            {/* Error notifications */}
            {itemCrudError && (
              <div className="bg-rose-50 text-rose-650 p-2.5 rounded-lg border border-rose-200 text-xs font-black shrink-0 mb-4 uppercase flex items-center gap-1.5 animate-pulse">
                <span>⚠️</span>
                <span>{itemCrudError}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 shrink-0 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditItemModal(false)}
                className="bg-slate-100 hover:bg-slate-250 px-5 py-2.5 text-[11px] font-black uppercase rounded-full cursor-pointer transition-all text-slate-650"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEditItem}
                className="bg-[#2a2f3b] hover:bg-slate-800 text-white px-6 py-2.5 text-[11px] font-black uppercase rounded-full cursor-pointer transition-all active:scale-95 shadow-md hover:shadow-lg"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================== MODAL CONFIRMAÇÃO DE EXCLUSÃO DE MATERIAL ==================================== */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-fade-in leading-normal">
          <div className="bg-white rounded-[24px] border border-slate-150 shadow-md max-w-md w-full flex flex-col p-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-50 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <h2 className="text-xs md:text-[13px] font-black uppercase text-red-600 tracking-wide">
                  Excluir Material do Estoque
                </h2>
              </div>
              <button 
                onClick={() => setDeleteConfirmItem(null)}
                className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-250 active:scale-90 transition-all cursor-pointer font-bold text-xs"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-xs md:text-[13px] text-slate-705 font-bold leading-relaxed">
                Tem certeza de que deseja excluir permanentemente o material <strong className="text-slate-900 font-extrabold">"{deleteConfirmItem.name}"</strong>?
              </p>
              <div className="text-[11px] text-rose-650 font-black uppercase mt-4 tracking-tight bg-rose-50 border border-rose-100/80 rounded-xl p-3 leading-snug">
                ⚠️ Atenção: isso removerá o material desta lista de controle e excluirá seus saldos de todas as contagens anteriores. Essa ação é irreversível.
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-black uppercase transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteItem(deleteConfirmItem.name)}
                className="px-4 py-2 rounded-xl bg-[#ff2a6d] hover:bg-[#E01E4F] text-white text-[11px] font-black uppercase transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================== MODAL SELEÇÃO DE CATEGORIA PARA NOVA CONTAGEM ==================================== */}
      {showCategorySelectorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-fade-in leading-normal text-slate-800">
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-md max-w-md w-full flex flex-col p-6 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-50 shrink-0 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <h2 className="text-sm font-black uppercase text-slate-800 tracking-wide">
                  Nova Contagem - Seleção de Categoria
                </h2>
              </div>
              <button 
                onClick={() => setShowCategorySelectorModal(false)}
                className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-250 active:scale-90 transition-all cursor-pointer font-bold text-xs"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Category Select */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1.5">
                  Selecione a categoria para registrar o estoque:
                </label>
                <select
                  value={selectedCountCategoryId}
                  onChange={(e) => setSelectedCountCategoryId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#ff2a6d]/30 transition-all cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Automatic check of existing control */}
              {(() => {
                const targetCategory = categories.find(c => c.id === selectedCountCategoryId) || categories[0];
                if (!targetCategory) return null;

                const targetItems = targetCategory.items.map((name, idx) => ({
                  id: `st-${targetCategory.id}-${idx}`,
                  name,
                  category: targetCategory.name
                }));

                const targetCategoryMeasurements = measurements.filter(m => {
                  return targetItems.some(it => m.balances[it.id] !== undefined || m.balances[it.name] !== undefined);
                });

                const exists = targetCategoryMeasurements.length > 0;

                return (
                  <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                    exists 
                      ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" 
                      : "bg-[#f5f5f5] border-[#ff2a6d]/10 text-[#111c2e]"
                  }`}>
                    {exists ? (
                      <div className="flex gap-2">
                        <span className="text-sm shrink-0">✅</span>
                        <div>
                          <strong className="block font-black text-[11px] uppercase tracking-wide text-emerald-900">
                            Controle de estoque existente encontrado!
                          </strong>
                          <span className="font-bold text-[11px] text-emerald-700 mt-1 block">
                            Já existem {targetCategoryMeasurements.length} medições gravadas para a categoria <strong className="font-extrabold">{targetCategory.name}</strong>. Os dados anteriores e saldos serão carregados automaticamente.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <span className="text-sm shrink-0">✨</span>
                        <div>
                          <strong className="block font-black text-[11px] uppercase tracking-wide text-[#111c2e]">
                            Primeiro registro de contagem!
                          </strong>
                          <span className="font-bold text-[11px] text-[#111c2e] mt-1 block">
                            Nenhum controle de estoque anterior encontrado para <strong className="font-extrabold">{targetCategory.name}</strong>. A planilha de medição iniciará vazia, permitindo colar itens e quantidades diretamente.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCategorySelectorModal(false)}
                className="bg-slate-100 hover:bg-slate-250 px-5 py-2.5 text-[11px] font-black uppercase rounded-full cursor-pointer transition-all text-slate-650"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  // Set skipAutoOpen to true so when we trigger selectedCategoryId update,
                  // it doesn't open the count modal a second time.
                  skipAutoOpen.current = true;
                  setSelectedCategoryId(selectedCountCategoryId);
                  setShowCategorySelectorModal(false);

                  // Trigger opening count modal or inline draft column for this category
                  setTimeout(() => {
                    const targetCategory = categories.find(c => c.id === selectedCountCategoryId) || categories[0];
                    const targetItems = targetCategory.items.map((name, idx) => ({
                      id: `st-${targetCategory.id}-${idx}`,
                      name,
                      category: targetCategory.name
                    }));

                    const targetCategoryMeasurements = measurements.filter(m => {
                      return targetItems.some(it => m.balances[it.id] !== undefined || m.balances[it.name] !== undefined);
                    });

                    const hasNoMeasurementsForCategory = targetCategoryMeasurements.length === 0;

                    // Open standard count modal or inline draft
                    setModalError("");
                    setEditingMeasurementId(null);
                    
                    const today = new Date();
                    const dd = String(today.getDate()).padStart(2, '0');
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const yyyy = today.getFullYear();
                    const dateStr = `${dd}/${mm}/${yyyy}`;
                    setModalDate(dateStr);

                    if (targetItems.length > 0 && !hasNoMeasurementsForCategory) {
                      // REQUIREMENT 2: Open inline draft column directly instead of modal!
                      setDraftMeasurement({
                        date: dateStr,
                        balances: {}
                      });
                      showToast(`Nova coluna de contagem aberta para ${targetCategory.name.toUpperCase()}!`);
                    } else if (targetItems.length > 0) {
                      // REQUIREMENT 1: Already has registered items, skip registration phase and load them directly
                      setModalItems(targetItems);
                      const initial: Record<string, number> = {};
                      // find last measurement for this category
                      const targetSorted = [...measurements].filter(m => {
                        return targetItems.some(it => m.balances[it.id] !== undefined || m.balances[it.name] !== undefined);
                      }).sort((a, b) => {
                        const [da, ma, ya] = a.date.split("/").map(Number);
                        const [db, mb, yb] = b.date.split("/").map(Number);
                        return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
                      });
                      const targetLast = targetSorted[targetSorted.length - 1];

                      targetItems.forEach(it => {
                        initial[it.id] = targetLast ? getItemBalanceVal(targetLast, it) : 0;
                      });
                      setModalBalances(initial);
                      setShowCountModal(true);
                    } else {
                      // No items registered yet: show paste/empty item registration stage
                      setModalItems([]);
                      setModalBalances({});
                      setShowCountModal(true);
                    }
                  }, 100);
                }}
                className="bg-[#2a2f3b] hover:bg-slate-800 text-white px-6 py-2.5 text-[11px] font-black uppercase rounded-full cursor-pointer transition-all active:scale-95 shadow-md"
              >
                Avançar para Contagem
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-sm mr-2 animate-fade-in print:hidden">
          <div className="bg-[#1A1E29] text-white border-l-4 border-amber-450 p-4 rounded-xl shadow-md flex items-start gap-3 border border-slate-700/30">
            <div className="bg-amber-500/10 p-1.5 rounded-lg text-amber-400 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase text-amber-450 tracking-wider">Aviso do Sistema</p>
              <p className="text-[12.5px] font-bold mt-0.5 leading-normal text-slate-100">{toastMessage}</p>
            </div>
            <button 
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-500 hover:text-white font-black text-sm select-none ml-1 shrink-0 px-2 py-0.5 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
