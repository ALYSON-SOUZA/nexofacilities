import React, { useState, useRef, useEffect } from "react";
import { Supplier, QuoteItem } from "../types";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Check, 
  AlertTriangle, 
  HelpCircle, 
  ClipboardCheck, 
  Sparkles, 
  Loader2, 
  FileCode,
  Building2,
  X,
  Plus,
  Table
} from "lucide-react";
import { formatCurrency } from "../utils";

// Robust text row parsing helper for backwards compatibility
export function parseRawLine(line: string): { name: string; quantity: number } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Split by common delimiters (semicolon, tab, pipe)
  const parts = trimmed.split(/[;\t|]+/);
  if (parts.length >= 2) {
    const firstNumStr = parts[0].trim().replace(/\./g, "").replace(",", ".");
    const firstNum = parseInt(firstNumStr, 10);
    const lastNumStr = parts[parts.length - 1].trim().replace(/\./g, "").replace(",", ".");
    const lastNum = parseInt(lastNumStr, 10);

    // Is first part just a clean number? (e.g. "10 \t Papel Higiênico")
    if (!isNaN(firstNum) && parts[0].trim().match(/^\d+$/)) {
      const name = parts.slice(1).join(" ").trim();
      if (name.length > 1) return { name, quantity: firstNum };
    }
    // Is last part just a clean number? (e.g. "Papel Higiênico \t 10")
    if (!isNaN(lastNum) && parts[parts.length - 1].trim().match(/^\d+$/)) {
      const name = parts.slice(0, -1).join(" ").trim();
      if (name.length > 1) return { name, quantity: lastNum };
    }
  }

  // Split by commas
  const commaParts = trimmed.split(",");
  if (commaParts.length >= 2) {
    const lastPart = commaParts[commaParts.length - 1].trim();
    const qty = parseInt(lastPart, 10);
    if (!isNaN(qty) && lastPart.match(/^\d+$/)) {
      const name = commaParts.slice(0, -1).join(",").trim();
      if (name.length > 1) return { name, quantity: qty };
    }
  }

  // Regex matches:
  // "10x Desinfetante" or "10 x Desinfetante"
  const xMatch = trimmed.match(/^(\d+)\s*[xX]\s*(.+)$/);
  if (xMatch) {
    return { name: xMatch[2].trim(), quantity: parseInt(xMatch[1], 10) };
  }

  // Heading number "10 Desinfetante 5L"
  const leadingMatch = trimmed.match(/^(\d+)\s+([a-zA-Z\u00C0-\u00FF].+)$/);
  if (leadingMatch) {
    return { name: leadingMatch[2].trim(), quantity: parseInt(leadingMatch[1], 10) };
  }

  // Trailing number "Desinfetante 5L 10"
  const trailingMatch = trimmed.match(/^(.+?)\s+(\d+)$/);
  if (trailingMatch) {
    const qty = parseInt(trailingMatch[2], 10);
    // Ensure the product name is reasonable
    if (trailingMatch[1].trim().length > 1) {
      return { name: trailingMatch[1].trim(), quantity: qty };
    }
  }

  // Default fallback if we just see a row of text (assume qty 1)
  if (trimmed.length > 2) {
    return { name: trimmed, quantity: 1 };
  }

  return null;
}

interface FileImporterProps {
  suppliers: Supplier[];
  items: QuoteItem[];
  onImportItems: (items: { name: string; quantity: number }[], replaceCurrent: boolean) => void;
  onApplyImportProposal: (newSuppliers: Supplier[], newItems: QuoteItem[]) => void;
  onClose: () => void;
}

interface ExtractedItem {
  name: string;
  quantity: number;
  unitPrice: number;
  pendingReview?: boolean;
  reviewReason?: string;
}

interface ExtractedSupplier {
  name: string;
  cnpj?: string;
  phone?: string;
  vendedor?: string;
  items: ExtractedItem[];
}

export interface AuditedItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  pendingReview: boolean;
  reviewReason: string;
  matchedItemId: string | null;
  status: "pending" | "new_item" | "divergent" | "unchanged";
  oldPrice: number | null;
  selectedToApply: boolean;
}

export interface AuditedSupplier {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  vendedor?: string;
  isNew: boolean;
  matchedSupplierId: string | null;
  selectedToApply: boolean;
  items: AuditedItem[];
}

export default function FileImporter({ 
  suppliers, 
  items, 
  onImportItems, 
  onApplyImportProposal, 
  onClose 
}: FileImporterProps) {
  const [importMode, setImportMode] = useState<"file" | "paste">("file");
  const [pasteText, setPasteText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string>("");
  
  // Audited state containing live analysis results
  const [auditedSuppliers, setAuditedSuppliers] = useState<AuditedSupplier[]>([]);
  const [isTableReviewOpen, setIsTableReviewOpen] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Audit Engine to run real-time comparison rules against existing quote state
  const runLiveAudit = (currentAuditedSuppliers: AuditedSupplier[]): AuditedSupplier[] => {
    return currentAuditedSuppliers.map((audSup) => {
      // RN01: Identificar se o fornecedor já existe
      const normalizedSupName = audSup.name.trim().toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .replace(/(LTDA|S\/A|S\.A\.|LIMITADA|ME|EPP|DISTRIBUIDORA)/gi, "").trim();

      const matchedSupplier = suppliers.find((s) => {
        const sNormalized = s.name.toUpperCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .replace(/(LTDA|S\/A|S\.A\.|LIMITADA|ME|EPP|DISTRIBUIDORA)/gi, "").trim();
        return sNormalized === normalizedSupName || sNormalized.includes(normalizedSupName) || normalizedSupName.includes(sNormalized);
      });

      const isNew = !matchedSupplier;
      const matchedSupplierId = matchedSupplier ? matchedSupplier.id : null;

      const updatedItems = audSup.items.map((item) => {
        const normalizedItemName = item.name.trim().toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ");

        // Match item with active ones in quotation spreadsheet
        const matchedItem = items.find((it) => {
          const itNormalized = it.name.trim().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ");
          return itNormalized === normalizedItemName || itNormalized.includes(normalizedItemName) || normalizedItemName.includes(itNormalized);
        });

        const matchedItemId = matchedItem ? matchedItem.id : null;
        let status: "pending" | "new_item" | "divergent" | "unchanged" = "new_item";
        let oldPrice: number | null = null;
        let pendingReview = item.pendingReview;
        let reviewReason = item.reviewReason;

        // RN06: Check if price or description was corrected by the user manually, clear pending if so
        if (item.unitPrice > 0 && item.name.trim().length >= 2 && pendingReview) {
          pendingReview = false;
          reviewReason = "";
        }

        // Apply strict logic rule classifications
        if (!item.name || item.name.trim().length < 2 || item.unitPrice === undefined || item.unitPrice === null || item.unitPrice <= 0) {
          pendingReview = true;
          status = "pending";
          if (!reviewReason) {
            reviewReason = "Preço unitário zerado ou descrição inválida.";
          }
        } else if (pendingReview) {
          status = "pending";
        } else if (matchedItemId) {
          // Item exists
          if (matchedSupplierId) {
            oldPrice = matchedItem.prices[matchedSupplierId] ?? null;
            // RN03: Different price
            if (oldPrice === null || oldPrice !== item.unitPrice) {
              status = "divergent";
            } else {
              // RN04: Same price
              status = "unchanged";
            }
          } else {
            // New supplier, so first-time price on existing item counts as divergent (new value)
            status = "divergent";
          }
        } else {
          // RN05: Completely brand new item
          status = "new_item";
        }

        return {
          ...item,
          pendingReview,
          reviewReason,
          matchedItemId,
          status,
          oldPrice,
        };
      });

      return {
        ...audSup,
        isNew,
        matchedSupplierId,
        items: updatedItems,
      };
    });
  };

  // Convert raw payload into audited structures
  const initializeAuditedSuppliers = (extracted: ExtractedSupplier[]) => {
    const preAudited = extracted.map((s) => {
      const auditedItems = s.items.map((item, index) => {
        return {
          id: `item_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
          name: item.name,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          pendingReview: !!item.pendingReview,
          reviewReason: item.reviewReason || "",
          matchedItemId: null,
          status: "new_item" as any,
          oldPrice: null,
          selectedToApply: !item.pendingReview, // select by default if not pending review
        };
      });

      return {
        id: `sup_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: s.name.toUpperCase(),
        cnpj: s.cnpj,
        phone: s.phone,
        vendedor: s.vendedor,
        isNew: true,
        matchedSupplierId: null,
        selectedToApply: true,
        items: auditedItems,
      };
    });

    setAuditedSuppliers(runLiveAudit(preAudited));
    setIsTableReviewOpen(true);
  };

  // Capture global drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Global listener for copy-pasting images or other files directly in the modal workspace
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === "INPUT" || activeElement?.tagName === "TEXTAREA";
      
      const clipboardItems = e.clipboardData?.items;
      if (clipboardItems) {
        for (let i = 0; i < clipboardItems.length; i++) {
          const item = clipboardItems[i];
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              const isImage = file.name === "image.png" || file.name === "blob" || file.type?.startsWith("image/");
              await processFile(file, isImage ? "image" : undefined);
              return;
            }
          }
        }
      }

      // Populate text paste area if clipboard is text and we are not focusing an input
      if (!isInput && importMode === "paste" && clipboardItems) {
        for (let i = 0; i < clipboardItems.length; i++) {
          const item = clipboardItems[i];
          if (item.type === "text/plain") {
            item.getAsString((text) => {
              setPasteText(text);
              handleAnalyzeTextContent(text);
            });
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => {
      window.removeEventListener("paste", handleGlobalPaste);
    };
  }, [importMode]);

  // Master file processor
  const processFile = async (file: File, overrideFileType?: string) => {
    setIsLoading(true);
    setLoadingStep("Lendo arquivo comercial...");
    setErrorStatus("");

    try {
      let fileType = "";
      const extension = file.name.split(".").pop()?.toLowerCase() || "";

      if (overrideFileType) {
        fileType = overrideFileType;
      } else if (["png", "jpg", "jpeg", "webp"].includes(extension) || file.type?.startsWith("image/")) {
        fileType = "image";
      } else if (extension === "pdf" || file.type === "application/pdf") {
        fileType = "pdf";
      } else if (extension === "csv" || file.type === "text/csv") {
        fileType = "csv";
      } else if (extension === "txt" || file.type === "text/plain") {
        fileType = "text";
      } else if (["xls", "xlsx"].includes(extension) || file.type?.includes("spreadsheet") || file.type?.includes("excel")) {
        fileType = "excel";
      } else if (["doc", "docx"].includes(extension) || file.type?.includes("word") || file.type?.includes("officedocument.wordprocessingml")) {
        fileType = "docx";
      } else {
        // RN08: Formato não suportado
        setErrorStatus(`Formato ".${extension || "desconhecido"}" de arquivo não suportado. Envie uma Imagem (JPG, PNG, WEBP), PDF, Excel (XLSX, XLS), Word (DOCX), CSV ou TXT.`);
        setIsLoading(false);
        return;
      }

      setLoadingStep("Processando e convertendo dados do arquivo...");
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result as string;

        try {
          setLoadingStep("A IA do Gemini está analisando e lendo a proposta do fornecedor...");
          
          const res = await fetch("/api/gemini/parse-supplier-proposal", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileType,
              base64Data,
              fileName: file.name
            }),
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Erro ao consultar a extração de proposta por IA.");
          }

          const parsed = await res.json();
          if (parsed.suppliers && Array.isArray(parsed.suppliers) && parsed.suppliers.length > 0) {
            initializeAuditedSuppliers(parsed.suppliers);
            if (parsed.warning) {
              setErrorStatus(parsed.warning);
            }
          } else if (parsed.warning) {
            setErrorStatus(parsed.warning);
          } else {
            setErrorStatus("A IA não conseguiu identificar propostas válidas neste arquivo. Experimente colar os valores como texto.");
          }
        } catch (apiErr: any) {
          setErrorStatus(apiErr.message || "Erro de comunicação com o assistente de IA da BP-COMPRAS.");
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        setErrorStatus("Não foi possível carregar o arquivo físico do dispositivo.");
        setIsLoading(false);
      };

    } catch (err: any) {
      setErrorStatus("Erro interno de processamento: " + err.message);
      setIsLoading(false);
    }
  };

  // Analyze plain text directly pasted
  const handleAnalyzeTextContent = async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) return;
    setIsLoading(true);
    setErrorStatus("");
    setLoadingStep("A IA está interpretando e auditando o texto colado...");

    try {
      const base64Data = btoa(unescape(encodeURIComponent(textToAnalyze)));
      const res = await fetch("/api/gemini/parse-supplier-proposal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
            },
        body: JSON.stringify({
          fileType: "text",
          base64Data,
          fileName: "texto_colado.txt"
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Falha ao processar texto por IA.");
      }

      const parsed = await res.json();
      if (parsed.suppliers && Array.isArray(parsed.suppliers) && parsed.suppliers.length > 0) {
        initializeAuditedSuppliers(parsed.suppliers);
        if (parsed.warning) {
          setErrorStatus(parsed.warning);
        }
      } else if (parsed.warning) {
        setErrorStatus(parsed.warning);
      } else {
        setErrorStatus("A IA não encontrou dados de orçamento ou fornecedor estruturado no texto digitado.");
      }
    } catch (apiErr: any) {
      setErrorStatus(apiErr.message || "Erro ao consultar o assistente inteligente de IA.");
    } finally {
      setIsLoading(false);
    }
  };

  // Live fields editing inside the audit preview list
  const handleItemFieldUpdate = (supplierId: string, itemId: string, field: "name" | "quantity" | "unitPrice", value: any) => {
    setAuditedSuppliers((prev) => {
      const updated = prev.map((s) => {
        if (s.id === supplierId) {
          const itemsUpdated = s.items.map((it) => {
            if (it.id === itemId) {
              let parsedVal = value;
              if (field === "quantity") {
                parsedVal = value === "" ? 1 : Math.max(1, parseInt(value, 10));
              } else if (field === "unitPrice") {
                parsedVal = value === "" ? 0 : parseFloat(value);
              }
              return {
                ...it,
                [field]: parsedVal,
              };
            }
            return it;
          });
          return {
            ...s,
            items: itemsUpdated,
          };
        }
        return s;
      });
      return runLiveAudit(updated);
    });
  };

  const handleSupplierFieldUpdate = (supplierId: string, field: "name" | "phone" | "vendedor", value: string) => {
    setAuditedSuppliers((prev) => {
      const updated = prev.map((s) => {
        if (s.id === supplierId) {
          return {
            ...s,
            [field]: value,
          };
        }
        return s;
      });
      return runLiveAudit(updated);
    });
  };

  const handleToggleItemSelection = (supplierId: string, itemId: string) => {
    setAuditedSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === supplierId) {
          return {
            ...s,
            items: s.items.map((it) =>
              it.id === itemId ? { ...it, selectedToApply: !it.selectedToApply } : it
            ),
          };
        }
        return s;
      })
    );
  };

  const handleToggleSupplierSelection = (supplierId: string) => {
    setAuditedSuppliers((prev) =>
      prev.map((s) =>
        s.id === supplierId ? { ...s, selectedToApply: !s.selectedToApply } : s
      )
    );
  };

  const handleRemoveItem = (supplierId: string, itemId: string) => {
    setAuditedSuppliers((prev) => {
      const updated = prev.map((s) => {
        if (s.id === supplierId) {
          return {
            ...s,
            items: s.items.filter((it) => it.id !== itemId),
          };
        }
        return s;
      });
      return runLiveAudit(updated);
    });
  };

  const handleAddBlankRow = (supplierId: string) => {
    setAuditedSuppliers((prev) => {
      const updated = prev.map((s) => {
        if (s.id === supplierId) {
          return {
            ...s,
            items: [
              ...s.items,
              {
                id: `blank_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: "Novo Item de Proposta",
                quantity: 1,
                unitPrice: 0,
                pendingReview: true,
                reviewReason: "Preencha a descrição e preço unitário para incluir.",
                matchedItemId: null,
                status: "pending" as any,
                oldPrice: null,
                selectedToApply: true,
              }
            ]
          };
        }
        return s;
      });
      return runLiveAudit(updated);
    });
  };

  // Confirm changes and merge into the active quote state in App.tsx
  const handleConfirmMerge = () => {
    // RN07: Se cancelou ou fechou sem confirmar, nada acontece. Se confirmou, faz a fusão!
    let updatedSuppliers = [...suppliers];
    let updatedItems = [...items];

    auditedSuppliers.forEach((audSup) => {
      if (!audSup.selectedToApply) return;

      let targetSupplierId = audSup.matchedSupplierId;

      // RN02: Fornecedor Novo
      if (audSup.isNew || !targetSupplierId) {
        targetSupplierId = `s_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newSup: Supplier = {
          id: targetSupplierId,
          name: audSup.name.trim().toUpperCase(),
          phone: audSup.phone,
          vendedor: audSup.vendedor,
        };
        updatedSuppliers.push(newSup);

        // Pre-initialize price records on all existing items for this new supplier
        updatedItems = updatedItems.map((item) => ({
          ...item,
          prices: {
            ...item.prices,
            [targetSupplierId!]: null,
          },
        }));
      } else {
        // Fornecedor Existente: update contact records if new data came
        updatedSuppliers = updatedSuppliers.map((s) => {
          if (s.id === targetSupplierId) {
            return {
              ...s,
              phone: audSup.phone || s.phone,
              vendedor: audSup.vendedor || s.vendedor,
            };
          }
          return s;
        });
      }

      // Process items for this supplier
      audSup.items.forEach((audItem) => {
        if (!audItem.selectedToApply) return;
        if (audItem.pendingReview && audItem.unitPrice <= 0) return; // skip uncorrected errors

        let targetItemId = audItem.matchedItemId;

        if (!targetItemId) {
          // RN05: Item novo para o fornecedor (e para a planilha como um todo)
          targetItemId = `i_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          
          const pricesMap: Record<string, number | null> = {};
          updatedSuppliers.forEach((s) => {
            pricesMap[s.id] = null;
          });
          pricesMap[targetSupplierId!] = audItem.unitPrice;

          const newQuoteItem: QuoteItem = {
            id: targetItemId,
            name: audItem.name.trim(),
            quantity: audItem.quantity || 1,
            prices: pricesMap,
            observation: "",
            comprado: false,
          };
          updatedItems.push(newQuoteItem);
        } else {
          // RN03: Item já existente, atualiza seu preço para este fornecedor
          updatedItems = updatedItems.map((item) => {
            if (item.id === targetItemId) {
              const updatedPrices = { ...item.prices };
              updatedPrices[targetSupplierId!] = audItem.unitPrice;
              
              // Se o item original não possuía quantidade coerente, podemos atualizar
              return {
                ...item,
                prices: updatedPrices,
              };
            }
            return item;
          });
        }
      });
    });

    onApplyImportProposal(updatedSuppliers, updatedItems);
  };

  const fileFileInputClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div id="smart-import-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-md w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* Header bar styled precisely like Header.tsx fuchsia highlights */}
        <div className="bg-[#1E222B] text-white p-4 flex items-center justify-between border-b-4 border-[#ff2a6d] shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-[#ff2a6d] text-white font-black text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-sm flex items-center gap-1 animate-pulse">
              <Sparkles className="h-3 w-3 shrink-0" /> IMPORTAÇÃO INTELIGENTE VIA IA
            </span>
            <h3 className="text-sm font-black tracking-tight uppercase">Smart Import de Propostas Comerciais</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-slate-800 hover:bg-[#ff2a6d] text-slate-300 hover:text-white transition-all cursor-pointer text-xs font-black font-mono px-2.5"
          >
            FECHAR ✕
          </button>
        </div>

        {/* Workspace Dual Core Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 overflow-y-auto flex-1 min-h-[350px]">
          
          {/* LEFT SIDE: Selection & Upload Panels (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col space-y-3 shrink-0 border-r border-slate-100 pr-2">
            
            {/* Tab navigation */}
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setImportMode("file"); setErrorStatus(""); }}
                className={`py-2 text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-tight ${
                  importMode === "file" ? "bg-[#1E222B] text-white shadow-xs" : "text-slate-500 hover:text-slate-950"
                }`}
              >
                <Upload className="h-3.5 w-3.5 text-[#ff2a6d]" />
                Anexar Proposta
              </button>
              <button
                type="button"
                onClick={() => { setImportMode("paste"); setErrorStatus(""); }}
                className={`py-2 text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-tight ${
                  importMode === "paste" ? "bg-[#1E222B] text-white shadow-xs" : "text-slate-500 hover:text-slate-950"
                }`}
              >
                <FileText className="h-3.5 w-3.5 text-[#ff2a6d]" />
                Copiar e Colar
              </button>
            </div>

            {/* ERROR DISPLAY */}
            {errorStatus && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-950 rounded-xl flex gap-2 text-[11px]/snug font-bold animate-fade-in">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <p>{errorStatus}</p>
              </div>
            )}

            {/* LOADING STATE DISPLAY */}
            {isLoading && (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="h-8 w-8 text-[#ff2a6d] animate-spin" />
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Leitura Inteligente por IA</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-[240px]">{loadingStep}</p>
                </div>
              </div>
            )}

            {/* RENDER ACCORDING TO THE MODE SELECTED */}
            {!isLoading && (
              importMode === "file" ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={fileFileInputClick}
                  className={`showcase-hero p-8 sm:p-10 text-center flex flex-col items-center justify-center space-y-4 cursor-pointer select-none transition-all h-[280px] sm:h-[300px] ${
                    dragActive 
                      ? "showcase-hero-active" 
                      : ""
                  }`}
                >
                  <div className="showcase-icon showcase-icon-pink" style={{ width: 56, height: 56 }}>
                    <Upload className="h-7 w-7" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="showcase-title-sm">Arraste ou clique para enviar</p>
                    <p className="showcase-subtitle px-2">
                      Imagens, PDF, Excel, Word, CSV ou TXT
                    </p>
                  </div>
                  <button
                    type="button"
                    className="showcase-btn-primary rounded-full px-5 py-2.5 text-[11px] font-bold tracking-wider uppercase"
                  >
                    Procurar no Computador
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt,.pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </div>
              ) : (
                <div className="flex flex-col space-y-2 flex-1">
                  <label className="showcase-label block leading-none">
                    Área de Colagem (Imagem ou Texto)
                  </label>
                  <p className="showcase-subtitle leading-normal">
                    Selecione a tabela da proposta comercial e dê <strong>Ctrl+C</strong>, depois clique no campo abaixo e dê <strong>Ctrl+V</strong> para a IA processar!
                  </p>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={`Exemplo de proposta comercial colada:
Fornecedor: ELO DISTRIB
CNPJ: 12.345.678/0001-90

Item 1: Papel Toalha 2 Dobras, 3 pacotes, R$ 35,00
Item 2: Pano de Chão Alvejado, 4 un, R$ 8,20`}
                    className="w-full h-[150px] p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-[11px] font-mono focus:ring-0 focus:outline-[#ff2a6d] resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAnalyzeTextContent(pasteText)}
                    disabled={!pasteText.trim()}
                    className={`w-full py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs transition-all ${
                      pasteText.trim()
                        ? "showcase-btn-primary cursor-pointer"
                        : "bg-slate-200 text-slate-450 cursor-not-allowed"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Analisar Proposta com IA
                  </button>
                </div>
              )
            )}

            {/* Guide Info */}
            <div className="p-3 bg-slate-50 rounded-[14px] text-[11px]/relaxed border border-slate-150 font-semibold text-slate-650 leading-relaxed">
              <span className="font-bold flex items-center gap-1 text-slate-950 border-b border-slate-200 pb-1 mb-1.5 text-[11px] uppercase">
                <HelpCircle className="h-3.5 w-3.5 text-[#ff2a6d]" /> Regras Integradas (RN01-RN09)
              </span>
              <ul className="list-disc pl-3.5 space-y-1 text-[11px]/relaxed text-slate-500 font-medium">
                <li><strong>Identificação automática</strong> do Fornecedor por similaridade (CNPJ/Nome).</li>
                <li><strong>Divergências de preços</strong> comparadas e destacadas para aprovação (RN03).</li>
                <li><strong>Novos produtos</strong> adicionados sem duplicidade silenciosa (RN04/RN05).</li>
                <li><strong>Campos com pendência</strong> editáveis diretamente na lista de auditoria (RN06).</li>
              </ul>
            </div>
          </div>

          {/* RIGHT SIDE: Dynamic Preview List for Auditing (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col border border-slate-200 bg-slate-50/40 rounded-[20px] overflow-hidden">
            
            {/* Header of Audit Review */}
            <div className="bg-slate-100 p-3 flex items-center justify-between border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1E222B] text-white text-[11px] font-mono font-black">
                  {auditedSuppliers.length}
                </span>
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Painel de Auditoria de Orçamentos por Fornecedor</span>
              </div>
              {auditedSuppliers.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsTableReviewOpen(true)}
                    className="text-[11px] font-black text-[#ff2a6d] hover:text-[#c21e54] hover:underline cursor-pointer uppercase flex items-center gap-1"
                  >
                    <Table className="h-3.5 w-3.5" /> Abrir Tabela de Revisão
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setAuditedSuppliers([])}
                    className="text-[11px] font-black text-rose-600 hover:text-rose-800 hover:underline cursor-pointer uppercase"
                  >
                    Descartar Tudo
                  </button>
                </div>
              )}
            </div>

            {/* Audited List Container */}
            <div className="flex-1 overflow-y-auto max-h-[440px] p-4 space-y-4 min-h-[300px]">
              {auditedSuppliers.length > 0 ? (
                auditedSuppliers.map((audSup) => (
                  <div key={audSup.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    
                    {/* Supplier Card Header */}
                    <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={audSup.selectedToApply}
                          onChange={() => handleToggleSupplierSelection(audSup.id)}
                          className="h-4 w-4 rounded-sm text-[#ff2a6d] focus:ring-[#ff2a6d] cursor-pointer"
                          title="Marcar para importar esta proposta"
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500"><Building2 className="h-4 w-4" /></span>
                            <input
                              type="text"
                              value={audSup.name}
                              onChange={(e) => handleSupplierFieldUpdate(audSup.id, "name", e.target.value)}
                              className="text-xs font-black text-slate-900 uppercase focus:outline-hidden border-b border-transparent hover:border-slate-300 focus:border-[#ff2a6d] bg-transparent leading-none p-0.5 max-w-[250px]"
                              placeholder="NOME DO FORNECEDOR"
                            />
                            {audSup.isNew ? (
                              <span className="bg-emerald-100 text-emerald-850 font-black text-[11px] uppercase px-1.5 py-0.5 rounded-sm tracking-tight border border-emerald-200">
                                ✨ Fornecedor Novo (RN02)
                              </span>
                            ) : (
                              <span className="bg-[#ff2a6d]/10 text-[#111c2e] font-black text-[11px] uppercase px-1.5 py-0.5 rounded-sm tracking-tight border border-[#ff2a6d]/20">
                                🏢 Cadastrado (RN01)
                              </span>
                            )}
                          </div>
                          
                          {/* Supplier extra details */}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-450 font-semibold uppercase">
                            {audSup.cnpj && (
                              <span>CNPJ: {audSup.cnpj}</span>
                            )}
                            <div className="flex items-center gap-1">
                              <span>Fone:</span>
                              <input
                                type="text"
                                value={audSup.phone || ""}
                                onChange={(e) => handleSupplierFieldUpdate(audSup.id, "phone", e.target.value)}
                                className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#ff2a6d] outline-hidden p-0 font-bold max-w-[100px] text-slate-700"
                                placeholder="Não informado"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span>Vendedor:</span>
                              <input
                                type="text"
                                value={audSup.vendedor || ""}
                                onChange={(e) => handleSupplierFieldUpdate(audSup.id, "vendedor", e.target.value)}
                                className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#ff2a6d] outline-hidden p-0 font-bold max-w-[100px] text-slate-700"
                                placeholder="Não informado"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddBlankRow(audSup.id)}
                        className="text-[11px] font-black text-emerald-600 hover:text-emerald-800 flex items-center gap-1 border border-emerald-200 rounded-full px-2.5 py-1 hover:bg-emerald-50 cursor-pointer"
                      >
                        <Plus className="h-3 w-3 text-emerald-500" /> Adicionar Item
                      </button>
                    </div>

                    {/* Items table under this supplier */}
                    <div className="p-2 space-y-1.5">
                      {audSup.items.length > 0 ? (
                        audSup.items.map((audItem) => {
                          // Styling per status
                          let statusTag = "";
                          let rowBorder = "border-slate-150";
                          let applyChecked = audItem.selectedToApply;

                          if (audItem.status === "pending") {
                            statusTag = "⚠️ Pendente de Revisão (RN06)";
                            rowBorder = "border-rose-300 bg-rose-50/20";
                          } else if (audItem.status === "new_item") {
                            statusTag = "➕ Novo Item (RN05)";
                            rowBorder = "border-emerald-200 bg-emerald-50/5";
                          } else if (audItem.status === "divergent") {
                            statusTag = "🔄 Divergência de Valor (RN03)";
                            rowBorder = "border-amber-300 bg-amber-50/5";
                          } else {
                            statusTag = "🆗 Inalterado (RN04)";
                            rowBorder = "border-slate-200 bg-slate-50/10 opacity-75";
                          }

                          return (
                            <div 
                              key={audItem.id} 
                              className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-2.5 rounded-xl border ${rowBorder} transition-all shadow-3xs`}
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={applyChecked}
                                  onChange={() => handleToggleItemSelection(audSup.id, audItem.id)}
                                  className="h-3.5 w-3.5 rounded-sm text-[#ff2a6d] focus:ring-[#ff2a6d] cursor-pointer shrink-0"
                                  title="Selecionar para importar este item"
                                />
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <input
                                      type="text"
                                      value={audItem.name}
                                      onChange={(e) => handleItemFieldUpdate(audSup.id, audItem.id, "name", e.target.value)}
                                      className="font-bold text-slate-800 text-[11px] p-0.5 border-b border-transparent hover:border-slate-300 focus:border-[#ff2a6d] outline-hidden bg-transparent flex-1 min-w-[150px]"
                                    />
                                    
                                    {/* Status Label Tag */}
                                    <span className={`text-[11px] font-black uppercase px-1.5 py-0.5 rounded-sm shrink-0 border ${
                                      audItem.status === "pending" ? "bg-rose-100 text-rose-800 border-rose-200 animate-pulse" :
                                      audItem.status === "new_item" ? "bg-emerald-100 text-emerald-850 border-emerald-200" :
                                      audItem.status === "divergent" ? "bg-amber-100 text-amber-850 border-amber-200" :
                                      "bg-slate-150 text-slate-500 border-slate-200"
                                    }`}>
                                      {statusTag}
                                    </span>
                                  </div>

                                  {/* Error/Warning note if pending, or comparison info */}
                                  {audItem.status === "pending" && audItem.reviewReason && (
                                    <p className="text-[11px] text-rose-600 font-semibold mt-0.5 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3 shrink-0" /> {audItem.reviewReason}
                                    </p>
                                  )}

                                  {audItem.status === "divergent" && audItem.oldPrice !== null && (
                                    <p className="text-[11px] text-slate-500 font-bold mt-1">
                                      Divergência detectada: <span className="line-through text-slate-500">{formatCurrency(audItem.oldPrice)}</span> ➔ <span className="text-[#ff2a6d] font-black">{formatCurrency(audItem.unitPrice)}</span> (Valor da Proposta)
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Qty and Price Inputs */}
                              <div className="flex items-center gap-3 shrink-0 self-end md:self-auto pl-6 md:pl-0">
                                <div className="flex items-center gap-1 text-[11px]">
                                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">QTD:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={audItem.quantity}
                                    onChange={(e) => handleItemFieldUpdate(audSup.id, audItem.id, "quantity", e.target.value)}
                                    className="w-10 text-center rounded-sm border border-slate-200 py-0.5 text-[11px] font-extrabold text-[#ff2a6d] focus:outline-[#ff2a6d]"
                                  />
                                </div>

                                <div className="flex items-center gap-1 text-[11px]">
                                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">R$ Unit:</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={audItem.unitPrice || ""}
                                    onChange={(e) => handleItemFieldUpdate(audSup.id, audItem.id, "unitPrice", e.target.value)}
                                    className="w-16 text-center rounded-sm border border-slate-200 py-0.5 text-[11px] font-extrabold text-slate-900 focus:outline-[#ff2a6d]"
                                    placeholder="R$ 0,00"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(audSup.id, audItem.id)}
                                  className="text-slate-350 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-sm cursor-pointer transition-colors"
                                  title="Ignorar este item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-[11px] text-slate-450 uppercase font-black">
                          Sem itens extraídos. Adicione manualmente ou re-envie a proposta.
                        </div>
                      )}
                    </div>

                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 text-slate-500 my-auto">
                  <Sparkles className="h-10 w-10 text-[#ff2a6d] mb-2 animate-bounce" />
                  <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Aguardando Proposta para Análise...</p>
                  <p className="text-[11px] max-w-[320px] text-slate-500 leading-relaxed mt-1 font-medium">
                    Arraste ou anexe uma proposta comercial (imagem/PDF/Excel) ou copie e cole o texto do orçamento do fornecedor na caixa de texto. O Gemini fará a leitura e auditoria instantaneamente!
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions of Dynamic Preview */}
            <div className="bg-slate-100 p-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-[11px]/normal text-slate-500 font-semibold max-w-[380px]">
                {auditedSuppliers.length > 0 && (
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" /> 
                    <span>Ao confirmar, os novos fornecedores e produtos serão adicionados, e os valores divergentes serão aplicados. Itens não-selecionados serão ignorados.</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-white hover:bg-slate-50 border border-slate-200 px-5 py-2 text-[11px] font-black tracking-wider uppercase transition-all shadow-3xs cursor-pointer text-slate-700"
                >
                  Cancelar (RN07)
                </button>

                {auditedSuppliers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsTableReviewOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 px-5 py-2.5 text-[11px] font-black tracking-wider uppercase transition-all shadow-3xs cursor-pointer text-slate-850"
                  >
                    <Table className="h-3.5 w-3.5 text-[#ff2a6d]" />
                    Visualizar em Tabela
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleConfirmMerge}
                  disabled={auditedSuppliers.length === 0 || !auditedSuppliers.some(s => s.selectedToApply)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-[11px] font-black tracking-wider uppercase transition-all shadow-md active:scale-98 ${
                    auditedSuppliers.length > 0 && auditedSuppliers.some(s => s.selectedToApply)
                      ? "bg-[#ff2a6d] hover:bg-[#c21e54] text-white cursor-pointer"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  CONFIRMAR E INSERIR NA COTAÇÃO
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

        {/* MODAL POPUP PARA REVISÃO EM FORMATO DE TABELA ESTILO PLANILHA */}
        {isTableReviewOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 print:hidden">
            <div className="bg-white rounded-[24px] border-2 border-[#ff2a6d] shadow-md w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up text-slate-800">
              
              {/* Modal Header */}
              <div className="bg-[#1E222B] text-white p-4 flex items-center justify-between border-b-4 border-[#ff2a6d] shrink-0">
                <div className="flex items-center gap-2">
                  <Table className="h-5 w-5 text-[#ff2a6d] shrink-0" />
                  <div>
                    <h3 className="text-sm font-black tracking-tight uppercase">Revisar Itens Extraídos pela IA</h3>
                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Edite as informações na tabela antes de confirmar a inclusão na cotação</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTableReviewOpen(false)}
                  className="p-1 rounded-full bg-slate-800 hover:bg-[#ff2a6d] text-slate-300 hover:text-white transition-all cursor-pointer text-xs font-black font-mono px-2.5"
                >
                  FECHAR ✕
                </button>
              </div>

              {/* Table Area (with internal scroll) */}
              <div className="p-3 sm:p-5 overflow-hidden flex-1 flex flex-col min-h-0 bg-slate-50">
                
                {/* Table wrapper for horizontal scroll when too narrow */}
                <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white shadow-3xs max-h-full">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-700 uppercase tracking-wider sticky top-0 z-10">
                        <th className="py-2.5 px-3 w-10 text-center">Ativar</th>
                        <th className="py-2.5 px-3 min-w-[150px]">Fornecedor</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Produto / Material</th>
                        <th className="py-2.5 px-3 w-24 text-center">Quantidade</th>
                        <th className="py-2.5 px-3 w-32 text-center">Valor Unitário</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Status / Alerta</th>
                        <th className="py-2.5 px-3 w-14 text-center">Excluir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-xs">
                      {auditedSuppliers.length > 0 ? (
                        auditedSuppliers.flatMap((audSup) => 
                          audSup.items.map((audItem) => {
                            let statusText = "Inalterado";
                            let statusColor = "bg-slate-100 text-slate-600 border-slate-200";
                            if (audItem.status === "pending") {
                              statusText = "Atenção: Pendente";
                              statusColor = "bg-rose-100 text-rose-800 border-rose-200 animate-pulse";
                            } else if (audItem.status === "new_item") {
                              statusText = "Novo Item";
                              statusColor = "bg-emerald-100 text-emerald-850 border-emerald-200";
                            } else if (audItem.status === "divergent") {
                              statusText = "Divergente";
                              statusColor = "bg-amber-100 text-amber-850 border-amber-200";
                            }

                            const isSelected = audItem.selectedToApply && audSup.selectedToApply;
                            const rowBg = isSelected ? "hover:bg-pink-50/10" : "bg-slate-50/50 opacity-65";

                            return (
                              <tr key={`${audSup.id}-${audItem.id}`} className={`${rowBg} transition-all`}>
                                {/* Checkbox */}
                                <td className="py-2 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={audItem.selectedToApply}
                                    onChange={() => handleToggleItemSelection(audSup.id, audItem.id)}
                                    className="h-4 w-4 rounded-sm text-[#ff2a6d] focus:ring-[#ff2a6d] cursor-pointer mx-auto"
                                  />
                                </td>

                                {/* Fornecedor */}
                                <td className="py-2 px-3">
                                  <div className="flex flex-col gap-0.5">
                                    <input
                                      type="text"
                                      value={audSup.name}
                                      onChange={(e) => handleSupplierFieldUpdate(audSup.id, "name", e.target.value)}
                                      className="font-black text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-none p-1 rounded border border-transparent hover:border-slate-300 focus:border-[#ff2a6d] uppercase text-[11px] w-full"
                                    />
                                    <span className="text-[11px] text-slate-500 font-semibold pl-1">
                                      {audSup.isNew ? "✨ NOVO FORNECEDOR" : "🏢 CADASTRADO"}
                                    </span>
                                  </div>
                                </td>

                                {/* Produto */}
                                <td className="py-2 px-3">
                                  <div className="flex flex-col gap-0.5">
                                    <input
                                      type="text"
                                      value={audItem.name}
                                      onChange={(e) => handleItemFieldUpdate(audSup.id, audItem.id, "name", e.target.value)}
                                      className="font-bold text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-none p-1 rounded border border-transparent hover:border-slate-300 focus:border-[#ff2a6d] text-[11px] w-full"
                                    />
                                    {audItem.status === "pending" && audItem.reviewReason && (
                                      <span className="text-[11px] text-rose-600 font-semibold pl-1 flex items-center gap-1">
                                        ⚠️ {audItem.reviewReason}
                                      </span>
                                    )}
                                    {audItem.status === "divergent" && audItem.oldPrice !== null && (
                                      <span className="text-[11px] text-amber-700 font-semibold pl-1">
                                        Anterior: R$ {audItem.oldPrice.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Quantidade */}
                                <td className="py-2 px-3 text-center">
                                  <input
                                    type="number"
                                    min={1}
                                    value={audItem.quantity}
                                    onChange={(e) => handleItemFieldUpdate(audSup.id, audItem.id, "quantity", e.target.value)}
                                    className="w-16 text-center rounded-md border border-slate-200 py-1 text-[11px] font-extrabold text-[#ff2a6d] focus:outline-[#ff2a6d] bg-white mx-auto"
                                  />
                                </td>

                                {/* Valor Unitário */}
                                <td className="py-2 px-3 text-center">
                                  <div className="relative inline-block w-28">
                                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500">R$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={audItem.unitPrice || ""}
                                      onChange={(e) => handleItemFieldUpdate(audSup.id, audItem.id, "unitPrice", e.target.value)}
                                      className="w-full text-center pl-5 pr-1 rounded-md border border-slate-200 py-1 text-[11px] font-extrabold text-slate-900 focus:outline-[#ff2a6d] bg-white"
                                      placeholder="0,00"
                                    />
                                  </div>
                                </td>

                                {/* Status / Alerta */}
                                <td className="py-2 px-3">
                                  <span className={`inline-block text-[11px] font-black uppercase px-2 py-0.5 rounded-sm border ${statusColor}`}>
                                    {statusText}
                                  </span>
                                </td>

                                {/* Excluir */}
                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(audSup.id, audItem.id)}
                                    className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-colors"
                                    title="Excluir item da lista"
                                  >
                                    <Trash2 className="h-4 w-4 mx-auto" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500 font-extrabold text-xs uppercase">
                            Nenhum fornecedor ou item extraído na tabela.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Floating actions under table */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 mt-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Add a blank row to the first supplier, or create a supplier if none exists
                        if (auditedSuppliers.length > 0) {
                          handleAddBlankRow(auditedSuppliers[0].id);
                        } else {
                          // If no supplier, create a placeholder supplier first
                          const tempSupId = `sup_temp_${Date.now()}`;
                          setAuditedSuppliers([{
                            id: tempSupId,
                            name: "NOVO FORNECEDOR",
                            isNew: true,
                            matchedSupplierId: null,
                            selectedToApply: true,
                            items: []
                          }]);
                          setTimeout(() => handleAddBlankRow(tempSupId), 50);
                        }
                      }}
                      className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase px-3.5 py-2 rounded-full transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar Linha em Branco
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsTableReviewOpen(false)}
                      className="rounded-full bg-white hover:bg-slate-50 border border-slate-200 px-5 py-2 text-[11px] font-black tracking-wider uppercase transition-all shadow-3xs cursor-pointer text-slate-700"
                    >
                      Voltar ao Painel
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleConfirmMerge();
                        setIsTableReviewOpen(false);
                      }}
                      disabled={auditedSuppliers.length === 0 || !auditedSuppliers.some(s => s.selectedToApply && s.items.some(i => i.selectedToApply))}
                      className={`inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-[11px] font-black tracking-wider uppercase transition-all shadow-md active:scale-98 ${
                        auditedSuppliers.length > 0 && auditedSuppliers.some(s => s.selectedToApply && s.items.some(i => i.selectedToApply))
                          ? "bg-[#ff2a6d] hover:bg-[#c21e54] text-white cursor-pointer"
                          : "bg-slate-200 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      Confirmar e Inserir na Cotação
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    );
  }
