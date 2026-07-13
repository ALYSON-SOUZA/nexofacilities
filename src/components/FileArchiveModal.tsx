import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  X, 
  Upload, 
  Trash2, 
  Search, 
  Download, 
  Plus, 
  FolderOpen, 
  FileText, 
  FileSpreadsheet, 
  Image, 
  FileArchive, 
  Check, 
  AlertCircle,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Info,
  Eye,
  Layers,
  CheckSquare,
  Square
} from "lucide-react";
import { EmojiButton } from "./EmojiButton";
import { 
  ArchivedFile, 
  saveFileToDb, 
  getAllFilesFromDb, 
  deleteFileFromDb 
} from "../utils/fileDb";
import { 
  dbFetchArchivedFiles, 
  dbUpsertArchivedFile, 
  dbDeleteArchivedFile 
} from "../supabaseClient";

interface FileArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string; 
}

export default function FileArchiveModal({
  isOpen,
  onClose,
  initialCategory = "Outros"
}: FileArchiveModalProps) {
  const [activeTab, setActiveTab] = useState<"list" | "upload">("list");
  const [files, setFiles] = useState<ArchivedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Selection states
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Supabase connection state
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Preview file modal state
  const [previewFile, setPreviewFile] = useState<ArchivedFile | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState(initialCategory);
  const [formDescription, setFormDescription] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    type: string;
    size: number;
    dataUrl: string;
  } | null>(null);

  // Status message
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Deletion Confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files on open
  useEffect(() => {
    if (isOpen) {
      loadFiles();
      setFormCategory(initialCategory);
      setStatus(null);
      setSelectedFileIds(new Set());
    }
  }, [isOpen, initialCategory]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      // 1. First, load from local IndexedDB
      const localFiles = await getAllFilesFromDb();
      
      // 2. Try to load from Supabase
      try {
        const cloudFiles = await dbFetchArchivedFiles();
        setSupabaseConnected(true);
        
        // Merge cloud files and local files, ensuring unique IDs (prefer cloud version if conflicted)
        const mergedMap = new Map<string, ArchivedFile>();
        
        // Add local files first
        localFiles.forEach(f => mergedMap.set(f.id, f));
        // Add cloud files (will overwrite local ones or append files uploaded by other users)
        cloudFiles.forEach(f => mergedMap.set(f.id, f));
        
        const mergedList = Array.from(mergedMap.values());
        mergedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFiles(mergedList);
        
        // Sync back to local store so that offline cache has everything
        for (const file of cloudFiles) {
          await saveFileToDb(file);
        }
      } catch (sbError) {
        console.warn("Could not load from Supabase. Using local IndexedDB instead:", sbError);
        setSupabaseConnected(false);
        
        localFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFiles(localFiles);
      }
    } catch (err) {
      console.error("Erro ao carregar arquivos:", err);
      showStatus("Erro ao carregar os arquivos salvos.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    showStatus("Sincronizando com Supabase Cloud...", "info");
    try {
      const localFiles = await getAllFilesFromDb();
      const cloudFiles = await dbFetchArchivedFiles();
      setSupabaseConnected(true);

      // Upload files that are in local but not in cloud
      const cloudIds = new Set(cloudFiles.map(f => f.id));
      let uploadCount = 0;
      for (const file of localFiles) {
        if (!cloudIds.has(file.id)) {
          await dbUpsertArchivedFile(file);
          uploadCount++;
        }
      }

      // Download files that are in cloud but not in local
      const localIds = new Set(localFiles.map(f => f.id));
      let downloadCount = 0;
      for (const file of cloudFiles) {
        if (!localIds.has(file.id)) {
          await saveFileToDb(file);
          downloadCount++;
        }
      }

      await loadFiles();
      if (uploadCount > 0 || downloadCount > 0) {
        showStatus(`Sincronização concluída! Nuvem atualizada (${uploadCount} enviados, ${downloadCount} baixados).`, "success");
      } else {
        showStatus("Sincronização concluída! Todos os arquivos estão atualizados.", "success");
      }
    } catch (err) {
      console.error("Erro de sincronização:", err);
      setSupabaseConnected(false);
      showStatus("Falha ao sincronizar com Supabase. Use o modo local.", "error");
    } finally {
      setSyncing(false);
    }
  };

  const showStatus = (text: string, type: "success" | "error" | "info" = "info") => {
    setStatus({ text, type });
    setTimeout(() => {
      setStatus(null);
    }, 4000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      showStatus("O tamanho máximo por arquivo é 25 MB para garantir melhor desempenho.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadedFile({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: result
      });
      if (!formName) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setFormName(nameWithoutExt);
      }
    };
    reader.onerror = () => {
      showStatus("Erro ao ler o arquivo físico.", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleClearFile = () => {
    setUploadedFile(null);
    setFormName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleArchiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadedFile) {
      showStatus("Por favor, selecione ou arraste um arquivo primeiro.", "error");
      return;
    }

    if (!formName.trim()) {
      showStatus("Por favor, preencha um nome de referência.", "error");
      return;
    }

    setLoading(true);
    try {
      const newFile: ArchivedFile = {
        id: "file_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        name: formName.trim() + getExtension(uploadedFile.name),
        category: formCategory,
        description: formDescription.trim(),
        type: uploadedFile.type,
        size: uploadedFile.size,
        dataUrl: uploadedFile.dataUrl,
        createdAt: new Date().toISOString()
      };

      // 1. Save locally
      await saveFileToDb(newFile);
      
      // 2. Try to sync to Supabase Cloud
      let cloudSaved = false;
      if (supabaseConnected !== false) {
        try {
          const success = await dbUpsertArchivedFile(newFile);
          if (success) {
            cloudSaved = true;
          }
        } catch (sbError) {
          console.warn("Could not save to Supabase cloud, saved locally only:", sbError);
        }
      }

      // Reset form
      setFormName("");
      setFormDescription("");
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Reload and switch back
      await loadFiles();
      if (cloudSaved) {
        showStatus("Arquivo salvo com sucesso na Nuvem Supabase!", "success");
      } else {
        showStatus("Arquivo arquivado localmente com sucesso! (Sem sincronização em nuvem)", "success");
      }
      setActiveTab("list");
    } catch (err) {
      console.error(err);
      showStatus("Erro ao arquivar documento.", "error");
    } finally {
      setLoading(false);
    }
  };

  const getExtension = (fullName: string): string => {
    const idx = fullName.lastIndexOf('.');
    return idx !== -1 ? fullName.substring(idx) : "";
  };

  const handleDownload = (file: ArchivedFile) => {
    try {
      const link = document.createElement("a");
      link.href = file.dataUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showStatus(`Iniciando download de: ${file.name}`, "success");
    } catch (e) {
      console.error(e);
      showStatus("Erro ao realizar download do arquivo.", "error");
    }
  };

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id);
  };

  const executeDeleteFile = async (id: string) => {
    try {
      // Delete locally
      await deleteFileFromDb(id);
      
      // Delete from Supabase cloud if connected
      if (supabaseConnected !== false) {
        try {
          await dbDeleteArchivedFile(id);
        } catch (sbError) {
          console.warn("Failed to delete from Supabase cloud:", sbError);
        }
      }

      showStatus("Arquivo excluído permanentemente.", "info");
      setFiles(prev => prev.filter(f => f.id !== id));
      setSelectedFileIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error(err);
      showStatus("Erro ao excluir arquivo.", "error");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const executeBulkDelete = async () => {
    setLoading(true);
    try {
      let successCount = 0;
      for (const id of Array.from(selectedFileIds) as string[]) {
        // Delete locally
        await deleteFileFromDb(id);
        
        // Delete from Supabase
        if (supabaseConnected !== false) {
          try {
            await dbDeleteArchivedFile(id);
          } catch (err) {
            console.warn(`Could not delete file ${id} from Supabase:`, err);
          }
        }
        successCount++;
      }
      
      showStatus(`${successCount} arquivos excluídos com sucesso.`, "info");
      setFiles(prev => prev.filter(f => !selectedFileIds.has(f.id)));
      setSelectedFileIds(new Set());
    } catch (err) {
      console.error("Erro na exclusão em lote:", err);
      showStatus("Falha ao excluir alguns arquivos em lote.", "error");
    } finally {
      setLoading(false);
      setConfirmBulkDelete(false);
    }
  };

  const getFileIcon = (type: string, name: string) => {
    const lowerName = name.toLowerCase();
    const isExcel = type.includes("sheet") || type.includes("excel") || lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls") || lowerName.endsWith(".csv");
    const isImage = type.startsWith("image/");
    const isPdf = type.includes("pdf") || lowerName.endsWith(".pdf");
    const isZip = type.includes("zip") || type.includes("tar") || type.includes("compressed") || lowerName.endsWith(".zip") || lowerName.endsWith(".rar");

    if (isExcel) return <FileSpreadsheet className="h-6 w-6 text-emerald-600" />;
    if (isImage) return <Image className="h-6 w-6 text-indigo-500" />;
    if (isPdf) return <FileText className="h-6 w-6 text-rose-600" />;
    if (isZip) return <FileArchive className="h-6 w-6 text-amber-500" />;
    return <FileText className="h-6 w-6 text-slate-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const categories = [
    "Contratos",
    "Cotações",
    "Recibos",
    "Notas Fiscais",
    "Documentos",
    "Outros"
  ];

  // Text search highlighter
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return <span>{text}</span>;
    const cleanSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${cleanSearch})`, "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-[#ff2a6d]/35 text-[#c21e54] dark:bg-[#ff2a6d]/20 dark:text-[#ff2a6d] font-bold rounded-xs px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Helper to count files in categories
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: files.length };
    categories.forEach(cat => {
      counts[cat] = files.filter(f => f.category === cat).length;
    });
    return counts;
  }, [files]);

  // Data Quota calculation
  const totalStorageSize = useMemo(() => {
    return files.reduce((sum, f) => sum + f.size, 0);
  }, [files]);

  const maxQuota = 35 * 1024 * 1024; // 35 MB max safe base64 table storage limit
  const quotaPercentage = Math.min((totalStorageSize / maxQuota) * 100, 100);

  const filteredFiles = files.filter(file => {
    const matchesSearch = 
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      file.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || file.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Toggle single file selection
  const toggleSelectFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle all visible files selection
  const toggleSelectAllVisible = () => {
    const allVisibleSelected = filteredFiles.every(f => selectedFileIds.has(f.id));
    if (allVisibleSelected) {
      setSelectedFileIds(prev => {
        const next = new Set(prev);
        filteredFiles.forEach(f => next.delete(f.id));
        return next;
      });
    } else {
      setSelectedFileIds(prev => {
        const next = new Set(prev);
        filteredFiles.forEach(f => next.add(f.id));
        return next;
      });
    }
  };

  const handleDownloadSelected = () => {
    if (selectedFileIds.size === 0) return;
    showStatus(`Baixando ${selectedFileIds.size} arquivos em lote...`, "success");
    files.forEach(f => {
      if (selectedFileIds.has(f.id)) {
        handleDownload(f);
      }
    });
  };

  // Try to inspect text content if encoded text file
  const isTextPreviewable = (type: string, name: string) => {
    const lowerName = name.toLowerCase();
    return type.startsWith("text/") || type.includes("json") || lowerName.endsWith(".txt") || lowerName.endsWith(".csv");
  };

  const getTextPreviewContent = (dataUrl: string) => {
    try {
      const parts = dataUrl.split(",");
      if (parts.length > 1) {
        const decoded = atob(parts[1]);
        // Return up to 1000 characters
        return decoded.length > 1200 ? decoded.substring(0, 1200) + "\n\n...[Conteúdo Truncado para Visualização]..." : decoded;
      }
    } catch (e) {
      return "Não foi possível carregar a pré-visualização de texto.";
    }
    return "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-150 dark:border-slate-800 overflow-hidden flex flex-col h-[85vh] max-h-[750px]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-[#ff2a6d]/10 text-[#ff2a6d] rounded-xl">
              <FileArchive className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-[14px] font-black uppercase text-slate-850 dark:text-white tracking-wide">
                Arquivo Digital de Documentos Pro
              </h2>
              <p className="text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase tracking-tight">
                Armazenamento de comprovantes, notas fiscais, contratos e cotações com pré-visualização inteligente
              </p>
            </div>
          </div>
          <EmojiButton
            iconKey="fechar"
            onClick={onClose}
            size="sm"
            variant="danger"
          />
        </div>

        {/* Integration Sync banner & info */}
        {supabaseConnected === false && (
          <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <CloudOff className="h-4 w-4 shrink-0 text-amber-500" />
              <span>Modo Armazenamento Local Ativo (Sem sincronização Supabase).</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="normal-case text-slate-500 dark:text-slate-450 hidden md:inline font-semibold">
                Dica: Verifique a conexão do banco para liberar compartilhamento coletivo.
              </span>
              <button
                onClick={loadFiles}
                className="px-2.5 py-1 bg-amber-600/25 hover:bg-amber-600/40 text-amber-850 dark:text-amber-300 rounded-lg transition-all flex items-center gap-1 cursor-pointer font-bold"
              >
                <RefreshCw className="h-3 w-3 animate-spin-slow" />
                <span>Reconectar</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation & Actions toolbar */}
        <div className="px-6 py-3 bg-slate-100/50 dark:bg-slate-950/20 border-b border-slate-150 dark:border-slate-800/85 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex bg-slate-200/60 dark:bg-slate-800/60 p-0.5 rounded-xl self-start">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "list"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Arquivos Salvos ({files.length})
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "upload"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Novo Arquivo</span>
            </button>
          </div>

          {/* Sync status / buttons */}
          <div className="flex items-center gap-2.5 self-center">
            {supabaseConnected === true && (
              <EmojiButton
                iconKey="limpar"
                onClick={handleManualSync}
                size="sm"
                variant="success"
              />
            )}

            {status && (
              <div className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 ${
                status.type === "success" 
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 border border-emerald-100 dark:border-emerald-900/30" 
                  : status.type === "error"
                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-650 border border-rose-100 dark:border-rose-900/30"
                  : "bg-slate-50 dark:bg-slate-850 text-slate-600 border border-slate-100 dark:border-slate-850"
              }`}>
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[200px]">{status.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/5 p-6 scrollbar-thin">
          {activeTab === "list" ? (
            <div className="space-y-4 h-full flex flex-col">
              {/* Search and Filters Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                {/* Search Input */}
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nome ou descrição do documento..."
                    className="w-full pl-9.5 pr-4 py-2 bg-white dark:bg-slate-900 text-[11px] text-slate-800 dark:text-white placeholder-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#ff2a6d] dark:focus:ring-[#ff2a6d] transition-all font-medium"
                  />
                  {searchQuery && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <EmojiButton
                        iconKey="limpar"
                        onClick={() => setSearchQuery("")}
                        size="sm"
                        variant="secondary"
                      />
                    </div>
                  )}
                </div>

                {/* Filter Category Buttons with dynamic count */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory("All")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer shrink-0 transition-all flex items-center gap-1.5 ${
                      selectedCategory === "All"
                        ? "bg-slate-850 border-slate-850 text-white dark:bg-slate-700 dark:border-slate-700"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-350"
                    }`}
                  >
                    <span>Todos</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[8.5px] font-black ${
                      selectedCategory === "All" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}>{categoryCounts["All"]}</span>
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer shrink-0 transition-all flex items-center gap-1.5 ${
                        selectedCategory === cat
                          ? "bg-slate-850 border-slate-850 text-white dark:bg-slate-700 dark:border-slate-700"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-350"
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[8.5px] font-black ${
                        selectedCategory === cat ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}>{categoryCounts[cat]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk actions control bar */}
              {filteredFiles.length > 0 && (
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-150 dark:border-slate-850 flex items-center justify-between shrink-0 text-[10px] font-bold uppercase text-slate-500 tracking-wide">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={toggleSelectAllVisible}
                      className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
                    >
                      {filteredFiles.every(f => selectedFileIds.has(f.id)) ? (
                        <CheckSquare className="h-4.5 w-4.5 text-[#ff2a6d]" />
                      ) : (
                        <Square className="h-4.5 w-4.5" />
                      )}
                      <span>Selecionar Todos Visíveis</span>
                    </button>
                    {selectedFileIds.size > 0 && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-extrabold normal-case">
                        ({selectedFileIds.size} selecionados)
                      </span>
                    )}
                  </div>

                  {selectedFileIds.size > 0 && (
                    <div className="flex items-center gap-2">
                      <EmojiButton
                        iconKey="imprimir"
                        onClick={handleDownloadSelected}
                        size="sm"
                        variant="neutral"
                      />
                      <EmojiButton
                        iconKey="excluir"
                        onClick={() => setConfirmBulkDelete(true)}
                        size="sm"
                        variant="danger"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Files list or empty state */}
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-[#111c2e] rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest mt-4 animate-pulse">Sincronizando com Supabase Cloud...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center bg-white dark:bg-slate-900/40">
                  <span className="p-4 bg-slate-50 dark:bg-slate-850 text-slate-300 dark:text-slate-650 rounded-full mb-3">
                    <FolderOpen className="h-8 w-8" />
                  </span>
                  <h3 className="text-[12px] font-black uppercase text-slate-800 dark:text-white tracking-wide">
                    Nenhum arquivo encontrado
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight max-w-sm mt-1">
                    {searchQuery || selectedCategory !== "All"
                      ? "Experimente mudar os filtros ou limpar a pesquisa ativa."
                      : "A pasta de arquivos digitais compartilhados está vazia. Comece salvando novos documentos!"}
                  </p>
                  {(!searchQuery && selectedCategory === "All") && (
                    <div className="mt-4">
                      <EmojiButton
                        iconKey="adicionar"
                        onClick={() => setActiveTab("upload")}
                        size="md"
                        variant="primary"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 overflow-y-auto pr-1">
                  {filteredFiles.map(file => {
                    const isSelected = selectedFileIds.has(file.id);
                    return (
                      <div 
                        key={file.id} 
                        onClick={() => setPreviewFile(file)}
                        className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex gap-3.5 hover:shadow-md transition-all group relative cursor-pointer ${
                          isSelected 
                            ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10" 
                            : "border-slate-150 dark:border-slate-800 hover:border-slate-250 dark:hover:border-slate-700"
                        }`}
                      >
                        {/* Selector checkbox */}
                        <button
                          onClick={(e) => toggleSelectFile(file.id, e)}
                          className="absolute top-4 left-4 z-10 p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4.5 w-4.5 text-[#ff2a6d]" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-slate-300 dark:text-slate-600 hover:text-slate-400" />
                          )}
                        </button>

                        {/* Icon */}
                        <div className="h-11 w-11 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800 ml-6">
                          {getFileIcon(file.type, file.name)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider border ${
                              file.category === "Contratos" 
                                ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 border-rose-100 dark:border-rose-900/30"
                                : file.category === "Cotações"
                                ? "bg-[#ff2a6d]/5 text-[#ff2a6d] border-[#ff2a6d]/10"
                                : file.category === "Recibos"
                                ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 border-indigo-100 dark:border-indigo-900/30"
                                : file.category === "Notas Fiscais"
                                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-100 dark:border-amber-900/30"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 border-slate-100 dark:border-slate-750"
                            }`}>
                              {file.category}
                            </span>

                            {/* Cloud Badge Indicator */}
                            <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tight">
                              {supabaseConnected ? (
                                <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                                  <Cloud className="h-2.5 w-2.5" />
                                  <span>Nuvem</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                  <CloudOff className="h-2.5 w-2.5" />
                                  <span>Local</span>
                                </span>
                              )}
                            </span>

                            <span className="text-[8px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tight ml-auto">
                              {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                            </span>
                          </div>

                          <h4 className="text-[11.5px] font-black text-slate-800 dark:text-white uppercase truncate tracking-tight pr-12 group-hover:text-[#ff2a6d] transition-colors" title={file.name}>
                            {highlightText(file.name, searchQuery)}
                          </h4>

                          {file.description ? (
                            <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium leading-normal line-clamp-2">
                              {highlightText(file.description, searchQuery)}
                            </p>
                          ) : (
                            <p className="text-[9.5px] text-slate-350 dark:text-slate-500 font-bold italic uppercase tracking-tight">
                              Sem descrição adicional
                            </p>
                          )}

                          <div className="pt-1.5 flex items-center justify-between text-[8.5px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>{formatFileSize(file.size)}</span>
                            <span className="font-mono text-slate-300 dark:text-slate-650">#{file.id.split("_")[2]}</span>
                          </div>
                        </div>

                        {/* Floating actions right aligned */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <EmojiButton
                            iconKey="visualizar"
                            onClick={() => setPreviewFile(file)}
                            size="sm"
                            variant="neutral"
                          />
                          <EmojiButton
                            iconKey="imprimir"
                            onClick={() => handleDownload(file)}
                            size="sm"
                            variant="neutral"
                          />
                          <EmojiButton
                            iconKey="excluir"
                            onClick={() => handleDeleteClick(file.id)}
                            size="sm"
                            variant="danger"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Data space / Quota indicator progress bar */}
              <div className="mt-auto pt-4 border-t border-slate-150 dark:border-slate-800 shrink-0">
                <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500 dark:text-slate-500 tracking-wider mb-1">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    <span>Uso Recomendado da Tabela Base64</span>
                  </span>
                  <span>{formatFileSize(totalStorageSize)} de {formatFileSize(maxQuota)}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      quotaPercentage > 85 
                        ? "bg-rose-500" 
                        : quotaPercentage > 60 
                        ? "bg-amber-500" 
                        : "bg-[#ff2a6d]"
                    }`}
                    style={{ width: `${quotaPercentage}%` }}
                  />
                </div>
                {quotaPercentage > 80 && (
                  <p className="text-[8px] font-bold text-rose-500 uppercase tracking-tight mt-1">
                    ⚠️ Atenção: Armazenamento próximo ao limite recomendado. Considere excluir comprovantes antigos.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Upload Screen Form */
            <form onSubmit={handleArchiveSubmit} className="space-y-4 max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                Arquivar Novo Documento
              </h3>

              {/* Drag and drop panel */}
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-200 dark:border-slate-800/85 hover:border-[#ff2a6d] dark:hover:border-[#ff2a6d] rounded-xl p-6 text-center bg-slate-50/50 dark:bg-slate-950/10 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {!uploadedFile ? (
                  <div className="space-y-2 flex flex-col items-center">
                    <span className="p-3 bg-white dark:bg-slate-800 text-[#ff2a6d] rounded-xl shadow-xs border border-slate-100 dark:border-slate-750">
                      <Upload className="h-5 w-5 animate-pulse" />
                    </span>
                    <p className="text-[11px] font-black text-slate-700 dark:text-slate-250 uppercase tracking-tight">
                      Arraste seu arquivo aqui ou clique para procurar
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide leading-tight">
                      Suporta PDFs, planilhas Excel, imagens de recibos ou TXTs de até 25MB
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-750 p-3 rounded-xl max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg shrink-0">
                        {getFileIcon(uploadedFile.type, uploadedFile.name)}
                      </span>
                      <div className="text-left min-w-0">
                        <span className="text-[10px] font-black text-slate-700 dark:text-white truncate block uppercase tracking-tight" title={uploadedFile.name}>
                          {uploadedFile.name}
                        </span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                          {formatFileSize(uploadedFile.size)}
                        </span>
                      </div>
                    </div>
                    <EmojiButton
                      iconKey="fechar"
                      onClick={handleClearFile}
                      size="sm"
                      variant="danger"
                    />
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-wider block">
                    Nome de Referência / Título *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Ficha Jovem Aprendiz João Silva"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-[10.5px] font-bold text-slate-850 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ff2a6d] transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-wider block">
                    Categoria do Documento *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-[10.5px] font-bold text-slate-850 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ff2a6d] transition-all"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-wider block">
                  Descrição ou Observações do Arquivo
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Informações adicionais para facilitar buscas futuras, como datas importantes, CPF, valor ou números de chamados..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-[10.5px] font-bold text-slate-850 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ff2a6d] transition-all resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <EmojiButton
                  iconKey="cancelar"
                  onClick={() => {
                    handleClearFile();
                    setActiveTab("list");
                  }}
                  size="md"
                  variant="neutral"
                />
                <EmojiButton
                  iconKey="salvar"
                  type="submit"
                  disabled={loading}
                  size="md"
                  variant="success"
                />
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Interactive File Preview Modal Overlay */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center z-[120] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-150 dark:border-slate-850 flex flex-col gap-4 overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  {getFileIcon(previewFile.type, previewFile.name)}
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase truncate max-w-[400px]" title={previewFile.name}>
                    {previewFile.name}
                  </h3>
                  <span className="text-[8.5px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wide">
                    {previewFile.category} • {formatFileSize(previewFile.size)} • {new Date(previewFile.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
              <EmojiButton
                iconKey="fechar"
                onClick={() => setPreviewFile(null)}
                size="sm"
                variant="danger"
              />
            </div>

            {/* Preview content drawer */}
            <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 rounded-xl overflow-y-auto p-4 flex flex-col items-center justify-center border border-slate-150 dark:border-slate-850 min-h-[250px] max-h-[50vh]">
              {previewFile.type.startsWith("image/") ? (
                <div className="relative group max-w-full">
                  <img 
                    src={previewFile.dataUrl} 
                    alt={previewFile.name}
                    className="max-h-[40vh] object-contain rounded-lg shadow-sm mx-auto"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <span className="text-[9px] font-black uppercase text-white bg-slate-900/80 px-2.5 py-1 rounded-md">Visualização de Imagem</span>
                  </div>
                </div>
              ) : isTextPreviewable(previewFile.type, previewFile.name) ? (
                <pre className="w-full text-left font-mono text-[9.5px] leading-relaxed text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-150 dark:border-slate-800 overflow-x-auto whitespace-pre-wrap">
                  {getTextPreviewContent(previewFile.dataUrl)}
                </pre>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <span className="p-4 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 inline-block text-slate-350">
                    {getFileIcon(previewFile.type, previewFile.name)}
                  </span>
                  <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                    Visualização direta não disponível para este formato ({previewFile.type})
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-550 font-bold uppercase tracking-wide">
                    Faça o download físico do arquivo utilizando o botão abaixo para visualizá-lo em seu leitor nativo.
                  </p>
                </div>
              )}
            </div>

            {/* Description note */}
            {previewFile.description && (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex gap-2.5">
                <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[8px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">Notas & Observações:</span>
                  <p className="text-[10px] text-slate-650 dark:text-slate-400 font-medium leading-relaxed">
                    {previewFile.description}
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wide font-mono">ID: {previewFile.id}</span>
              <div className="flex gap-2">
                <EmojiButton
                  iconKey="imprimir"
                  onClick={() => {
                    handleDownload(previewFile);
                    setPreviewFile(null);
                  }}
                  size="md"
                  variant="primary"
                />
                <EmojiButton
                  iconKey="fechar"
                  onClick={() => setPreviewFile(null)}
                  size="md"
                  variant="neutral"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Overlay for file deletion */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-[130] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-150 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-650 border border-red-100 dark:border-red-900/30 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Excluir Arquivo Permanentemente
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  Você está prestes a excluir este documento do armazenamento local e da nuvem:
                </p>
                <p className="text-xs font-black text-red-650 dark:text-red-400 uppercase truncate max-w-[240px]">
                  {files.find(f => f.id === confirmDeleteId)?.name}
                </p>
                <p className="text-[10.5px] text-red-600 font-bold bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-100 dark:border-red-900/20 leading-tight mt-2 uppercase">
                  ⚠️ ATENÇÃO: Esta ação é irreversível e o arquivo será excluído de todos os dispositivos sincronizados!
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 mt-1">
              <EmojiButton
                iconKey="cancelar"
                onClick={() => setConfirmDeleteId(null)}
                size="md"
                variant="neutral"
                className="flex-1"
              />
              <EmojiButton
                iconKey="excluir"
                onClick={() => executeDeleteFile(confirmDeleteId)}
                size="md"
                variant="danger"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Overlay for batch deletion */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-[130] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-150 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-650 border border-red-100 dark:border-red-900/30 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Excluir {selectedFileIds.size} Arquivos em Lote
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  Você está prestes a excluir permanentemente {selectedFileIds.size} arquivos do armazenamento local e da nuvem Supabase.
                </p>
                <p className="text-[10.5px] text-red-600 font-bold bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-100 dark:border-red-900/20 leading-tight mt-2 uppercase">
                  ⚠️ ATENÇÃO: Esta ação é irreversível e apagará múltiplos arquivos de forma permanente!
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 mt-1">
              <EmojiButton
                iconKey="cancelar"
                onClick={() => setConfirmBulkDelete(false)}
                size="md"
                variant="neutral"
                className="flex-1"
              />
              <EmojiButton
                iconKey="excluir"
                onClick={executeBulkDelete}
                size="md"
                variant="danger"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
