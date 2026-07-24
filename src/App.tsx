import React, { useState, useEffect, useMemo } from "react";
import ExcelJS from "exceljs";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import Table from "./components/Table";
import SummaryPanel from "./components/SummaryPanel";
import CapacityPanel from "./components/CapacityPanel";
import LoginScreen from "./components/LoginScreen";
import LimpezaHistoryDashboard, { LimpezaHistoryEntry } from "./components/LimpezaHistoryDashboard";
import AiConsultantDrawer from "./components/AiConsultantDrawer";
import StockControl from "./components/StockControl";
import MeiContractModal from "./components/MeiContractModal";
import NormativaView from "./components/NormativaView";
import TermsResponsibilityModal from "./components/TermsResponsibilityModal";
import IntelligentReadingModal from "./components/IntelligentReadingModal";
import AprendizContractModal from "./components/AprendizContractModal";
import ReceiptModal from "./components/ReceiptModal";
import FileArchiveModal from "./components/FileArchiveModal";
import DocsView from "./components/DocsView";
import RondaView from "./components/RondaView";
import GithubTroubleshooterModal from "./components/GithubTroubleshooterModal";
import { INITIAL_STATE, INITIAL_CAPACITY, INITIAL_SAVED_COMPARISON, DEFAULT_CATEGORIES } from "./data";
import { EmojiButton } from "./components/EmojiButton";
import { calculateComparison, getPosteriorMonthLabel, getPreviousMonths } from "./utils";
import { Supplier, QuoteItem, CapacityRow, SavedComparison, SavedItemInfo, ArchivedQuote, Category } from "./types";
import { HelpCircle, RefreshCw, AlertCircle, ShoppingCart, Info, Check, ExternalLink, Printer, X, ChevronDown, Database, CloudLightning, CheckCircle, WifiOff, Calendar, RotateCcw, Sparkles, Save, LogOut, Menu, Sun, Moon, Eye, FileSpreadsheet, Plus, Building2, Settings, BookOpen, FileText, Search } from "lucide-react";
import { migrateCategories } from "./categoryMigration";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useSupabaseSync } from "./hooks/useSupabaseSync";
import { useToast } from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";

export default function App() {
  // AI Drawer state
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { showToast } = useToast();

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", variant: "warning", onConfirm: () => {} });

  // Load initial states from localStorage with default fallbacks
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("clean_quotes_username") || "";
  });

  const [userCpf, setUserCpf] = useState<string>(() => {
    return localStorage.getItem("clean_quotes_user_cpf") || "";
  });

  const [quoteDate, setQuoteDate] = useState<string>(() => {
    const saved = localStorage.getItem("clean_quotes_date");
    return saved !== null ? saved : INITIAL_STATE.quoteDate;
  });


  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem("clean_quotes_suppliers");
    return saved ? JSON.parse(saved) : INITIAL_STATE.suppliers;
  });

  const [items, setItems] = useState<QuoteItem[]>(() => {
    const wiped = localStorage.getItem("clean_quotes_wiped_v5");
    if (!wiped) {
      localStorage.removeItem("clean_quotes_items");
      localStorage.removeItem("clean_quotes_categories");
      localStorage.setItem("clean_quotes_wiped_v5", "true");
      return INITIAL_STATE.items;
    }
    const saved = localStorage.getItem("clean_quotes_items");
    return saved ? JSON.parse(saved) : INITIAL_STATE.items;
  });

  // Capacity planning state
  const [capacityRows, setCapacityRows] = useState<CapacityRow[]>(() => {
    const saved = localStorage.getItem("clean_quotes_capacity");
    return saved ? JSON.parse(saved) : INITIAL_CAPACITY;
  });

  // Saved archived quotes list - with proper unique IDs (COT-001, COT-002, etc.)
  const [archivedQuotes, setArchivedQuotes] = useState<ArchivedQuote[]>(() => {
    const saved = localStorage.getItem("clean_quotes_archived");
    return saved ? JSON.parse(saved) : [];
  });

  // Selected Quote ID to compare with (reference baseline)
  const [selectedCompareQuoteId, setSelectedCompareQuoteId] = useState<string>(() => {
    return localStorage.getItem("clean_quotes_selected_compare_id") || "";
  });

  // Active loaded quote ID from archives being edited (null if starting a new quotation)
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(() => {
    return localStorage.getItem("clean_quotes_editing_quote_id") || null;
  });

  // Dynamic category lists and the active category
  const [categories, setCategories] = useState<Category[]>(() => {
    const wiped = localStorage.getItem("clean_quotes_wiped_v6");
    if (!wiped) {
      localStorage.removeItem("clean_quotes_items");
      localStorage.removeItem("clean_quotes_categories");
      localStorage.setItem("clean_quotes_wiped_v6", "true");
      return DEFAULT_CATEGORIES;
    }
    const saved = localStorage.getItem("clean_quotes_categories");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return migrateCategories(parsed);
        }
      } catch (e) {
        // ignored
      }
    }
    return migrateCategories(DEFAULT_CATEGORIES);
  });

  const [activeCategoryId, setActiveCategoryId] = useState<string>(() => {
    const saved = localStorage.getItem("clean_quotes_active_category_id");
    if (!saved || saved === "limpeza" || saved === "funcionamento" || saved === "copa_escritorio" || saved === "escritorio_papelaria") {
      return DEFAULT_CATEGORIES[0]?.id || "";
    }
    return saved;
  });

  const [visualTheme, setVisualTheme] = useState<"light" | "comfort" | "ultradark">(() => {
    return (localStorage.getItem("clean_quotes_visual_theme") as any) || "light";
  });

  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<"cotacao" | "estoque" | "normativa" | "docs" | "ronda">("cotacao");
  const [isModalForNewQuote, setIsModalForNewQuote] = useState<boolean>(false);
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [importQuoteId, setImportQuoteId] = useState<string>("");

  const [chamadoNumber, setChamadoNumber] = useState<string>(() => {
    return localStorage.getItem("clean_quotes_chamado_number") || "00000000";
  });

  const [quoteTitle, setQuoteTitle] = useState<string>(() => {
    return localStorage.getItem("clean_quotes_title") || "";
  });

  const [modalChamadoNumber, setModalChamadoNumber] = useState<string>("");
  const [modalQuoteTitle, setModalQuoteTitle] = useState<string>("");

  useEffect(() => {
    localStorage.setItem("clean_quotes_chamado_number", chamadoNumber);
  }, [chamadoNumber]);

  useEffect(() => {
    localStorage.setItem("clean_quotes_title", quoteTitle);
  }, [quoteTitle]);

  const [lastChangeLog, setLastChangeLog] = useState<{
    action: string;
    user: string;
    timestamp: string;
  } | null>(() => {
    const saved = localStorage.getItem("clean_quotes_last_changelog");
    return saved ? JSON.parse(saved) : null;
  });

  const [showLimpezaExtraPrompt, setShowLimpezaExtraPrompt] = useState<boolean>(false);
  const [isMeiModalOpen, setIsMeiModalOpen] = useState<boolean>(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [isAprendizModalOpen, setIsAprendizModalOpen] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [isFileArchiveOpen, setIsFileArchiveOpen] = useState<boolean>(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState<boolean>(false);
  const [isDocsMenuOpen, setIsDocsMenuOpen] = useState<boolean>(true);
  const [isIntelligentReadingOpen, setIsIntelligentReadingOpen] = useState<boolean>(false);
  const [promptedCategoryId, setPromptedCategoryId] = useState<string | null>(null);

  // Switch to Extra category and log it
  const handleSwitchToLimpezaExtra = () => {
    setActiveCategoryId("material_limpeza_extra");
    setShowLimpezaExtraPrompt(false);
    registerChangeLog("Alterada categoria de cotação para 'MATERIAL DE LIMPEZA EXTRA' devido a volume reduzido");
  };

  const registerChangeLog = (actionDescription: string) => {
    const first = userName ? userName.trim().split(" ")[0] : "Operador";
    const now = new Date();
    const formattedTime = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(now);
    
    const payload = {
      action: actionDescription,
      user: first,
      timestamp: formattedTime
    };
    setLastChangeLog(payload);
    localStorage.setItem("clean_quotes_last_changelog", JSON.stringify(payload));
  };

  useEffect(() => {
    localStorage.setItem("clean_quotes_categories", JSON.stringify(categories));
  }, [categories]);

  // Keep category items always sorted alphabetically
  useEffect(() => {
    let needsSorting = false;
    const sortedCategories = categories.map((cat) => {
      let isCatSorted = true;
      for (let i = 0; i < cat.items.length - 1; i++) {
        if (cat.items[i].localeCompare(cat.items[i + 1], undefined, { sensitivity: "base", numeric: true }) > 0) {
          isCatSorted = false;
          break;
        }
      }
      if (!isCatSorted) {
        needsSorting = true;
        return {
          ...cat,
          items: [...cat.items].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })
          ),
        };
      }
      return cat;
    });

    if (needsSorting) {
      setCategories(sortedCategories);
    }
  }, [categories]);

  useEffect(() => {
    localStorage.setItem("clean_quotes_active_category_id", activeCategoryId);
  }, [activeCategoryId]);

  // Informative/feedback states
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Sync state modifications to localStorage
  useEffect(() => {
    localStorage.setItem("clean_quotes_username", userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem("clean_quotes_user_cpf", userCpf);
  }, [userCpf]);

  useEffect(() => {
    localStorage.setItem("clean_quotes_date", quoteDate);
  }, [quoteDate]);

  useEffect(() => {
    localStorage.setItem("clean_quotes_suppliers", JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem("clean_quotes_items", JSON.stringify(items));
  }, [items]);

  // Keep quotation items organized: first items with quantity > 0 (alphabetically), then items with quantity = 0 (alphabetically)
  useEffect(() => {
    const compareItems = (a: any, b: any) => {
      const qtyA = a.quantity || 0;
      const qtyB = b.quantity || 0;
      const hasQtyA = qtyA > 0;
      const hasQtyB = qtyB > 0;

      if (hasQtyA && !hasQtyB) return -1;
      if (!hasQtyA && hasQtyB) return 1;

      const aName = a.name || "";
      const bName = b.name || "";
      return aName.localeCompare(bName, undefined, { sensitivity: "base", numeric: true });
    };

    let isSorted = true;
    for (let i = 0; i < items.length - 1; i++) {
      if (compareItems(items[i], items[i + 1]) > 0) {
        isSorted = false;
        break;
      }
    }
    if (!isSorted) {
      setItems((prev) => {
        const sorted = [...prev].sort(compareItems);
        return sorted;
      });
    }
  }, [items]);

  useEffect(() => {
    localStorage.setItem("clean_quotes_capacity", JSON.stringify(capacityRows));
  }, [capacityRows]);

  useEffect(() => {
    localStorage.setItem("clean_quotes_archived", JSON.stringify(archivedQuotes));
  }, [archivedQuotes]);

  useEffect(() => {
    localStorage.setItem("clean_quotes_selected_compare_id", selectedCompareQuoteId);
  }, [selectedCompareQuoteId]);

  useEffect(() => {
    localStorage.setItem("clean_quotes_visual_theme", visualTheme);
  }, [visualTheme]);

  useEffect(() => {
    if (editingQuoteId) {
      localStorage.setItem("clean_quotes_editing_quote_id", editingQuoteId);
    } else {
      localStorage.removeItem("clean_quotes_editing_quote_id");
    }
  }, [editingQuoteId]);

  // Supabase sync hook — handles bidirectional sync of quotes and categories
  const { syncStatus } = useSupabaseSync(
    archivedQuotes,
    setArchivedQuotes,
    categories,
    setCategories
  );

  // Find the exact archived quote that we are comparing against (or take the newest if none selected)
  const currentCompareQuoteInfo = useMemo(() => {
    if (selectedCompareQuoteId) {
      const found = archivedQuotes.find((q) => q.id === selectedCompareQuoteId);
      if (found) return found;
    }
    if (archivedQuotes.length > 0) {
      // Default to the most recently saved quote
      return archivedQuotes[archivedQuotes.length - 1];
    }
    return null;
  }, [archivedQuotes, selectedCompareQuoteId]);

  // Compute the active category object
  const activeCategoryObj = useMemo(() => {
    return categories.find((c) => c.id === activeCategoryId) || categories[0] || { name: "Geral", items: [] };
  }, [categories, activeCategoryId]);

  // Dynamically map currentCompareQuoteInfo to the SavedComparison type with proper indicators
  const savedComparison = useMemo<SavedComparison>(() => {
    if (!currentCompareQuoteInfo) {
      return {
        isValid: false,
        savedDate: "",
        monthLabel: "",
        totals: {
          mixedTotal: 0,
          totalQuantity: 0,
        },
        itemsDetailed: {},
      };
    }

    const itemMap: Record<string, SavedItemInfo> = {};
    currentCompareQuoteInfo.items.forEach((item) => {
      itemMap[item.id] = {
        name: item.name || "Item sem nome",
        quantity: item.quantity,
        prices: { ...item.prices },
      };
    });

    return {
      isValid: true,
      savedDate: `${currentCompareQuoteInfo.id} (${currentCompareQuoteInfo.savedAt})`,
      monthLabel: currentCompareQuoteInfo.quoteDate,
      totals: {
        mixedTotal: currentCompareQuoteInfo.summary.mixedTotal,
        totalQuantity: currentCompareQuoteInfo.items.reduce((acc, x) => acc + x.quantity, 0),
      },
      itemsDetailed: itemMap,
    };
  }, [currentCompareQuoteInfo]);

  // Recalculate whole comparison summary in real-time
  const summary = useMemo(() => {
    return calculateComparison(suppliers, items);
  }, [suppliers, items]);

  // Trimestral history compilation for "MATERIAL DE LIMPEZA"
  const limpezaHistory = useMemo<LimpezaHistoryEntry[]>(() => {
    const list = archivedQuotes.filter(
      (q) => q.categoryId === "material_limpeza" || (q.categoryName?.toUpperCase().includes("LIMPEZA") && !q.categoryName?.toUpperCase().includes("EXTRA"))
    );
    
    const activePosteriorMonth = getPosteriorMonthLabel(quoteDate);
    const prevMonths = getPreviousMonths(activePosteriorMonth, 2);
    const threeMonths = [...prevMonths, activePosteriorMonth];

    const monthDataMap: Record<string, LimpezaHistoryEntry> = {};

    // Base seeded defaults
    const defaultSeeds: Record<string, Partial<LimpezaHistoryEntry>> = {
      "abr/26": {
        total: 3278.51,
        bestSupplier: "ELO DISTRIB",
        itemsCount: 14,
        savings: 540.20,
      },
      "mai/26": {
        total: 3176.85,
        bestSupplier: "MUNDIAL",
        itemsCount: 15,
        savings: 420.50,
      },
      "jun/26": {
        total: 3390.58,
        bestSupplier: "MAXLIMP",
        itemsCount: 20,
        savings: 612.30,
      },
      "jul/26": {
        total: 3450.00,
        bestSupplier: "MAXLIMP",
        itemsCount: 12,
        savings: 612.30,
      },
    };

    // Populate with defaults
    Object.keys(defaultSeeds).forEach(m => {
      const capRow = capacityRows.find(r => r.month === m);
      monthDataMap[m] = {
        month: m,
        total: defaultSeeds[m].total!,
        bestSupplier: defaultSeeds[m].bestSupplier!,
        itemsCount: defaultSeeds[m].itemsCount!,
        savings: defaultSeeds[m].savings!,
        capacity: capRow ? capRow.capacity : (m === "abr/26" ? 534 : m === "mai/26" ? 514 : m === "jun/26" ? 538 : 545)
      };
    });

    // Populate with historical archived quotes
    list.forEach(q => {
      const qTargetMonth = getPosteriorMonthLabel(q.quoteDate);
      const bestSuppName = q.summary.bestSupplierId ? (q.suppliers.find(s => s.id === q.summary.bestSupplierId)?.name || "Outro") : "N/A";
      const qItemsCount = q.items.filter(it => it.quantity > 0).length;
      const capacityForQuote = q.capacityRows?.find((r: any) => r.month === qTargetMonth)?.capacity || capacityRows.find(r => r.month === qTargetMonth)?.capacity || 538;
      
      monthDataMap[qTargetMonth] = {
        month: qTargetMonth,
        total: q.summary.mixedTotal,
        bestSupplier: bestSuppName,
        itemsCount: qItemsCount,
        savings: q.summary.savingsVersusWorst,
        capacity: capacityForQuote
      };
    });

    // Overwrite the active target month with current real-time quote info
    const activeItemsCount = items.filter(it => it.quantity > 0).length;
    const activeBestSupp = summary.bestSupplierId ? (suppliers.find(s => s.id === summary.bestSupplierId)?.name || "MAXLIMP") : "MAXLIMP";
    const activeCapacityVal = capacityRows.find(r => r.month === activePosteriorMonth)?.capacity || 545;

    monthDataMap[activePosteriorMonth] = {
      month: activePosteriorMonth,
      total: summary.mixedTotal,
      bestSupplier: activeBestSupp,
      itemsCount: activeItemsCount,
      savings: summary.savingsVersusWorst,
      capacity: activeCapacityVal
    };

    // Return exactly the 3 target months
    return threeMonths.map(m => {
      if (monthDataMap[m]) {
        return monthDataMap[m];
      }
      const capRow = capacityRows.find(r => r.month === m);
      return {
        month: m,
        total: 0,
        bestSupplier: "N/A",
        itemsCount: 0,
        savings: 0,
        capacity: capRow ? capRow.capacity : 0
      };
    });
  }, [archivedQuotes, items, summary, suppliers, capacityRows, quoteDate]);

  // Effect to verify and trigger the modal if they select "material_limpeza" and have < 8 items
  useEffect(() => {
    if (activeCategoryId === "material_limpeza") {
      const qtyCount = items.filter((it) => it.quantity > 0).length;
      if (qtyCount < 8 && promptedCategoryId !== "material_limpeza") {
        setShowLimpezaExtraPrompt(true);
        setPromptedCategoryId("material_limpeza");
      }
    } else {
      setPromptedCategoryId(null);
      setShowLimpezaExtraPrompt(false);
    }
  }, [activeCategoryId, items, promptedCategoryId]);

  // Sincronização em tempo real de qualquer edição na cotação ativa resgatada do histórico
  useEffect(() => {
    if (editingQuoteId) {
      setArchivedQuotes((prev) =>
        prev.map((q) => {
          if (q.id === editingQuoteId) {
            return {
              ...q,
              title: quoteTitle,
              suppliers: JSON.parse(JSON.stringify(suppliers)),
              items: JSON.parse(JSON.stringify(items)),
              capacityRows: JSON.parse(JSON.stringify(capacityRows)),
              summary: JSON.parse(JSON.stringify(summary)),
              quoteDate: quoteDate,
              userName: userName,
              userCpf: userCpf,
              categoryId: activeCategoryId,
              categoryName: activeCategoryObj.name,
              chamadoNumber: chamadoNumber,
            };
          }
          return q;
        })
      );
    }
  }, [suppliers, items, capacityRows, summary, quoteDate, editingQuoteId, userName, userCpf, activeCategoryId, activeCategoryObj.name, quoteTitle, chamadoNumber]);

  const handleRestoreBackup = (data: {
    archivedQuotes?: ArchivedQuote[];
    categories?: Category[];
    suppliers?: Supplier[];
    items?: QuoteItem[];
    capacityRows?: CapacityRow[];
  }) => {
    if (data.archivedQuotes) setArchivedQuotes(data.archivedQuotes);
    if (data.categories) setCategories(data.categories);
    if (data.suppliers) setSuppliers(data.suppliers);
    if (data.items) setItems(data.items);
    if (data.capacityRows) setCapacityRows(data.capacityRows);
    registerChangeLog("Restauração de backup do banco de dados executada");
  };

  // Handle supplier name update
  const handleUpdateSupplierName = (id: string, name: string) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: name.toUpperCase() } : s))
    );
    registerChangeLog(`Alteração de nome de fornecedor para "${name.toUpperCase()}"`);
  };

  // Handle comprehensive supplier details updates (name, phone, vendedor)
  const handleUpdateSupplierDetails = (id: string, details: { name: string; phone?: string; vendedor?: string }) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: details.name.toUpperCase(), phone: details.phone, vendedor: details.vendedor } : s))
    );
    registerChangeLog(`Atualização cadastral do fornecedor "${details.name.toUpperCase()}"`);
  };

  // Add new supplier
  const handleAddSupplier = () => {
    const nextIdx = suppliers.length + 1;
    const newId = `s_${Date.now()}`;
    const newSupplier: Supplier = {
      id: newId,
      name: `FORNECEDOR ${nextIdx}`,
    };

    setSuppliers((prev) => [...prev, newSupplier]);
    // Initialize item price fields for the new supplier
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        prices: {
          ...item.prices,
          [newId]: null,
        },
      }))
    );
    registerChangeLog("Inclusão de fornecedor");
  };

  // Remove existing supplier
  const handleRemoveSupplier = (id: string) => {
    if (suppliers.length <= 1) return;
    const supplier = suppliers.find((s) => s.id === id);
    const supplierName = supplier?.name ? `"${supplier.name}"` : "Fornecedor";
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    setItems((prev) =>
      prev.map((item) => {
        const updatedPrices = { ...item.prices };
        delete updatedPrices[id];
        return {
          ...item,
          prices: updatedPrices,
        };
      })
    );
    registerChangeLog(`Exclusão do fornecedor ${supplierName}`);
  };

  // Dynamic incorporation of a newly inputted item name into the selected category's autocomplete recommendations
  const incorporateItemToCategory = (name: string, categoryId: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          const alreadyExists = cat.items.some(
            (itemStr) => itemStr.toLowerCase().trim() === cleanName.toLowerCase()
          );
          if (!alreadyExists) {
            return {
              ...cat,
              items: [...cat.items, cleanName],
            };
          }
        }
        return cat;
      })
    );
  };

  // Update item details
  const handleUpdateItemObservation = (id: string, observation: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, observation } : item))
    );
    const itemToUpdate = items.find((it) => it.id === id);
    const itemName = itemToUpdate?.name ? `"${itemToUpdate.name}"` : "Item";
    if (observation.trim()) {
      registerChangeLog(`Alterada observação de ${itemName}: "${observation}"`);
    } else {
      registerChangeLog(`Removida observação de ${itemName}`);
    }
  };

  const handleUpdateItemName = (id: string, name: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name } : item))
    );
    if (name.trim()) {
      incorporateItemToCategory(name, activeCategoryId);
    }
    registerChangeLog(`Alteração do nome do item para "${name}"`);
  };

  const handleUpdateItemQty = (id: string, qty: number) => {
    const itemToUpdate = items.find((it) => it.id === id);
    const itemName = itemToUpdate?.name ? `"${itemToUpdate.name}"` : "Item";
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(0, qty) } : item))
    );
    registerChangeLog(`Alteração da quantidade de ${itemName} para ${qty}`);
  };

  const handleToggleItemComprado = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const alreadyComprado = !!item.comprado;
          return {
            ...item,
            comprado: !alreadyComprado,
          };
        }
        return item;
      })
    );
    const item = items.find((it) => it.id === id);
    const itemName = item?.name ? `"${item.name}"` : "Item";
    registerChangeLog(`Alterado status comprado para ${itemName}`);
  };

  const handleMarkItemsAsBought = (matchedItemIds: string[]) => {
    setItems((prev) =>
      prev.map((item) => {
        if (matchedItemIds.includes(item.id)) {
          return {
            ...item,
            comprado: true,
          };
        }
        return item;
      })
    );
    registerChangeLog(`Marcados ${matchedItemIds.length} itens como comprado via Leitura Inteligente`);
  };

  const handleUpdateItemStock = (id: string, field: "currentStock" | "minStock", value: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const currentStock = field === "currentStock" ? value : (item.currentStock || 0);
          const minStock = field === "minStock" ? value : (item.minStock || 0);
          const isIdeal = Math.max(0, minStock - currentStock);
          return {
            ...item,
            [field]: value,
            quantity: isIdeal,
          };
        }
        return item;
      })
    );
  };

  const handleBulkExportStock = (
    categoryId: string,
    stockData: Record<string, { minStock: number; currentStock: number }>
  ) => {
    setActiveCategoryId(categoryId);

    const initialPrices: Record<string, number | null> = {};
    suppliers.forEach((s) => {
      initialPrices[s.id] = null;
    });

    const formatted: QuoteItem[] = Object.entries(stockData).map(([name, data], idx) => {
      const minStock = data.minStock;
      const currentStock = data.currentStock;
      const quantity = Math.max(0, minStock - currentStock);

      incorporateItemToCategory(name, categoryId);

      return {
        id: `i_export_${Date.now()}_${idx}`,
        name: name,
        quantity: quantity,
        minStock: minStock,
        currentStock: currentStock,
        prices: { ...initialPrices }
      };
    });

    setItems(formatted);
    setActiveView("cotacao");

    const catObj = categories.find(c => c.id === categoryId);
    const catName = catObj ? catObj.name : "Geral";

    registerChangeLog(`Exportação de estoque da categoria "${catName}" para cotação`);
    setSuccessMessage(`Planilha de Cotação de "${catName}" configurada e aberta com sucesso!`);
    setTimeout(() => {
      setSuccessMessage("");
    }, 6000);
  };

  const handleUpdateMultipleQtys = (
    startRowIndex: number,
    text: string
  ) => {
    const lines = text.split(/\r?\n/).map(l => l.trim());
    if (lines.length <= 1 && lines[0] === "") return;

    setItems((prev) => {
      const updated = [...prev];
      let lineOffset = 0;
      for (let i = startRowIndex; i < updated.length && lineOffset < lines.length; i++) {
        const line = lines[lineOffset];
        let parsed = 0;
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
            parsed = Math.round(num);
          }
        }
        updated[i] = {
          ...updated[i],
          quantity: parsed,
        };
        lineOffset++;
      }
      return updated;
    });
    registerChangeLog("Importação rápida de quantidades em massa por colagem");
  };

  const handleUpdateMultipleStocks = (
    field: "currentStock" | "minStock",
    startRowIndex: number,
    text: string
  ) => {
    const lines = text.split(/\r?\n/).map(l => l.trim());
    if (lines.length <= 1 && lines[0] === "") return;

    setItems((prev) => {
      const updated = [...prev];
      let lineOffset = 0;
      for (let i = startRowIndex; i < updated.length && lineOffset < lines.length; i++) {
        const line = lines[lineOffset];
        let parsed = 0;
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
            parsed = Math.round(num);
          }
        }
        const item = updated[i];
        const currentStock = field === "currentStock" ? parsed : (item.currentStock || 0);
        const minStock = field === "minStock" ? parsed : (item.minStock || 0);
        const isIdeal = Math.max(0, minStock - currentStock);

        updated[i] = {
          ...item,
          [field]: parsed,
          quantity: isIdeal,
        };
        lineOffset++;
      }
      return updated;
    });
    const fieldLabel = field === "currentStock" ? "Estoque Atual" : "Mínimo Canal";
    registerChangeLog(`Importação rápida de ${fieldLabel} em massa por colagem`);
  };

  const handleUpdateItemPrice = (
    itemId: string,
    supplierId: string,
    price: number | null
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            prices: {
              ...item.prices,
              [supplierId]: price !== null ? Math.max(0, price) : null,
            },
          };
        }
        return item;
      })
    );
    registerChangeLog("Alteração de preço de fornecedor");
  };

  const handleToggleItemPreferredSupplier = (itemId: string, supplierId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const alreadyPreferred = item.preferredSupplierId === supplierId;
          return {
            ...item,
            preferredSupplierId: alreadyPreferred ? null : supplierId,
          };
        }
        return item;
      })
    );
    registerChangeLog("Alteração de fornecedor preferencial para o item");
  };

  const handleUpdateMultiplePrices = (
    supplierId: string,
    startRowIndex: number,
    text: string
  ) => {
    const lines = text.split(/\r?\n/).map(l => l.trim());
    if (lines.length <= 1) return;

    setItems((prev) => {
      const updated = [...prev];
      let lineOffset = 0;
      for (let i = startRowIndex; i < updated.length && lineOffset < lines.length; i++) {
        const line = lines[lineOffset];
        let parsed: number | null = null;
        if (line !== "") {
          let valStr = line.replace(/R\$/gi, "").trim();
          const match = valStr.match(/[-+]?[0-9.,]+/);
          if (match) {
            valStr = match[0];
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
              parsed = num;
            }
          }
        }

        updated[i] = {
          ...updated[i],
          prices: {
            ...updated[i].prices,
            [supplierId]: parsed,
          },
        };
        lineOffset++;
      }
      return updated;
    });

    const supplier = suppliers.find(s => s.id === supplierId);
    const supplierName = supplier ? supplier.name : "Fornecedor";
    registerChangeLog(`Importação rápida de preços em massa por colagem para ${supplierName}`);
  };

  // Add new item row (blank)
  const handleAddItem = () => {
    const newId = `i_${Date.now()}`;
    const initialPrices: Record<string, number | null> = {};
    suppliers.forEach((s) => {
      initialPrices[s.id] = null;
    });

    const newItem: QuoteItem = {
      id: newId,
      name: "",
      quantity: 1,
      prices: initialPrices,
    };

    setItems((prev) => [...prev, newItem]);
    registerChangeLog("Inclusão de linha em branco");
  };

  // Remove existing item row
  const handleRemoveItem = (id: string) => {
    const itemToRemove = items.find((it) => it.id === id);
    const itemName = itemToRemove?.name ? `"${itemToRemove.name}"` : "Item";
    setItems((prev) => prev.filter((item) => item.id !== id));
    registerChangeLog(`Exclusão de ${itemName}`);
  };

  // Import multiple items from FileImporter
  const handleImportItems = (importedList: { name: string; quantity: number }[], replaceCurrent: boolean) => {
    const formatted: QuoteItem[] = importedList.map((imp, index) => {
      const initialPrices: Record<string, number | null> = {};
      suppliers.forEach((s) => {
        initialPrices[s.id] = null;
      });
      if (imp.name.trim()) {
        incorporateItemToCategory(imp.name, activeCategoryId);
      }
      return {
        id: `i_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
        name: imp.name,
        quantity: imp.quantity,
        prices: initialPrices,
      };
    });

    if (replaceCurrent) {
      setItems(formatted);
      setSuccessMessage(`Planilha Atualizada! ${formatted.length} itens importados com sucesso.`);
    } else {
      setItems((prev) => [...prev, ...formatted]);
      setSuccessMessage(`Sucesso! ${formatted.length} itens adicionados à planilha atual.`);
    }
    registerChangeLog(`Importação de ${formatted.length} itens`);
    
    setTimeout(() => {
      setSuccessMessage("");
    }, 5000);
  };

  // Process imported proposal results in batch to merge suppliers and pricing beautifully
  const handleApplyImportProposal = (newSuppliers: Supplier[], newItems: QuoteItem[]) => {
    setSuppliers(newSuppliers);
    setItems(newItems);
    registerChangeLog("Importação Inteligente de Proposta via IA");
    setSuccessMessage("Proposta comercial importada e atualizada com sucesso via IA!");
    
    setTimeout(() => {
      setSuccessMessage("");
    }, 6000);
  };

  // Quick add single item via autocomplete bar
  const handleQuickAddItem = (name: string, qty: number) => {
    const newId = `i_${Date.now()}`;
    const initialPrices: Record<string, number | null> = {};
    suppliers.forEach((s) => {
      initialPrices[s.id] = null;
    });

    const newItem: QuoteItem = {
      id: newId,
      name,
      quantity: qty,
      prices: initialPrices,
    };

    if (name.trim()) {
      incorporateItemToCategory(name, activeCategoryId);
    }

    setItems((prev) => [...prev, newItem]);
    registerChangeLog(`Inclusão do item "${name}" (${qty} un)`);
    setSuccessMessage(`Item "${name}" contendo ${qty} unidade(s) adicionado.`);
    setTimeout(() => {
      setSuccessMessage("");
    }, 4000);
  };

  // Handler for capacity values
  const handleUpdateCapacity = (month: string, capacity: number) => {
    setCapacityRows((prev) =>
      prev.map((row) => (row.month === month ? { ...row, capacity } : row))
    );
    registerChangeLog(`Alteração de planejamento (${month})`);
  };

  const handleUpdateValue = (month: string, value: number) => {
    setCapacityRows((prev) =>
      prev.map((row) => (row.month === month ? { ...row, value } : row))
    );
    registerChangeLog(`Alteração de planejamento (${month})`);
  };

  // Save current item quantities and total to the archives list
  const handleSaveComparison = () => {
    // 1. If Category is Material de Limpeza, auto-save value inside capacityRows if not filled
    const isLimpeza = activeCategoryId === "material_limpeza" || (activeCategoryObj.name.toLowerCase().includes("limpeza") && !activeCategoryObj.name.toLowerCase().includes("extra") && !activeCategoryId.includes("extra"));

    let finalCapacityRows = JSON.parse(JSON.stringify(capacityRows));
    if (isLimpeza) {
      const targetMonth = getPosteriorMonthLabel(quoteDate);
      const matchIdx = finalCapacityRows.findIndex((r: any) => r.month.trim().toLowerCase() === targetMonth);
      if (matchIdx !== -1) {
        if (finalCapacityRows[matchIdx].value === 0) {
          finalCapacityRows[matchIdx].value = summary.mixedTotal;
          // Apply state change to capacityRows too
          setCapacityRows(finalCapacityRows);
        }
      }
    }

    const now = new Date();
    const formattedDateTime = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(now);

    const normTitle = (quoteTitle || "").trim().toLowerCase();
    const normChamado = (chamadoNumber || "").trim();

    // Check if an identical quote (same title, chamado, and items) already exists in archivedQuotes
    const duplicateQuote = archivedQuotes.find((q) => {
      const qTitle = (q.title || "").trim().toLowerCase();
      const qChamado = (q.chamadoNumber || "").trim();
      return qTitle === normTitle && qChamado === normChamado && areQuoteItemsEqual(q.items, items);
    });

    if (duplicateQuote) {
      // Overwrite/replace the duplicate quote! Keep its ID!
      const updatedArchive: ArchivedQuote = {
        id: duplicateQuote.id,
        title: quoteTitle,
        quoteDate: quoteDate,
        userName: userName,
        userCpf: userCpf,
        savedAt: formattedDateTime,
        suppliers: JSON.parse(JSON.stringify(suppliers)),
        items: JSON.parse(JSON.stringify(items)),
        capacityRows: finalCapacityRows,
        summary: JSON.parse(JSON.stringify(summary)),
        categoryId: activeCategoryId,
        categoryName: activeCategoryObj.name,
        chamadoNumber: chamadoNumber,
      };

      setArchivedQuotes((prev) => {
        // If we are editing a DIFFERENT quote, filter it out to prevent duplication of the identical information
        const filtered = editingQuoteId && editingQuoteId !== duplicateQuote.id
          ? prev.filter((q) => q.id !== editingQuoteId)
          : prev;
        return filtered.map((q) => (q.id === duplicateQuote.id ? updatedArchive : q));
      });

      setSelectedCompareQuoteId(duplicateQuote.id);
      setEditingQuoteId(duplicateQuote.id);

      setSuccessMessage(`Sucesso! O orçamento anterior foi substituído/sobreposto no registro [${duplicateQuote.id}] para evitar duplicados.`);
      setTimeout(() => {
        setSuccessMessage("");
      }, 6000);

      registerChangeLog(`Sobreposta cotação #${duplicateQuote.id} devido a duplicidade de Título, Chamado e Itens`);
      return;
    }

    if (editingQuoteId) {
      // MODE: EDIT EXISTING QUOTE - KEEP original ID!
      const updatedArchive: ArchivedQuote = {
        id: editingQuoteId,
        title: quoteTitle,
        quoteDate: quoteDate,
        userName: userName,
        userCpf: userCpf,
        savedAt: formattedDateTime,
        suppliers: JSON.parse(JSON.stringify(suppliers)),
        items: JSON.parse(JSON.stringify(items)),
        capacityRows: finalCapacityRows,
        summary: JSON.parse(JSON.stringify(summary)),
        categoryId: activeCategoryId,
        categoryName: activeCategoryObj.name,
        chamadoNumber: chamadoNumber,
      };

      setArchivedQuotes((prev) =>
        prev.map((q) => (q.id === editingQuoteId ? updatedArchive : q))
      );

      // Automatically set select targets to this quote
      setSelectedCompareQuoteId(editingQuoteId);

      setSuccessMessage(`Sucesso! A Cotação número [${editingQuoteId}] foi salva com sucesso no histórico.`);
      setTimeout(() => {
        setSuccessMessage("");
      }, 6000);

      registerChangeLog(`Salva edição da cotação #${editingQuoteId} por ${userName.toUpperCase()}`);
    } else {
      // MODE: NEW QUOTE
      const maxNumber = archivedQuotes.reduce((max, q) => {
        const num = parseInt(q.id.replace("COT-", ""), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      
      const nextNumber = maxNumber + 1;
      const formattedId = `COT-${String(nextNumber).padStart(3, "0")}`;

      const newArchive: ArchivedQuote = {
        id: formattedId,
        title: quoteTitle,
        quoteDate: quoteDate,
        userName: userName,
        userCpf: userCpf,
        savedAt: formattedDateTime,
        suppliers: JSON.parse(JSON.stringify(suppliers)),
        items: JSON.parse(JSON.stringify(items)),
        capacityRows: finalCapacityRows,
        summary: JSON.parse(JSON.stringify(summary)),
        categoryId: activeCategoryId,
        categoryName: activeCategoryObj.name,
        chamadoNumber: chamadoNumber,
      };

      setArchivedQuotes((prev) => {
        const filtered = prev.filter((q) => q.id === formattedId);
        if (filtered.length > 0) return prev; // Avoid duplicate IDs
        return [...prev, newArchive];
      });

      // Automatically set select targets to this newly saved quote
      setSelectedCompareQuoteId(formattedId);

      setSuccessMessage(`Sucesso! A Cotação número [${formattedId}] foi salva com sucesso no histórico.`);
      setTimeout(() => {
        setSuccessMessage("");
      }, 6000);

      registerChangeLog(`Salva nova cotação #${formattedId} por ${userName.toUpperCase()}`);
    }
  };

  // Triggered when user opens "+ NOVA COTAÇÃO", showing the modal first
  const handleNewQuote = () => {
    setImportQuoteId("");
    setModalChamadoNumber("00000000");
    setModalQuoteTitle("");
    setIsModalForNewQuote(true);
    setShowCategoryModal(true);
  };

  // Called when category selection is approved inside the modal
  const finalizeNewQuote = (categoryId: string) => {
    const finalChamado = modalChamadoNumber.trim() || "00000000";
    const finalTitle = modalQuoteTitle.trim();

    // 1. Save active quote to the archives list automatically
    const now = new Date();
    const formattedDateTime = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(now);

    const originalCategoryId = activeCategoryId;
    const originalCategoryName = activeCategoryObj.name;

    const isLimpezaOriginal = originalCategoryId === "material_limpeza" || (originalCategoryName.toLowerCase().includes("limpeza") && !originalCategoryName.toLowerCase().includes("extra") && !originalCategoryId.includes("extra"));

    let finalCapacityRows = JSON.parse(JSON.stringify(capacityRows));
    if (isLimpezaOriginal) {
      const targetMonth = getPosteriorMonthLabel(quoteDate);
      const matchIdx = finalCapacityRows.findIndex((r: any) => r.month.trim().toLowerCase() === targetMonth);
      if (matchIdx !== -1) {
        if (finalCapacityRows[matchIdx].value === 0) {
          finalCapacityRows[matchIdx].value = summary.mixedTotal;
          // Apply state change to capacityRows too
          setCapacityRows(finalCapacityRows);
        }
      }
    }

    const normTitle = (quoteTitle || "").trim().toLowerCase();
    const normChamado = (chamadoNumber || "").trim();

    // Check if an identical quote (same title, chamado, and items) already exists in archivedQuotes
    const duplicateQuote = archivedQuotes.find((q) => {
      const qTitle = (q.title || "").trim().toLowerCase();
      const qChamado = (q.chamadoNumber || "").trim();
      return qTitle === normTitle && qChamado === normChamado && areQuoteItemsEqual(q.items, items);
    });

    if (duplicateQuote) {
      // Overwrite/replace the duplicate quote! Keep its ID!
      const updatedArchive: ArchivedQuote = {
        id: duplicateQuote.id,
        title: quoteTitle,
        quoteDate: quoteDate,
        userName: userName,
        userCpf: userCpf,
        savedAt: formattedDateTime,
        suppliers: JSON.parse(JSON.stringify(suppliers)),
        items: JSON.parse(JSON.stringify(items)),
        capacityRows: finalCapacityRows,
        summary: JSON.parse(JSON.stringify(summary)),
        categoryId: originalCategoryId,
        categoryName: originalCategoryName,
        chamadoNumber: chamadoNumber,
      };

      setArchivedQuotes((prev) => {
        // If we are editing a DIFFERENT quote, filter it out to prevent duplication of identical information
        const filtered = editingQuoteId && editingQuoteId !== duplicateQuote.id
          ? prev.filter((q) => q.id !== editingQuoteId)
          : prev;
        return filtered.map((q) => (q.id === duplicateQuote.id ? updatedArchive : q));
      });
      
      setSelectedCompareQuoteId(duplicateQuote.id);
    } else {
      if (editingQuoteId) {
        // Keep its original ID when editing
        const updatedArchive: ArchivedQuote = {
          id: editingQuoteId,
          title: quoteTitle,
          quoteDate: quoteDate,
          userName: userName,
          userCpf: userCpf,
          savedAt: formattedDateTime,
          suppliers: JSON.parse(JSON.stringify(suppliers)),
          items: JSON.parse(JSON.stringify(items)),
          capacityRows: finalCapacityRows,
          summary: JSON.parse(JSON.stringify(summary)),
          categoryId: originalCategoryId,
          categoryName: originalCategoryName,
          chamadoNumber: chamadoNumber,
        };

        setArchivedQuotes((prev) =>
          prev.map((q) => (q.id === editingQuoteId ? updatedArchive : q))
        );
      } else {
        // Create new sequence number
        const maxNumber = archivedQuotes.reduce((max, q) => {
          const num = parseInt(q.id.replace("COT-", ""), 10);
          return !isNaN(num) && num > max ? num : max;
        }, 0);
        
        const nextNumber = maxNumber + 1;
        const formattedId = `COT-${String(nextNumber).padStart(3, "0")}`;

        const newArchive: ArchivedQuote = {
          id: formattedId,
          title: quoteTitle,
          quoteDate: quoteDate,
          userName: userName,
          userCpf: userCpf,
          savedAt: formattedDateTime,
          suppliers: JSON.parse(JSON.stringify(suppliers)),
          items: JSON.parse(JSON.stringify(items)),
          capacityRows: finalCapacityRows,
          summary: JSON.parse(JSON.stringify(summary)),
          categoryId: originalCategoryId,
          categoryName: originalCategoryName,
          chamadoNumber: chamadoNumber,
        };

        setArchivedQuotes((prev) => [...prev, newArchive]);
        setSelectedCompareQuoteId(formattedId);
      }
    }

    // Set active ticket number for the new quote
    setChamadoNumber(finalChamado);
    setQuoteTitle(finalTitle);

    // 2. Either IMPORT or clear items completely to start a brand new quotation
    if (importQuoteId) {
      const sourceQuote = archivedQuotes.find((q) => q.id === importQuoteId);
      if (sourceQuote) {
        setSuppliers(JSON.parse(JSON.stringify(sourceQuote.suppliers)));
        setItems(JSON.parse(JSON.stringify(sourceQuote.items)));
        setCapacityRows(JSON.parse(JSON.stringify(sourceQuote.capacityRows)));
        setQuoteDate(sourceQuote.quoteDate);
        setEditingQuoteId(null);
        setQuoteTitle(finalTitle || sourceQuote.title || "");
        setActiveCategoryId(categoryId);
        setShowCategoryModal(false);
        setImportQuoteId("");

        const activeCatObj = categories.find((c) => c.id === categoryId);
        const categoryName = activeCatObj ? activeCatObj.name : "Geral";

        registerChangeLog(`Iniciada nova cotação #${finalChamado ? "chamado " + finalChamado : ""} importando dados de #${sourceQuote.id} para ${categoryName}`);
        setSuccessMessage(`Nova Cotação iniciada para "${categoryName}"! Dados copiados de #${sourceQuote.id}.`);
        setTimeout(() => setSuccessMessage(""), 5050);
        return;
      }
    }

    // Default: Clear items completely to start a brand new quotation from scratch
    setItems([]);
    setEditingQuoteId(null);
    setSuppliers([
      { id: "s1", name: "", phone: "", vendedor: "" },
      { id: "s2", name: "", phone: "", vendedor: "" },
      { id: "s3", name: "", phone: "", vendedor: "" }
    ]);

    // Set active category ID
    setActiveCategoryId(categoryId);
    setShowCategoryModal(false);

    const activeCatObj = categories.find((c) => c.id === categoryId);
    const categoryName = activeCatObj ? activeCatObj.name : "Geral";
    registerChangeLog(`Iniciada nova cotação para "${categoryName}"`);

    setSuccessMessage(`Nova Cotação iniciada para "${categoryName}"! Os itens de simulação foram limpos.`);
    setTimeout(() => {
      setSuccessMessage("");
    }, 8000);
  };

  const handleClearComparison = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Limpar Histórico?",
      message: "Isso irá apagar permanentemente todas as cotações arquivadas. Esta ação não pode ser desfeita.",
      variant: "danger",
      onConfirm: () => {
        setArchivedQuotes([]);
        setSelectedCompareQuoteId("");
        showToast("Histórico de cotações arquivadas limpo!", "success");
      },
    });
  };

  const handleDeleteQuote = (id: string) => {
    const quoteToDelete = archivedQuotes.find((q) => q.id === id);
    const nameOfQuote = quoteToDelete ? `${quoteToDelete.id} (${quoteToDelete.categoryName || "Geral"})` : id;
    
    setConfirmDialog({
      isOpen: true,
      title: `Excluir Cotação #${nameOfQuote}?`,
      message: "Esta cotação será removida permanentemente do histórico.",
      variant: "danger",
      onConfirm: () => {
        setArchivedQuotes((prev) => prev.filter((q) => q.id !== id));
        if (selectedCompareQuoteId === id) {
          setSelectedCompareQuoteId("");
        }
        registerChangeLog(`Exclusão da Cotação #${nameOfQuote}`);
        showToast(`Cotação #${id} excluída permanentemente.`, "success");
      },
    });
  };

  const handleLoadQuoteForEdit = (quote: ArchivedQuote) => {
    setQuoteDate(quote.quoteDate);
    setSuppliers(quote.suppliers);
    setItems(quote.items);
    setCapacityRows(quote.capacityRows);
    setEditingQuoteId(quote.id);
    setChamadoNumber(quote.chamadoNumber || "");
    setQuoteTitle(quote.title || "");
    
    if (quote.categoryId) {
      setActiveCategoryId(quote.categoryId);
    }
    
    registerChangeLog(`Carregada Cotação #${quote.id}`);
    
    setSuccessMessage(`Carregada Cotação #${quote.id} de volta na planilha para edição/cálculos.`);
    setTimeout(() => setSuccessMessage(""), 6000);
  };

  // Reset to default spreadsheet data
  const handleResetToDefaults = () => {
    setQuoteDate(INITIAL_STATE.quoteDate);
    setSuppliers(INITIAL_STATE.suppliers);
    setItems(INITIAL_STATE.items);
    setCapacityRows(INITIAL_CAPACITY);
    setArchivedQuotes([]);
    setSelectedCompareQuoteId("");
    setEditingQuoteId(null);
    setChamadoNumber("");
    setQuoteTitle("");
  };

  const handleExportQuoteExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Cotação Comparativa", {
        views: [{ showGridLines: true }]
      });

      // Style configurations
      const colorHeaderBg = "1A3A5C"; // Dark blue
      const colorHighlight = "C6EFCE"; // Green fill for lowest price
      const colorHighlightText = "006100"; // Dark green text

      // Add Title Block
      ws.mergeCells("A1:H1");
      const titleCell = ws.getCell("A1");
      titleCell.value = "RELATÓRIO COMPARATIVO DE COTAÇÕES — BP-COMPRAS";
      titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorHeaderBg } };
      ws.getRow(1).height = 35;

      // Add Meta Block
      ws.getCell("A3").value = "Categoria:";
      ws.getCell("A3").font = { bold: true };
      ws.getCell("B3").value = activeCategoryObj.name;

      ws.getCell("D3").value = "Chamado:";
      ws.getCell("D3").font = { bold: true };
      ws.getCell("E3").value = chamadoNumber || "N/A";

      ws.getCell("G3").value = "Data Ref.:";
      ws.getCell("G3").font = { bold: true };
      ws.getCell("H3").value = quoteDate;

      // Best Single Store & Mixed Purchase highlights
      ws.getCell("A4").value = "Operador:";
      ws.getCell("A4").font = { bold: true, size: 9 };
      ws.getCell("B4").value = userName;

      ws.getCell("D4").value = "Melhor Fornecedor Único:";
      ws.getCell("D4").font = { bold: true, size: 9 };
      const bestSupp = suppliers.find(s => s.id === summary.bestSupplierId);
      ws.getCell("E4").value = bestSupp ? bestSupp.name : "N/A";

      ws.getCell("G4").value = "Melhor Compra Mista:";
      ws.getCell("G4").font = { bold: true, size: 9 };
      ws.getCell("H4").value = summary.mixedTotal;
      ws.getCell("H4").numFmt = '"R$ "#,##0.00';

      ws.getCell("A5").value = "Economia Auditada (vs Pior Fornecedor):";
      ws.getCell("A5").font = { bold: true, size: 9, color: { argb: "FF10B981" } };
      ws.getCell("C5").value = summary.savingsVersusWorst;
      ws.getCell("C5").font = { bold: true, color: { argb: "FF10B981" } };
      ws.getCell("C5").numFmt = '"R$ "#,##0.00';

      ws.getRow(3).height = 20;
      ws.getRow(4).height = 20;
      ws.getRow(5).height = 20;

      // Table Headers
      const startRow = 7;
      ws.getRow(startRow).height = 24;

      const headers = ["Item", "Quantidade", ...suppliers.map(s => s.name), "Menor Preço", "Fornecedor Sugerido", "Observação"];
      headers.forEach((h, idx) => {
        const cell = ws.getCell(startRow, idx + 1);
        cell.value = h;
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF252A34" } };
      });

      // Write table rows
      let currentRow = startRow + 1;
      const filteredItems = items.filter(it => it.quantity > 0);

      filteredItems.forEach((item) => {
        ws.getRow(currentRow).height = 20;

        // Item Name
        ws.getCell(currentRow, 1).value = item.name;
        // Quantity
        const qtyCell = ws.getCell(currentRow, 2);
        qtyCell.value = item.quantity;
        qtyCell.alignment = { horizontal: "center" };

        // Prices for each supplier
        let minPrice = Infinity;
        let minPriceSupplierId = null;

        suppliers.forEach((s) => {
          const price = item.prices[s.id];
          if (price !== null && price !== undefined) {
            if (price < minPrice) {
              minPrice = price;
              minPriceSupplierId = s.id;
            }
          }
        });

        suppliers.forEach((s, sIdx) => {
          const price = item.prices[s.id];
          const cell = ws.getCell(currentRow, 3 + sIdx);
          if (price !== null && price !== undefined) {
            cell.value = price;
            cell.numFmt = '"R$ "#,##0.00';
            cell.alignment = { horizontal: "right" };

            // Highlight minimum price in green
            if (s.id === minPriceSupplierId && price > 0) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorHighlight } };
              cell.font = { color: { argb: colorHighlightText }, bold: true };
            }
          } else {
            cell.value = "-";
            cell.alignment = { horizontal: "center" };
          }
        });

        // Lowest Price
        const minPriceCell = ws.getCell(currentRow, 3 + suppliers.length);
        if (minPrice !== Infinity && minPrice > 0) {
          minPriceCell.value = minPrice;
          minPriceCell.numFmt = '"R$ "#,##0.00';
        } else {
          minPriceCell.value = "-";
        }
        minPriceCell.alignment = { horizontal: "right" };

        // Suggested Supplier
        const suggestedCell = ws.getCell(currentRow, 4 + suppliers.length);
        const suggestedSupplier = suppliers.find(s => s.id === minPriceSupplierId);
        suggestedCell.value = suggestedSupplier ? suggestedSupplier.name : "N/A";
        suggestedCell.alignment = { horizontal: "center" };
        suggestedCell.font = { bold: true };

        // Observation
        const obsCell = ws.getCell(currentRow, 5 + suppliers.length);
        obsCell.value = item.observation || "";

        currentRow++;
      });

      // Totals Row
      ws.getRow(currentRow).height = 24;
      const totalLabelCell = ws.getCell(currentRow, 1);
      totalLabelCell.value = "VALOR TOTAL";
      totalLabelCell.font = { bold: true, size: 10 };
      totalLabelCell.alignment = { horizontal: "left", vertical: "middle" };

      const totalQtyCell = ws.getCell(currentRow, 2);
      totalQtyCell.value = filteredItems.reduce((acc, it) => acc + it.quantity, 0);
      totalQtyCell.font = { bold: true };
      totalQtyCell.alignment = { horizontal: "center" };

      // Supplier totals
      suppliers.forEach((s, sIdx) => {
        const totalVal = summary.supplierTotals[s.id] || 0;
        const cell = ws.getCell(currentRow, 3 + sIdx);
        cell.value = totalVal;
        cell.font = { bold: true };
        cell.numFmt = '"R$ "#,##0.00';
        cell.alignment = { horizontal: "right" };

        if (s.id === summary.bestSupplierId && totalVal > 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4EDDA" } };
        }
      });

      // Overall dynamic minimum total
      const overallTotalCell = ws.getCell(currentRow, 3 + suppliers.length);
      overallTotalCell.value = summary.mixedTotal;
            overallTotalCell.font = { bold: true, color: { argb: "FFc21e54" } };
      overallTotalCell.numFmt = '"R$ "#,##0.00';
      overallTotalCell.alignment = { horizontal: "right" };

      const recommendationCell = ws.getCell(currentRow, 4 + suppliers.length);
      recommendationCell.value = "COMPRA OTIMIZADA";
            recommendationCell.font = { bold: true, color: { argb: "FFc21e54" }, size: 8 };
      recommendationCell.alignment = { horizontal: "center", vertical: "middle" };

      // Set column widths
      ws.getColumn(1).width = 28;
      ws.getColumn(2).width = 12;
      suppliers.forEach((_, sIdx) => {
        ws.getColumn(3 + sIdx).width = 18;
      });
      ws.getColumn(3 + suppliers.length).width = 16;
      ws.getColumn(4 + suppliers.length).width = 20;
      ws.getColumn(5 + suppliers.length).width = 25;

      // Save/download Excel file
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Cotacao_Comparativa_${activeCategoryObj.name.replace(/\s+/g, "_")}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      setSuccessMessage("Cotação comparativa salva em Excel (.xlsx) com sucesso!");
      setTimeout(() => setSuccessMessage(""), 5000);
      registerChangeLog(`Exportação da cotação comparativa de "${activeCategoryObj.name}" para Excel`);
    } catch (e) {
      console.error(e);
      alert("Erro ao exportar planilha comparativa.");
    }
  };

  // Direct print handler triggering browser print directly
  const handlePrint = () => {
    const originalTitle = document.title;
    // Try native window.print()
    try {
      const activeQuoteId = editingQuoteId || `COT-${String(archivedQuotes.length + 1).padStart(3, "0")}`;
      const formattedValue = `R$ ${summary.mixedTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
      
      const finalTitle = [
        activeQuoteId,
        formattedValue,
        (quoteTitle || "").trim() || "Sem_Título",
        (chamadoNumber || "").trim() || "Sem_Chamado"
      ].join(" - ");

      document.title = finalTitle;

      window.focus();
      window.print();
    } catch (e) {
      console.error("Erro ao imprimir:", e);
    } finally {
      // Restore the tab title after a short delay so browser print captures the overridden title
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }

    // Since the document is running inside Google AI Studio's sandboxed iframe,
    // standard `window.print()` is blocked by default by Chrome's security settings.
    // In that case, we show a gorgeous helper modal guiding the user to easily open the app
    // in a new tab (or press Ctrl + P) so they can generate and print the full PDF natively!
    const isIframe = window.self !== window.top;
    if (isIframe) {
      setShowPrintModal(true);
    }
  };

  const handleLogout = () => {
    setUserName("");
    setUserCpf("");
    localStorage.removeItem("clean_quotes_username");
    localStorage.removeItem("clean_quotes_user_cpf");
  };

  if (!userName || !userCpf) {
    return (
      <LoginScreen
        onLogin={(fullName, cpf) => {
          setUserName(fullName);
          setUserCpf(cpf);
        }}
      />
    );
  }

  const activeQuoteId = editingQuoteId || `COT-${String(archivedQuotes.length + 1).padStart(3, "0")}`;
  const firstName = userName ? userName.trim().split(" ")[0] : "Usuário";
  const displayCpf = userCpf ? userCpf : "000.000.000-00";

  return (
    <div className={`min-h-screen text-slate-900 selection:bg-blue-100 font-sans leading-none theme-${visualTheme}`}>
      
      {/* MOBILE HEADER (only visible on mobile) */}
      <div className="md:hidden flex items-center justify-between bg-white text-slate-900 px-4 py-3 print:hidden shrink-0 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-slate-900 flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[16px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>business_center</span>
          </div>
          <span className="text-xs font-semibold tracking-tight uppercase text-slate-900">
            FACILITIES <span className="text-blue-600">BP</span>
          </span>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-1.5 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors duration-150 cursor-pointer"
          title="Abrir Menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* MOBILE SIDEBAR BACKDROP */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-30 md:hidden print:hidden transition-opacity duration-150"
        />
      )}

      {/* LEFT SIDEBAR — Minimal & Professional */}
      <aside className={`bp-sidebar ${isMobileSidebarOpen ? "bp-sidebar-open" : ""} print:hidden`}>
        {/* Brand Logo */}
        <div className="bp-sidebar-brand">
          <div className="bp-sidebar-brand-icon">
            <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>business_center</span>
          </div>
          <span className="bp-sidebar-brand-label">FACILITIES</span>
        </div>

        {/* Navigation */}
        <nav className="bp-sidebar-nav">
          <button
            onClick={() => { setActiveView("cotacao"); setIsMobileSidebarOpen(false); }}
            className={`bp-sidebar-nav-item ${activeView === "cotacao" ? "bp-sidebar-nav-item-active" : ""}`}
            title="Cotação"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="bp-sidebar-nav-label">Cotação</span>
          </button>

          <button
            onClick={() => { setActiveView("estoque"); setIsMobileSidebarOpen(false); }}
            className={`bp-sidebar-nav-item ${activeView === "estoque" ? "bp-sidebar-nav-item-active" : ""}`}
            title="Estoque"
          >
            <span className="material-symbols-outlined">inventory_2</span>
            <span className="bp-sidebar-nav-label">Estoque</span>
          </button>

          <button
            onClick={() => { setActiveView("normativa"); setIsMobileSidebarOpen(false); }}
            className={`bp-sidebar-nav-item ${activeView === "normativa" ? "bp-sidebar-nav-item-active" : ""}`}
            title="Normativa"
          >
            <span className="material-symbols-outlined">analytics</span>
            <span className="bp-sidebar-nav-label">Normativa</span>
          </button>

          <button
            onClick={() => { setActiveView("ronda"); setIsMobileSidebarOpen(false); }}
            className={`bp-sidebar-nav-item ${activeView === "ronda" ? "bp-sidebar-nav-item-active" : ""}`}
            title="Ronda"
          >
            <span className="material-symbols-outlined">business_center</span>
            <span className="bp-sidebar-nav-label">Ronda</span>
          </button>

          <button
            onClick={() => { setActiveView("docs"); setIsMobileSidebarOpen(false); }}
            className={`bp-sidebar-nav-item ${activeView === "docs" ? "bp-sidebar-nav-item-active" : ""}`}
            title="Documentos"
          >
            <span className="material-symbols-outlined">request_quote</span>
            <span className="bp-sidebar-nav-label">Docs</span>
          </button>

          {/* Docs sub-items */}
          <div className="w-full flex flex-col items-center gap-0.5 pl-0">
            <button
              onClick={() => setIsDocsMenuOpen(!isDocsMenuOpen)}
              className="bp-sidebar-nav-item"
              title="Mais Documentos"
              style={{ padding: "4px 0" }}
            >
              <span className="material-symbols-outlined text-[18px]">folder_open</span>
            </button>
            {isDocsMenuOpen && (
              <div className="flex flex-col gap-0.5 w-full items-center">
                <button onClick={() => { setIsMeiModalOpen(true); setIsMobileSidebarOpen(false); }} className="bp-sidebar-nav-item text-[9px]" title="Ficha Autônomo">
                  <span className="material-symbols-outlined text-[16px]">description</span>
                </button>
                <button onClick={() => { setIsTermsModalOpen(true); setIsMobileSidebarOpen(false); }} className="bp-sidebar-nav-item text-[9px]" title="Termos">
                  <span className="material-symbols-outlined text-[16px]">gavel</span>
                </button>
                <button onClick={() => { setIsAprendizModalOpen(true); setIsMobileSidebarOpen(false); }} className="bp-sidebar-nav-item text-[9px]" title="Aprendizes">
                  <span className="material-symbols-outlined text-[16px]">school</span>
                </button>
                <button onClick={() => { setIsReceiptModalOpen(true); setIsMobileSidebarOpen(false); }} className="bp-sidebar-nav-item text-[9px]" title="Recibo">
                  <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="bp-sidebar-footer">
          <button
            onClick={() => { handleNewQuote(); setIsMobileSidebarOpen(false); }}
            className="bp-sidebar-nav-item"
            title="Nova Cotação"
          >
            <span className="material-symbols-outlined" style={{ color: "#3b82f6" }}>add_circle</span>
            <span className="bp-sidebar-nav-label" style={{ color: "#3b82f6" }}>Nova</span>
          </button>
          <button
            onClick={() => {
              localStorage.setItem("clean_quotes_chamado_number", chamadoNumber);
              localStorage.setItem("clean_quotes_title", quoteTitle);
              localStorage.setItem("clean_quotes_categories", JSON.stringify(categories));
              localStorage.setItem("clean_quotes_active_category_id", activeCategoryId);
              localStorage.setItem("clean_quotes_username", userName);
              localStorage.setItem("clean_quotes_user_cpf", userCpf);
              localStorage.setItem("clean_quotes_date", quoteDate);
              localStorage.setItem("clean_quotes_suppliers", JSON.stringify(suppliers));
              localStorage.setItem("clean_quotes_items", JSON.stringify(items));
              localStorage.setItem("clean_quotes_capacity", JSON.stringify(capacityRows));
              localStorage.setItem("clean_quotes_archived", JSON.stringify(archivedQuotes));
              localStorage.setItem("clean_quotes_selected_compare_id", selectedCompareQuoteId);
              localStorage.setItem("clean_quotes_visual_theme", visualTheme);
              if (editingQuoteId) {
                localStorage.setItem("clean_quotes_editing_quote_id", editingQuoteId);
              }
              window.close();
            }}
            className="bp-sidebar-nav-item"
            title="Salvar e Sair"
            type="button"
          >
            <span className="material-symbols-outlined" style={{ color: "#64748b" }}>logout</span>
            <span className="bp-sidebar-nav-label" style={{ color: "#64748b" }}>Sair</span>
          </button>
        </div>
      </aside>
      
      {/* SUCCESS FLUTUANTE DE FEEDBACK */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-bounce duration-500 bg-slate-900 text-white font-semibold text-xs px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 print:hidden max-w-sm">
          <Check className="h-4 w-4 shrink-0 text-green-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-2 sm:p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 max-w-md w-full shadow-2xl relative animate-scale-up text-slate-800 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="absolute top-4 right-4 z-10">
              <EmojiButton
                iconKey="fechar"
                onClick={() => setShowCategoryModal(false)}
                size="sm"
                variant="neutral"
                className="h-8 w-8 min-h-[32px] min-w-[32px] border-0 bg-transparent hover:bg-slate-100"
              />
            </div>
            
            {/* Scrollable Container for Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 scrollbar-thin scrollbar-thumb-slate-200 py-1">
              <div className="text-center space-y-1">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mx-auto mb-1">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  {isModalForNewQuote ? "Nova Cotação" : "Alterar Categoria"}
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {isModalForNewQuote 
                    ? "Selecione a categoria dos materiais de facilities" 
                    : "Modifique a categoria da cotação ativa atual"}
                </p>
              </div>

              {/* Custom scrollable select dropdown component */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCategorySelectOpen(!isCategorySelectOpen)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all duration-200 flex items-center justify-between cursor-pointer"
                >
                  <div className="truncate pr-2">
                    <span className="text-[8px] font-black text-slate-500 block uppercase tracking-wider">Categoria Ativa Selecionada</span>
                    <span className="text-xs font-black text-slate-900 uppercase truncate">
                      {activeCategoryObj?.name || "Nenhuma categoria"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#FF2E63] font-extrabold text-[9px] shrink-0">
                    <span>CLIQUE PARA ESCOLHER</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isCategorySelectOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isCategorySelectOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                    <div className="p-1 px-2 text-[8px] font-black tracking-wider text-slate-500 bg-slate-50 border-b border-slate-100 uppercase">
                      RELAÇÃO DE CATEGORIAS (ROLE PARA ATIVAR)
                    </div>
                    <div className="max-h-[170px] overflow-y-auto divide-y divide-slate-100 scrollbar-thin scrollbar-thumb-slate-300">
                      {categories.map((cat) => {
                        const isSelected = activeCategoryId === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setActiveCategoryId(cat.id);
                              setIsCategorySelectOpen(false);
                            }}
                            className={`w-full text-left p-2.5 transition-all flex justify-between items-center hover:bg-slate-50 cursor-pointer ${
                              isSelected ? "bg-pink-50/20" : ""
                            }`}
                          >
                            <div className="space-y-0.5 max-w-[70%]">
                              <span className={`text-[10px] uppercase tracking-tight block truncate ${
                                isSelected ? "font-black text-[#FF2E63]" : "font-extrabold text-slate-800"
                              }`}>
                                {cat.name}
                              </span>
                              <span className="text-[8px] text-slate-500 font-semibold block leading-tight normal-case truncate">
                                {cat.items && cat.items.length > 0 ? cat.items.slice(0, 3).join(", ") : "Nenhum cadastrado"}
                              </span>
                            </div>
                            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-tight shrink-0 ${
                              isSelected ? "bg-[#FF2E63] text-white" : "bg-slate-100 text-slate-600"
                            }`}>
                              {cat.items ? cat.items.length : 0} ITENS
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic input to add a custom category */}
              <div className="pt-2.5 border-t border-slate-100">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Criar Nova Categoria Personalizada</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex. Copa e Cozinha, Ferramentas..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-[#FF2E63]"
                  />
                  <button
                    onClick={() => {
                      const trimmed = newCategoryName.trim();
                      if (!trimmed) return;
                      const nextId = `cat_${Date.now()}`;
                      const newCatObj = {
                        id: nextId,
                        name: trimmed,
                        items: [],
                      };
                      setCategories((prev) => [...prev, newCatObj]);
                      setActiveCategoryId(nextId);
                      setNewCategoryName("");
                      setSuccessMessage(`Categoria "${trimmed}" criada com sucesso!`);
                      setTimeout(() => setSuccessMessage(""), 4000);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase px-3 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Template Quote import option */}
              {isModalForNewQuote && archivedQuotes.length > 0 && (
                <div className="pt-2.5 border-t border-slate-100">
                  <p className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                    <span>Importar Cotação Anterior (Opcional)</span>
                  </p>
                  <select
                    value={importQuoteId}
                    onChange={(e) => {
                      const qId = e.target.value;
                      setImportQuoteId(qId);
                      if (qId) {
                        const selected = archivedQuotes.find(q => q.id === qId);
                        if (selected && selected.categoryId) {
                          setActiveCategoryId(selected.categoryId);
                        }
                      }
                    }}
                    className="w-full text-xs font-bold border-2 border-slate-200 text-slate-800 rounded-xl py-2 px-2.5 bg-slate-50 focus:outline-none focus:border-[#FF2E63] cursor-pointer"
                  >
                    <option value="">-- Começar do Zero (Cotação Limpa) --</option>
                    {archivedQuotes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.id} - {q.categoryName || "Geral"}{q.title ? ` | ${q.title}` : ""} ({q.quoteDate} - R$ {q.summary.mixedTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-slate-500 font-bold mt-1 leading-tight normal-case">
                    * Aproveite itens, quantidades, valores e fornecedores salvos para apenas corrigir diferenças.
                  </p>
                </div>
              )}

              {/* inputs para Título do Orçamento e Número do Chamado (Opcionais) */}
              {isModalForNewQuote && (
                <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-3">
                  <div>
                    <label className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                      Título do Orçamento <span className="text-[8px] text-slate-500 font-bold lowercase">(opcional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ex: Refeitório, Recepção"
                        value={modalQuoteTitle}
                        onChange={(e) => setModalQuoteTitle(e.target.value)}
                        className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 focus:border-[#FF2E63] focus:outline-none focus:ring-0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                      Número do Chamado <span className="text-[8px] text-slate-500 font-bold lowercase">(opcional - padrão "00000000")</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="00000000"
                        maxLength={8}
                        value={modalChamadoNumber}
                        onChange={(e) => setModalChamadoNumber(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-900 tracking-widest text-center focus:border-[#FF2E63] focus:outline-none focus:ring-0 uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Static Action Buttons Footer */}
            <div className="flex gap-2.5 pt-4 border-t border-slate-100 shrink-0">
              <EmojiButton
                iconKey="fechar"
                onClick={() => setShowCategoryModal(false)}
                size="md"
                variant="neutral"
                className="flex-1"
              />
              <EmojiButton
                iconKey={isModalForNewQuote ? "iniciarComparador" : "salvar"}
                onClick={() => {
                  if (isModalForNewQuote) {
                    finalizeNewQuote(activeCategoryId);
                  } else {
                    // Just confirm change
                    const targetCatObj = categories.find((c) => c.id === activeCategoryId);
                    const catName = targetCatObj ? targetCatObj.name : "Geral";
                    
                    if (editingQuoteId) {
                      setArchivedQuotes((prev) =>
                        prev.map((q) => {
                          if (q.id === editingQuoteId) {
                            return {
                              ...q,
                              categoryId: activeCategoryId,
                              categoryName: catName,
                            };
                          }
                          return q;
                        })
                      );
                      registerChangeLog(`Alterada categoria da Cotação #${editingQuoteId} para "${catName}"`);
                      setSuccessMessage(`Categoria da Cotação #${editingQuoteId} atualizada para "${catName}"!`);
                    } else {
                      registerChangeLog(`Alterada categoria ativa para "${catName}"`);
                      setSuccessMessage(`Categoria ativa updated para "${catName}"!`);
                    }
                    setShowCategoryModal(false);
                    setTimeout(() => setSuccessMessage(""), 5000);
                  }
                }}
                size="md"
                variant="primary"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bp-main w-full px-3 py-3 sm:px-4 lg:px-5 print:p-0 print:max-w-none print:w-full min-w-0">

        {/* Corporate Header */}
        <Header
          quoteDate={quoteDate}
          userName={userName}
          userCpf={userCpf}
          activeQuoteId={editingQuoteId || `COT-${String(archivedQuotes.length + 1).padStart(3, "0")}`}
          chamadoNumber={chamadoNumber}
          quoteTitle={quoteTitle}
          onDateChange={setQuoteDate}
          onReset={() => setConfirmDialog({
            isOpen: true,
            title: "Reiniciar Planilha?",
            message: "Isso substituirá suas alterações atuais e restaurará a cotação padrão de 15/06/2026.",
            variant: "danger",
            onConfirm: handleResetToDefaults,
          })}
          onPrint={handlePrint}
          onLogout={handleLogout}
          onSaveComparison={handleSaveComparison}
          onNewQuote={handleNewQuote}
          hasHistory={archivedQuotes.length > 0}
          activeCategoryName={activeCategoryObj.name}
          syncStatus={syncStatus}
          onCategoryClick={() => {
            setIsModalForNewQuote(false);
            setShowCategoryModal(true);
            setIsCategorySelectOpen(true); // make sure it opens the dropdown directly
          }}
          onAiClick={() => setIsAiDrawerOpen(true)}
          onGithubClick={() => setIsGithubModalOpen(true)}
          activeView={activeView}
          onViewChange={setActiveView}
          visualTheme={visualTheme}
          onThemeChange={setVisualTheme}
        />

        {/* Brand Header */}
        <div id="bp-compras-header" className="mb-3 sm:mb-4 py-2 px-1 print:hidden flex flex-row items-center justify-between gap-2 sm:gap-3 relative">
          {/* Left Side: Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex flex-col justify-center text-left leading-none">
              <span className="text-[6px] sm:text-[7.5px] font-sans font-bold tracking-[0.3em] text-[#FF2E63] uppercase leading-none">FACILITIES</span>
              <div className="text-base sm:text-lg font-display font-extrabold tracking-tight leading-none uppercase my-0.5 flex items-center gap-0.5">
                <span className="text-slate-900">B</span>
                <span className="text-[#FF2E63]">P</span>
              </div>
              <span className="text-[7px] sm:text-[8.5px] font-sans font-medium tracking-[0.35em] text-slate-400 uppercase leading-none">COMPRAS</span>
            </div>
          </div>

          {/* Right Side: Title & Chamado Inputs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto flex-1 justify-end min-w-0">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus-within:border-[#FF2E63] focus-within:ring-1 focus-within:ring-pink-50 transition-all duration-200 flex-1 min-w-0 sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px] xl:max-w-[1100px]">
              <span className="text-[7px] font-bold uppercase text-slate-400 tracking-wider font-sans whitespace-nowrap">Título:</span>
              <input
                type="text"
                value={quoteTitle}
                onChange={(e) => setQuoteTitle(e.target.value)}
                placeholder="Ex: Refeitório, Recepção"
                className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-300 tracking-tight focus:outline-none leading-none p-0 border-0 min-w-0"
              />
            </div>

            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus-within:border-[#FF2E63] focus-within:ring-1 focus-within:ring-pink-50 transition-all duration-200 w-full sm:w-auto sm:max-w-[160px] shrink-0">
              <span className="text-[7px] font-bold uppercase text-slate-400 tracking-wider font-mono whitespace-nowrap">Chamado:</span>
              <input
                type="text"
                value={chamadoNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                  setChamadoNumber(val);
                }}
                placeholder="00000000"
                className="w-full sm:w-22 bg-transparent text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder-slate-300 tracking-widest text-center focus:outline-none leading-none p-0 border-0"
                maxLength={8}
              />
            </div>
          </div>
        </div>

        {activeView === "cotacao" ? (
          <div key="view-cotacao" className="view-content-enter">
            {editingQuoteId && (
              <div className="mb-2 p-2 bg-sky-50 border border-sky-200 rounded-xl text-[9px] font-bold text-sky-900 flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 print:hidden animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 sm:h-2.5 w-2 sm:w-2.5 rounded-full bg-sky-500 shrink-0 animate-pulse" />
                  <div>
                    <span className="uppercase text-[6px] tracking-wider text-sky-500 font-extrabold block leading-none">MODO DE EDIÇÃO ATIVO</span>
                    <span className="font-extrabold uppercase text-[9px] text-sky-950 font-sans">
                      Você está alterando a Cotação <span className="font-black font-mono text-[#FF2E63]">#{editingQuoteId}</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                  <span className="text-[7px] text-sky-600 font-medium leading-tight hidden sm:inline">
                    * Alterações salvas automaticamente.
                  </span>
                  <button
                    onClick={() => {
                      setEditingQuoteId(null);
                      setSuccessMessage("Modo de edição finalizado. A cotação continua salva no histórica, e agora você pode criar novas.");
                      setTimeout(() => setSuccessMessage(""), 5000);
                    }}
                    className="px-2 py-0.5 bg-white border border-sky-200 rounded-lg hover:bg-sky-100 text-sky-850 hover:text-sky-950 text-[8px] font-black cursor-pointer transition-all duration-200 uppercase tracking-tight"
                  >
                    Sair da Edição
                  </button>
                </div>
              </div>
            )}

            {/* METADATA DE ÚLTIMA ALTERAÇÃO (APENAS ONLINE - TELA) */}
            {lastChangeLog && (
              <div className="mb-2 p-2 bg-white border border-slate-200 rounded-xl text-[9px] font-bold text-slate-650 flex flex-col md:flex-row md:items-center md:justify-between gap-1 print:hidden animate-fade-in text-slate-700">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full bg-[#FF2E63] animate-pulse shrink-0" />
                  <span className="uppercase text-[7px] tracking-wider text-slate-450 font-extrabold whitespace-nowrap">Última:</span>
                  <span className="text-slate-900 font-black uppercase text-[8px] truncate">{lastChangeLog.action}</span>
                </div>
                <div className="text-[7px] text-slate-500 font-semibold font-mono self-start md:self-auto uppercase tracking-tight">
                  por <span className="font-extrabold text-[#FF2E63]">{lastChangeLog.user.toUpperCase()}</span> <span className="hidden sm:inline">em</span> <span className="sm:hidden">-</span> {lastChangeLog.timestamp}
                </div>
              </div>
            )}

            {/* Action Buttons Toolbar */}
            <div className="mb-2 flex flex-wrap items-center justify-end gap-1.5 print:hidden">
              <button
                onClick={handleSaveComparison}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200 hover:border-sky-400 text-slate-700 hover:text-sky-600 text-[9px] font-bold transition-all duration-200 cursor-pointer"
                title="Salvar Cotação Atual"
              >
                <Save className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">Salvar</span>
              </button>

              <button
                onClick={handleExportQuoteExcel}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-600 text-[9px] font-bold transition-all duration-200 cursor-pointer"
                title="Exportar para Excel"
              >
                <FileSpreadsheet className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">Excel</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200 hover:border-violet-400 text-slate-700 hover:text-violet-600 text-[9px] font-bold transition-all duration-200 cursor-pointer"
                title="Imprimir Relatório"
              >
                <Printer className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">Imprimir</span>
              </button>

              <button
                onClick={() => setConfirmDialog({
                  isOpen: true,
                  title: "Reiniciar Planilha?",
                  message: "Isso substituirá suas alterações atuais e restaurará a cotação padrão de 15/06/2026.",
                  variant: "danger",
                  onConfirm: handleResetToDefaults,
                })}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200 hover:border-amber-400 text-slate-700 hover:text-amber-600 text-[9px] font-bold transition-all duration-200 cursor-pointer"
                title="Reiniciar Cotação"
              >
                <RotateCcw className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">Reiniciar</span>
              </button>
            </div>

            {/* Dynamic Highlight Dashboard */}
            <Dashboard suppliers={suppliers} summary={summary} />

            {/* Trimestral historical trend comparison - Only show for MATERIAL DE LIMPEZA category */}
            {(activeCategoryId === "material_limpeza" || (activeCategoryObj.name?.toUpperCase().includes("LIMPEZA") && !activeCategoryObj.name?.toUpperCase().includes("EXTRA"))) && (
              <LimpezaHistoryDashboard history={limpezaHistory} />
            )}

            {/* Primary Interactive Spreadsheet taking advantage of the entire screen width */}
            <div className="w-full relative print:w-full mb-2">
              <Table
                suppliers={suppliers}
                items={items}
                summary={summary}
                onUpdateSupplierName={handleUpdateSupplierName}
                onUpdateSupplierDetails={handleUpdateSupplierDetails}
                onAddSupplier={handleAddSupplier}
                onRemoveSupplier={handleRemoveSupplier}
                onUpdateItemName={handleUpdateItemName}
                onUpdateItemQty={handleUpdateItemQty}
                onUpdateItemPrice={handleUpdateItemPrice}
                onUpdateMultiplePrices={handleUpdateMultiplePrices}
                onAddItem={handleAddItem}
                onRemoveItem={handleRemoveItem}
                onImportItems={handleImportItems}
                onQuickAddItem={handleQuickAddItem}
                activeCategoryName={activeCategoryObj.name}
                suggestionItems={activeCategoryObj.items}
                onUpdateItemStock={handleUpdateItemStock}
                onUpdateMultipleQtys={handleUpdateMultipleQtys}
                onUpdateMultipleStocks={handleUpdateMultipleStocks}
                onUpdateItemObservation={handleUpdateItemObservation}
                onToggleItemPreferredSupplier={handleToggleItemPreferredSupplier}
                onToggleItemComprado={handleToggleItemComprado}
                onApplyImportProposal={handleApplyImportProposal}
              />
            </div>

            {/* Bento bottom row: Capacity + Summary stacked */}
            <div className="space-y-2 sm:space-y-3 mb-2 print:mb-3">
              {/* Capacity Planning - Full width equal 3-col */}
              <div className="print:hidden">
                <CapacityPanel
                  capacityRows={capacityRows}
                  mixedTotal={summary.mixedTotal}
                  savedComparison={savedComparison}
                  currentItems={items}
                  archivedQuotes={archivedQuotes}
                  selectedCompareQuoteId={selectedCompareQuoteId}
                  onUpdateCapacity={handleUpdateCapacity}
                  onUpdateValue={handleUpdateValue}
                  onSaveComparison={handleSaveComparison}
                  onClearComparison={handleClearComparison}
                  onDeleteQuote={handleDeleteQuote}
                  onLoadQuoteForEdit={handleLoadQuoteForEdit}
                  onSelectCompareQuote={setSelectedCompareQuoteId}
                  nextQuoteId={`COT-${String(archivedQuotes.length + 1).padStart(3, "0")}`}
                  activeCategoryName={activeCategoryObj.name}
                  activeCategoryId={activeCategoryId}
                  onPrint={handlePrint}
                  quoteDate={quoteDate}
                />
              </div>

              {/* Summary Decision Panels - Full width */}
              <div className="print:break-inside-avoid">
                <SummaryPanel suppliers={suppliers} items={items} summary={summary} />
              </div>
            </div>
          </div>
        ) : activeView === "normativa" ? (
          <div key="view-normativa" className="view-content-enter">
            <NormativaView
              onBack={() => setActiveView("cotacao")}
              visualTheme={visualTheme}
            />
          </div>
        ) : activeView === "docs" ? (
          <div key="view-docs" className="view-content-enter">
            <DocsView
              onBack={() => setActiveView("cotacao")}
              userName={userName}
              onOpenIntelligentReading={() => setIsIntelligentReadingOpen(true)}
            />
          </div>
        ) : activeView === "ronda" ? (
          <div key="view-ronda" className="view-content-enter">
            <RondaView
              onBack={() => setActiveView("cotacao")}
              userName={userName}
              visualTheme={visualTheme}
            />
          </div>
        ) : (
          <div key="view-estoque" className="view-content-enter">
            <StockControl
              onBack={() => setActiveView("cotacao")}
              capacityRows={capacityRows}
              categories={categories}
              setCategories={setCategories}
              onExportToQuotation={handleBulkExportStock}
            />
          </div>
        )}

        {/* Corporate Footer */}
        <footer className="mt-4 border-t border-slate-100 pt-2 text-center text-[9px] text-slate-400 print:hidden">
          <p className="flex items-center justify-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-[14px]">shopping_cart</span>
            FACILITIES BP-COMPRAS • Planilha Comparativa de Cotações para Facilities • Dados persistidos com segurança local.
          </p>
        </footer>

        {/* Warning Modal for Material de Limpeza Extra */}
        {showLimpezaExtraPrompt && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-fade-in print:hidden">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 flex flex-col gap-4 animate-scale-in">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200 shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                    Simulação de Categoria Recomendada
                  </h3>
                  <p className="text-[11px] text-slate-550 font-bold leading-relaxed">
                    Você está na categoria <strong className="text-[#FF2E63]">MATERIAL DE LIMPEZA</strong>, mas possui <strong className="font-extrabold text-slate-800">{items.filter(it => it.quantity > 0).length} itens</strong> para compra.
                  </p>
                  <p className="text-[11px] text-slate-550 font-bold leading-relaxed mt-1">
                    Como há <strong className="text-slate-800">menos de 8 itens</strong> ativos, recomendamos mudar para a nova categoria <strong className="text-slate-800">MATERIAL DE LIMPEZA EXTRA</strong>, que não exige o planejamento de Capacity.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50/45 border border-amber-100/60 rounded-xl p-3 text-[10.5px]/tight text-slate-650 font-bold">
                ⚠️ O painel lateral de planejamento por colaborador e suas curvas de preços permanecerão ocultos ao utilizar categorias extras.
              </div>

              <div className="flex gap-2.5 pt-1 border-t border-slate-100 mt-1">
                <button
                  type="button"
                  onClick={() => setShowLimpezaExtraPrompt(false)}
                  className="flex-1 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-black tracking-wide text-[10px] uppercase py-2.5 transition-all cursor-pointer text-center"
                >
                  Manter Atual
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToLimpezaExtra}
                  className="flex-1 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-black tracking-wide text-[10px] uppercase py-2.5 transition-all cursor-pointer shadow-md text-center"
                >
                  Sim, Mudar Categoria
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Consultant Drawer */}
        <AiConsultantDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          items={items}
          suppliers={suppliers}
          activeCategoryName={activeCategoryObj.name}
          archivedQuotes={archivedQuotes}
        />

        {/* PRINTING ASSISTANCE MODAL FOR IFRAME / SANDBOX INTEGRATION */}
        {showPrintModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-fade-in print:hidden">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-5 animate-scale-in text-slate-800 relative">
              <button 
                onClick={() => setShowPrintModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-600 transition-colors cursor-pointer"
                title="Fechar ajuda de impressão"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center space-y-1.5">
                <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mx-auto">
                  <Printer className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">
                  Guia para Impressão Completa
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Dispositivo de Segurança do Google AI Studio
                </p>
              </div>

              <div className="space-y-3 text-[11px] text-slate-600 leading-relaxed font-semibold">
                <p>
                  Por estar em uma janela integrada para testes (iframe do AI Studio), o navegador bloqueia a abertura direta da janela de impressão.
                </p>
                <p className="p-2.5 rounded-xl border border-rose-100 bg-rose-50/40 text-[#FF2E63] font-bold">
                  Para gerar o PDF completo com todas as páginas perfeitamente, por favor utilize uma das seguintes alternativas:
                </p>
                
                <div className="space-y-2.5 pl-1.5 list-none">
                  <div className="flex items-start gap-2">
                    <span className="h-4 w-4 rounded-full bg-slate-150 flex items-center justify-center text-slate-600 text-[10px] font-bold shrink-0 mt-0.5">1</span>
                    <p>
                      <strong>Abrir em Tela Cheia (Recomendado):</strong> Clique no botão azul fúcsia abaixo para abrir o app em tela inteira em uma nova guia, e depois clique em <strong>IMPRIMIR</strong> para gerar o relatório direto.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="h-4 w-4 rounded-full bg-slate-150 flex items-center justify-center text-slate-600 text-[10px] font-bold shrink-0 mt-0.5">2</span>
                    <p>
                      <strong>Teclas do Teclado:</strong> Simplesmente pressione <strong>Ctrl + P</strong> (ou <strong>⌘ + P</strong> no Mac) no teclado agora mesmo para acionar a impressão direta por cima da janela!
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setShowPrintModal(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#252A34] hover:bg-slate-800 text-white py-3 text-[11px] font-black tracking-wider uppercase shadow-md transition-all duration-200 cursor-pointer text-center"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir App em Nova Aba para Imprimir
                </a>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="rounded-full border border-slate-200 hover:bg-slate-50 text-slate-500 font-black tracking-wide text-[10px] uppercase py-2 transition-all cursor-pointer text-center"
                >
                  Fechar e Imprimir por Teclado
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MEI/AUTÔNOMO CONTRACTING SPREADSHEET MODAL */}
        <MeiContractModal
          isOpen={isMeiModalOpen}
          onClose={() => setIsMeiModalOpen(false)}
          visualTheme={visualTheme}
        />

        {/* INTELLIGENT READING (LEITURA INTELIGENTE) MODAL */}
        <IntelligentReadingModal
          isOpen={isIntelligentReadingOpen}
          onClose={() => setIsIntelligentReadingOpen(false)}
          items={items}
          onMarkItemsAsBought={handleMarkItemsAsBought}
        />

        {/* TERMS OF RESPONSIBILITY MODAL */}
        <TermsResponsibilityModal
          isOpen={isTermsModalOpen}
          onClose={() => setIsTermsModalOpen(false)}
          visualTheme={visualTheme}
        />

        {/* APRENDIZES MODAL */}
        <AprendizContractModal
          isOpen={isAprendizModalOpen}
          onClose={() => setIsAprendizModalOpen(false)}
          visualTheme={visualTheme}
        />

        {/* RECIBO SIMPLIFICADO MODAL */}
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          visualTheme={visualTheme}
        />

        {/* ARQUIVO DIGITAL MODAL */}
        <FileArchiveModal
          isOpen={isFileArchiveOpen}
          onClose={() => setIsFileArchiveOpen(false)}
        />

        {/* GITHUB DIAGNOSTICS & OFFLINE DATA BACKUP MODAL */}
        <GithubTroubleshooterModal
          isOpen={isGithubModalOpen}
          onClose={() => setIsGithubModalOpen(false)}
          userName={userName}
          userCpf={userCpf}
          archivedQuotes={archivedQuotes}
          categories={categories}
          suppliers={suppliers}
          items={items}
          capacityRows={capacityRows}
          onRestoreBackup={handleRestoreBackup}
        />

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog((prev) => ({ ...prev, isOpen: false })); }}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
        />
      </div>
    </div>
  );
}

// Helper to check if two lists of QuoteItems are equal (same names, quantities, and supplier unit prices)
function areQuoteItemsEqual(itemsA: any[], itemsB: any[]): boolean {
  if (!itemsA || !itemsB || itemsA.length !== itemsB.length) return false;
  
  const sortedA = [...itemsA].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const sortedB = [...itemsB].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  
  for (let i = 0; i < sortedA.length; i++) {
    const itemA = sortedA[i];
    const itemB = sortedB[i];
    
    if (itemA.name !== itemB.name) return false;
    if (itemA.quantity !== itemB.quantity) return false;
    
    const pricesA = itemA.prices || {};
    const pricesB = itemB.prices || {};
    const keysA = Object.keys(pricesA);
    const keysB = Object.keys(pricesB);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const supplierId of keysA) {
      if (pricesA[supplierId] !== pricesB[supplierId]) {
        return false;
      }
    }
  }
  
  return true;
}
