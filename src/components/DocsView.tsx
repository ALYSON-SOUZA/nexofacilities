import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Search, 
  Bot, 
  Sparkles, 
  Check, 
  Loader2, 
  X, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  File as FileIcon, 
  ArrowRight, 
  AlertCircle,
  Clock,
  User,
  Tag,
  Presentation,
  Copy
} from "lucide-react";

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  user_responsible: string;
  theme_tag: string;
  original_file_path: string;
  summary_txt_path: string;
  extracted_text?: string;
  summary?: string;
}

interface Citation {
  documentName: string;
  tag: string;
  snippet: string;
}

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  citations?: Citation[];
}

interface DocsViewProps {
  onBack: () => void;
  userName: string;
  onOpenIntelligentReading?: () => void;
}

export default function DocsView({ onBack, userName, onOpenIntelligentReading }: DocsViewProps) {
  // Lists and Data
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterTag, setFilterTag] = useState<string>("TODOS");
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [copiedModalSummary, setCopiedModalSummary] = useState<boolean>(false);
  
  // Upload State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [themeTag, setThemeTag] = useState<string>("Geral");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<"file" | "paste">("file");
  const [pastedDocName, setPastedDocName] = useState<string>("");
  const [pastedTextContent, setPastedTextContent] = useState<string>("");

  // Document Modal State
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "### Olá! Eu sou o assistente inteligente NotebookLM da BP-COMPRAS.\n\nEnvie documentos (PDFs, Planilhas, Word, Imagens de Notas ou Listas de Materiais) no painel ao lado para que eu possa lê-los.\n\nDepois, você pode me fazer perguntas como:\n- *'Quais os prazos contratuais definidos?'*\n- *'Existe alguma observação de reajuste?'*\n- *'Liste todos os itens e valores identificados.'*\n\nEu responderei baseando-me **unicamente** nos seus documentos salvos, sem alucinações!",
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputText, setInputText] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatFilterDocId, setChatFilterDocId] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Presentation State
  const [activeTab, setActiveTab] = useState<"chat" | "presentation">("chat");
  const [presTopic, setPresTopic] = useState<string>("");
  const [presDocId, setPresDocId] = useState<string>("");
  const [presLoading, setPresLoading] = useState<boolean>(false);
  const [presentationMarkdown, setPresentationMarkdown] = useState<string>("");
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [copiedPres, setCopiedPres] = useState<boolean>(false);

  // Load documents list on start
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Scroll to chat bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Handle paste events globally inside DocsView to process pasted files/images/text with IA
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if user is focused on an input or textarea
      const isInputOrTextarea = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      
      // If focused on an input or textarea, check if they are pasting files/images.
      // If they are pasting files/images, we ALWAYS intercept and process them.
      // If they are pasting text, we only intercept if they are NOT focused on any input or textarea.
      if (isInputOrTextarea) {
        if (!e.clipboardData || !e.clipboardData.files || e.clipboardData.files.length === 0) {
          // Normal text paste inside an input, let it happen natively
          return;
        }
      }

      if (!e.clipboardData) return;

      // Extract files from clipboardData (files array and items array to be extremely robust)
      const files: File[] = [];
      if (e.clipboardData.files && e.clipboardData.files.length > 0) {
        for (let i = 0; i < e.clipboardData.files.length; i++) {
          files.push(e.clipboardData.files[i]);
        }
      }
      if (e.clipboardData.items && e.clipboardData.items.length > 0) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.kind === "file") {
            const f = item.getAsFile();
            if (f && !files.some(exist => exist.name === f.name && exist.size === f.size)) {
              files.push(f);
            }
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        
        // Map files to robust names
        const processedFiles = files.map(file => {
          const isGeneric = file.name === "image.png" || file.name === "blob" || !file.name || !file.name.includes(".");
          if (isGeneric || file.type.startsWith("image/")) {
            const now = new Date();
            const dateStr = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
            const timeStr = now.toLocaleTimeString("pt-BR").replace(/:/g, "-");
            const ext = file.type?.split("/")[1] || "png";
            return new File([file], `imagem_colada_${dateStr}_${timeStr}.${ext}`, { type: file.type || "image/png" });
          }
          return file;
        });

        await processFiles(processedFiles);
        return;
      }

      // If no files, check if they pasted plain text (and are NOT focused on an input/textarea)
      if (!isInputOrTextarea) {
        const text = e.clipboardData.getData("text/plain");
        if (text && text.trim().length > 0) {
          e.preventDefault();
          
          const now = new Date();
          const dateStr = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
          const timeStr = now.toLocaleTimeString("pt-BR").replace(/:/g, "-");
          const cleanName = `texto_colado_${dateStr}_${timeStr}.txt`;
          
          const textFile = new File([text], cleanName, { type: "text/plain" });
          await processFiles([textFile]);
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [userName, themeTag]);

  const fetchDocuments = async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/docs/list");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      await processFiles(files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      await processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadError("");
    
    for (const file of files) {
      try {
        let fileType = "";
        let cleanName = file.name;
        
        // 1. Identify by MIME type first
        const mime = file.type?.toLowerCase() || "";
        if (mime.startsWith("image/") || ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"].includes(mime)) {
          fileType = "image";
        } else if (mime === "application/pdf") {
          fileType = "pdf";
        } else if (["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"].includes(mime)) {
          fileType = "excel";
        } else if (["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"].includes(mime)) {
          fileType = "docx";
        } else if (["text/plain", "text/csv", "application/csv"].includes(mime)) {
          fileType = "text";
        }
        
        // 2. Identify by extension if MIME type was inconclusive
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        if (!fileType) {
          if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
            fileType = "image";
          } else if (ext === "pdf") {
            fileType = "pdf";
          } else if (["xls", "xlsx"].includes(ext)) {
            fileType = "excel";
          } else if (ext === "docx" || ext === "doc") {
            fileType = "docx";
          } else if (["txt", "csv"].includes(ext)) {
            fileType = "text";
          }
        }

        // 3. Fail if unsupported
        if (!fileType) {
          throw new Error(`Tipo de arquivo não suportado. Use PDF, DOCX, XLS/X, TXT, CSV ou Imagem.`);
        }

        // 4. Ensure name has correct extension if it's a pasted blob or unnamed
        const currentExt = cleanName.split(".").pop()?.toLowerCase();
        const hasValidExt = currentExt && ["jpg", "jpeg", "png", "webp", "gif", "pdf", "xls", "xlsx", "docx", "doc", "txt", "csv"].includes(currentExt);
        if (!hasValidExt) {
          let targetExt = "txt";
          if (fileType === "image") targetExt = "png";
          else if (fileType === "pdf") targetExt = "pdf";
          else if (fileType === "excel") targetExt = "xlsx";
          else if (fileType === "docx") targetExt = "docx";
          else if (fileType === "text") targetExt = "txt";
          
          cleanName = `${cleanName.replace(/\.[^/.]+$/, "")}.${targetExt}`;
        }

        // Convert file to Base64
        const base64Data = await fileToBase64(file);

        // Call upload endpoint
        const res = await fetch("/api/docs/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: cleanName,
            fileType,
            base64Data,
            userResponsible: userName || "Operador",
            themeTag: themeTag
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Erro desconhecido ao carregar arquivo.");
        }
      } catch (err: any) {
        console.error("Erro no upload do arquivo:", err);
        setUploadError(`Erro no arquivo '${file.name}': ${err?.message || err}`);
        break; // stop batch on error
      }
    }

    setIsUploading(false);
    fetchDocuments();
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleProcessPastedText = async () => {
    if (!pastedTextContent.trim()) {
      alert("Por favor, cole ou digite algum texto primeiro!");
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
    const timeStr = now.toLocaleTimeString("pt-BR").replace(/:/g, "-");
    
    let cleanName = pastedDocName.trim();
    if (!cleanName) {
      cleanName = `texto_colado_${dateStr}_${timeStr}`;
    }
    if (!cleanName.endsWith(".txt")) {
      cleanName += ".txt";
    }

    const file = new File([pastedTextContent], cleanName, { type: "text/plain" });
    await processFiles([file]);
    
    // Clear fields on success
    setPastedTextContent("");
    setPastedDocName("");
  };

  const handleTextareaPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!e.clipboardData) return;

    const files: File[] = [];
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      for (let i = 0; i < e.clipboardData.files.length; i++) {
        files.push(e.clipboardData.files[i]);
      }
    }
    if (e.clipboardData.items && e.clipboardData.items.length > 0) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f && !files.some(exist => exist.name === f.name && exist.size === f.size)) {
            files.push(f);
          }
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      const processedFiles = files.map((file: any) => {
        const isGeneric = file.name === "image.png" || file.name === "blob" || !file.name || !file.name.includes(".");
        if (isGeneric || file.type?.startsWith("image/")) {
          const now = new Date();
          const dateStr = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
          const timeStr = now.toLocaleTimeString("pt-BR").replace(/:/g, "-");
          const ext = file.type?.split("/")[1] || "png";
          return new File([file], `imagem_colada_${dateStr}_${timeStr}.${ext}`, { type: file.type || "image/png" });
        }
        return file;
      });
      await processFiles(processedFiles);
    }
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza de que deseja excluir este documento?")) return;

    try {
      const res = await fetch(`/api/docs/delete/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id));
        if (selectedDoc?.id === id) {
          setIsDocModalOpen(false);
        }
      } else {
        alert("Erro ao excluir documento do banco.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputText("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/docs/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          documentId: chatFilterDocId || undefined
        })
      });

      const data = await res.json();

      if (res.ok) {
        const botMsg: Message = {
          id: `msg-${Date.now()}-bot`,
          sender: "bot",
          text: data.answer,
          citations: data.citations,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        };
        setChatMessages(prev => [...prev, botMsg]);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `msg-${Date.now()}-err`,
        sender: "bot",
        text: `❌ **Ocorreu um erro ao consultar a IA:** ${err?.message || "Serviço indisponível temporariamente."}`,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGeneratePresentation = async () => {
    setPresLoading(true);
    setPresentationMarkdown("");
    setCurrentSlideIndex(0);

    try {
      const res = await fetch("/api/docs/presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: presDocId || undefined,
          topic: presTopic
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPresentationMarkdown(data.presentation);
      } else {
        alert(data.error || "Falha ao gerar apresentação.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao gerar apresentação.");
    } finally {
      setPresLoading(false);
    }
  };

  const parseSlides = (markdown: string): string[] => {
    if (!markdown) return [];
    return markdown
      .split(/\n---\n/)
      .map(slide => slide.trim())
      .filter(slide => slide.length > 0);
  };

  const slides = parseSlides(presentationMarkdown);

  const handleCopyPresentation = () => {
    navigator.clipboard.writeText(presentationMarkdown);
    setCopiedPres(true);
    setTimeout(() => setCopiedPres(false), 3000);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (doc.theme_tag && doc.theme_tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTag = filterTag === "TODOS" || doc.theme_tag === filterTag;
    return matchesSearch && matchesTag;
  });

  const uniqueTags = ["TODOS", ...Array.from(new Set(documents.map(d => d.theme_tag).filter(Boolean)))];

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-130px)] rounded-xl p-4 lg:p-6 border border-slate-200 shadow-sm flex flex-col animate-fade-in relative overflow-hidden">
      
      {/* Background decoration elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-pink-100/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#ff2a6d]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-200/80 gap-4 mb-5 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-[#ff2a6d] text-slate-900 shadow-xs">
              <Sparkles className="h-4.5 w-4.5 text-slate-900" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Bellinati Perez Facilities</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            NEXO FACILITIES
          </h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            Repositório e analise de documentos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {onOpenIntelligentReading && (
            <button
              onClick={onOpenIntelligentReading}
              className="px-4 py-2 bg-[#ff2a6d] hover:bg-pink-600 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 animate-pulse"
              title="Leitura Inteligente (Análise de Comprovante/Notas por IA)"
            >
              <span>🧠 Docs Intel (Leitura Inteligente)</span>
            </button>
          )}
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md transition-all self-start cursor-pointer active:scale-95"
          >
            Voltar para Cotação
          </button>
        </div>
      </div>

      {/* Main Multi-Column Content Area */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-0">
        
        {/* LEFT COLUMN: DOCUMENT MANAGER (5 Columns out of 12) */}
        <div className="xl:col-span-5 flex flex-col gap-4 min-h-[500px] xl:min-h-0">
          
          {/* UPLOAD & TAG PANEL */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-[#ff2a6d]" />
                Incluir Documento
              </h3>
              
              {/* Theme/Tag selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                <Tag className="h-3 w-3 text-slate-500" />
                <span className="text-[11px] font-black text-slate-500 uppercase">Tag:</span>
                <select
                  value={themeTag}
                  onChange={(e) => setThemeTag(e.target.value)}
                  className="bg-transparent text-[11px] font-black text-slate-700 outline-none border-0 cursor-pointer p-0"
                >
                  <option value="Geral">Geral</option>
                  <option value="Contrato">Contrato</option>
                  <option value="Proposta">Proposta</option>
                  <option value="Edital">Edital</option>
                  <option value="Preços">Preços</option>
                  <option value="Ficha MEI">Ficha MEI</option>
                  <option value="SLA / Prazo">SLA / Prazo</option>
                </select>
              </div>
            </div>

            {/* Tab Selector for Upload Mode */}
            <div className="flex border border-slate-200/60 bg-slate-50 p-1 rounded-xl shrink-0 select-none">
              <button
                type="button"
                onClick={() => setUploadMode("file")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-black uppercase tracking-wider text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  uploadMode === "file"
                    ? "bg-white text-[#ff2a6d] shadow-xs"
                    : "text-slate-500 hover:text-slate-600"
                }`}
              >
                <Upload className="h-3 w-3" />
                Enviar Arquivo
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("paste")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-black uppercase tracking-wider text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  uploadMode === "paste"
                    ? "bg-white text-[#ff2a6d] shadow-xs"
                    : "text-slate-500 hover:text-slate-600"
                }`}
              >
                <FileText className="h-3 w-3" />
                Colar Conteúdo
              </button>
            </div>

            {/* Conditionally render drag & drop or text pasting inputs */}
            {uploadMode === "paste" ? (
              <div className="flex flex-col gap-2.5">
                {isUploading ? (
                  <div className="border border-dashed border-[#ff2a6d] bg-pink-50/10 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-8 w-8 text-[#ff2a6d] animate-spin mb-2" />
                    <p className="text-[11px] font-black text-[#ff2a6d] uppercase tracking-wider animate-pulse">
                      Analisando e Criando Documento por IA...
                    </p>
                    <p className="text-[11px] text-slate-500 font-semibold uppercase mt-0.5">
                      Processando OCR, resumo estruturado e inserindo na pasta
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                        Nome do Documento (Opcional)
                      </label>
                      <input
                        type="text"
                        value={pastedDocName}
                        onChange={(e) => setPastedDocName(e.target.value)}
                        placeholder="Ex: Contrato de Limpeza BP"
                        className="text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-[#ff2a6d] focus:bg-white transition-all"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
                        <span>Texto do Documento ou Comprovante</span>
                        <span className="text-[#ff2a6d] text-[11px] animate-pulse">Suporta Ctrl+V de Imagens!</span>
                      </label>
                      <textarea
                        value={pastedTextContent}
                        onChange={(e) => setPastedTextContent(e.target.value)}
                        onPaste={handleTextareaPaste}
                        placeholder="Cole aqui o texto copiado de um e-mail, PDF ou site, ou pressione Ctrl+V para colar um arquivo de imagem..."
                        className="w-full h-24 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-[#ff2a6d] focus:bg-white transition-all resize-none placeholder:text-slate-500 leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setPastedTextContent(""); setPastedDocName(""); }}
                        disabled={!pastedTextContent && !pastedDocName}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-500 font-black text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                      >
                        Limpar
                      </button>
                      <button
                        type="button"
                        onClick={handleProcessPastedText}
                        disabled={!pastedTextContent.trim()}
                        className="flex-1 py-2 bg-[#ff2a6d] hover:bg-pink-600 disabled:bg-slate-200 disabled:text-slate-500 text-white font-black text-[11px] uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Analisar e Criar com IA</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Drag & Drop Zone */
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive 
                    ? "border-[#ff2a6d] bg-pink-50/20" 
                    : "border-slate-300 hover:border-[#ff2a6d] hover:bg-slate-50/50"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.jpg,.jpeg,.png"
                />
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-[#ff2a6d] animate-spin" />
                    <p className="text-[11px] font-black text-[#ff2a6d] uppercase tracking-wider animate-pulse">
                      Processando Documento por IA (OCR & Resumo)...
                    </p>
                    <p className="text-[11px] text-slate-500 font-semibold uppercase leading-none">
                      Isso pode levar alguns segundos
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-700 uppercase tracking-tight">
                        Arraste e solte arquivos aqui
                      </p>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        Ou clique para selecionar de sua pasta
                      </p>
                      <p className="text-[11px] text-[#ff2a6d] font-black uppercase tracking-wider mt-1.5">
                        💡 Dica: Você também pode colar imagens (Ctrl+V) aqui!
                      </p>
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase mt-1 leading-normal max-w-xs">
                      Suporta: PDF, DOCX, XLS/X, CSV, TXT e Imagens (JPG, PNG) para OCR Inteligente
                    </div>
                  </div>
                )}
              </div>
            )}

            {uploadError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-[11px] font-bold">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* DOCUMENTS LIST */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2.5 shrink-0">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#ff2a6d]" />
                Arquivos do Repositório ({documents.length})
              </h3>
              <button
                onClick={fetchDocuments}
                className="text-[11px] font-black uppercase text-[#ff2a6d] hover:text-[#ff2a6d] tracking-wider transition-colors cursor-pointer"
              >
                Atualizar Lista
              </button>
            </div>

            {/* Quick Search & Filter Inputs */}
            <div className="flex flex-col gap-2 shrink-0 mb-3.5">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar arquivos por nome ou tag..."
                  className="w-full text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-2 focus:outline-none focus:border-[#ff2a6d] focus:bg-white transition-all placeholder:text-slate-400"
                />
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-2 hover:bg-slate-200/50 rounded-full p-1 text-slate-500 hover:text-slate-600 transition-colors cursor-pointer text-xs"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Tag Quick Filters */}
              {documents.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-thin select-none max-w-full">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider shrink-0 mr-1">Filtrar:</span>
                  {uniqueTags.map((tag) => {
                    const isSelected = filterTag === tag;
                    return (
                      <button
                        key={tag}
                        onClick={() => setFilterTag(tag)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          isSelected
                            ? "bg-[#ff2a6d] text-white shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {tag === "TODOS" ? "Todos" : tag}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 max-h-[350px] xl:max-h-none">
              {loadingList ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin text-[#ff2a6d]" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Carregando Acervo...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                  <FileText className="h-8 w-8 mb-2 opacity-40 text-slate-300" />
                  <span className="text-xs font-black uppercase text-slate-500">Nenhum documento incluído</span>
                  <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-1 leading-normal max-w-xs">
                    Arraste um contrato ou proposta de fornecedor no quadro acima para começar!
                  </p>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                  <Search className="h-6 w-6 mb-1 text-slate-300" />
                  <span className="text-[11px] font-black uppercase text-slate-500">Nenhum resultado encontrado</span>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    Tente ajustar os filtros ou termo de busca
                  </p>
                </div>
              ) : (
                filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoc(doc);
                      setIsDocModalOpen(true);
                    }}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-50/60 rounded-xl px-2 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="h-8.5 w-8.5 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 group-hover:bg-[#ff2a6d]/10 group-hover:text-[#ff2a6d] transition-colors">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-slate-800 truncate group-hover:text-[#ff2a6d] transition-colors">
                          {doc.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 border border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                            {doc.theme_tag}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {formatSize(doc.file_size)}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(doc.uploaded_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {doc.summary && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(doc.summary || "");
                            setCopiedDocId(doc.id);
                            setTimeout(() => setCopiedDocId(null), 2000);
                          }}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            copiedDocId === doc.id
                              ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                              : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100 hover:text-slate-600"
                          }`}
                          title="Copiar Resumo IA para Clipboard"
                        >
                          {copiedDocId === doc.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}

                      <button
                        onClick={(e) => handleDeleteDoc(doc.id, e)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                        title="Excluir documento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: NOTEBOOKLM CHAT & SLIDE BUILDER (7 Columns out of 12) */}
        <div className="xl:col-span-7 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[550px] xl:min-h-0">
          
          {/* Tabs header */}
          <div className="flex border-b border-slate-100 bg-slate-50 shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-3 px-4 font-black text-xs uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "chat"
                  ? "border-[#ff2a6d] text-[#ff2a6d] bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-600 hover:bg-slate-100/50"
              }`}
            >
              <Bot className="h-4 w-4" />
              Chat Inteligente (NotebookLM)
            </button>
            <button
              onClick={() => setActiveTab("presentation")}
              className={`flex-1 py-3 px-4 font-black text-xs uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "presentation"
                  ? "border-[#ff2a6d] text-[#ff2a6d] bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-600 hover:bg-slate-100/50"
              }`}
            >
              <Presentation className="h-4 w-4" />
              Gerador de Apresentação Executiva
            </button>
          </div>

          {/* TAB 1: SMART NOTEBOOKLM CHAT ENGINE */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Chat Subheader with Filter options */}
              <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  <Bot className="h-3.5 w-3.5 text-[#ff2a6d]" />
                  <span>Escopo de Respostas:</span>
                </div>
                
                <select
                  value={chatFilterDocId}
                  onChange={(e) => setChatFilterDocId(e.target.value)}
                  className="text-[11px] font-black text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-[#ff2a6d] cursor-pointer max-w-[250px]"
                >
                  <option value="">Foco: Todo o Acervo ({documents.length} DOCs)</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Foco: {doc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chat Scrollable Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs font-semibold leading-relaxed shadow-sm relative group/msg ${
                        msg.sender === "user"
                          ? "bg-slate-900 text-white rounded-br-none"
                          : "bg-slate-100/80 text-slate-800 rounded-bl-none border border-slate-200/50"
                      }`}
                    >
                      {/* Copy message button in bubble */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.text);
                          setCopiedMsgId(msg.id);
                          setTimeout(() => setCopiedMsgId(null), 2000);
                        }}
                        className={`absolute right-2.5 top-2.5 p-1 rounded-md opacity-0 group-hover/msg:opacity-100 transition-opacity border shadow-sm cursor-pointer ${
                          msg.sender === "user" 
                            ? "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700" 
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        }`}
                        title="Copiar Mensagem para o Clipboard"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>

                      {/* Process simple markdown like titles or bullet lists */}
                      <div className="space-y-2 whitespace-pre-wrap pr-6">
                        {msg.text.split("\n\n").map((para, pIdx) => {
                          if (para.startsWith("### ")) {
                            return <h3 key={pIdx} className="text-xs font-black uppercase text-[#ff2a6d] tracking-wide mt-2 first:mt-0">{para.replace("### ", "")}</h3>;
                          }
                          if (para.startsWith("- ") || para.startsWith("* ")) {
                            return (
                              <ul key={pIdx} className="list-disc pl-4 space-y-1 my-1">
                                {para.split("\n").map((li, lIdx) => (
                                  <li key={lIdx}>{li.replace(/^[\-\*]\s+/, "")}</li>
                                ))}
                              </ul>
                            );
                          }
                          return <p key={pIdx}>{para}</p>;
                        })}
                      </div>

                      {/* Display smart sources / citation widgets underneath the bubble */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-slate-200/50">
                          <p className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                            📚 Fontes de Referência Verificadas:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.citations.map((cite, cIdx) => (
                              <div
                                key={cIdx}
                                className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] text-slate-600 font-bold hover:border-[#ff2a6d] transition-all cursor-pointer relative group/cite max-w-[150px] truncate"
                                title={cite.snippet}
                              >
                                {cite.documentName}
                                
                                {/* Hover snippet preview tooltip */}
                                <div className="absolute bottom-full left-0 mb-1 hidden group-hover/cite:block bg-slate-950 text-white text-[11px] p-2.5 rounded-lg shadow-md w-60 z-50 pointer-events-none border border-slate-800 font-medium leading-normal normal-case">
                                  <span className="font-black text-[#ff2a6d] uppercase text-[11px] block mb-1">Snippet do Documento:</span>
                                  "{cite.snippet}"
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1 px-1">
                      {msg.sender === "user" ? "Você" : "Assistente Intel"} • {msg.timestamp}
                    </span>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex items-center gap-2 text-slate-500 text-xs px-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#ff2a6d]" />
                    <span className="font-bold uppercase tracking-wider animate-pulse text-[11px]">IA está lendo os documentos de facilities...</span>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Chat Quick prompt tags */}
              <div className="p-2 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-1.5 shrink-0 select-none">
                <button
                  onClick={() => setInputText("Quais as principais obrigações e SLAs de serviços listados?")}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 uppercase tracking-tight transition-colors cursor-pointer"
                >
                  📋 SLAs & Prazos
                </button>
                <button
                  onClick={() => setInputText("Quais são os valores totais, taxas ou custos descritos nos documentos?")}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 uppercase tracking-tight transition-colors cursor-pointer"
                >
                  💰 Custos & Valores
                </button>
                <button
                  onClick={() => setInputText("Faça um comparativo geral resumido dos arquivos cadastrados.")}
                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 uppercase tracking-tight transition-colors cursor-pointer"
                >
                  ⚖️ Comparar DOCs
                </button>
              </div>

              {/* Chat Input Field */}
              <div className="p-3 border-t border-slate-200/80 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Faça uma pergunta sobre seus documentos salvos..."
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-950 placeholder:text-slate-400 bg-slate-50 focus:outline-none focus:border-[#ff2a6d] focus:bg-white transition-all"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={chatLoading || !inputText.trim()}
                    className="px-4 bg-[#ff2a6d] hover:bg-pink-600 disabled:bg-slate-200 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Perguntar
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRESENTATION BUILDER */}
          {activeTab === "presentation" && (
            <div className="flex-1 flex flex-col p-4 gap-4 min-h-0 overflow-y-auto">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col gap-3.5">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-[#ff2a6d]" />
                    Gerador de Pitch Deck Executivo
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold uppercase leading-normal">
                    Selecione documentos e defina um tema para a IA montar uma apresentação estruturada de slides corporativos.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black uppercase text-slate-500">Documento de Origem</label>
                    <select
                      value={presDocId}
                      onChange={(e) => setPresDocId(e.target.value)}
                      className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-[#ff2a6d] cursor-pointer"
                    >
                      <option value="">Análise Agregada (Todos os Documentos)</option>
                      {documents.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black uppercase text-slate-500">Tópico ou Foco dos Slides</label>
                    <input
                      type="text"
                      value={presTopic}
                      onChange={(e) => setPresTopic(e.target.value)}
                      placeholder="Ex: Análise de Custos de Facilities, Comparativo de Contratos..."
                      className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-[#ff2a6d]"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGeneratePresentation}
                  disabled={presLoading || documents.length === 0}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {presLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#ff2a6d]" />
                      <span>Montando Estrutura de Slides por IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-[#ff2a6d]" />
                      <span>Gerar Apresentação Executiva</span>
                    </>
                  )}
                </button>
              </div>

              {/* RENDER THE GENERATED SLIDES IN A BEAUTIFUL DEVICE FRAME */}
              {presentationMarkdown ? (
                <div className="flex-1 flex flex-col gap-3 min-h-[350px]">
                  
                  {/* Slide controls toolbar */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        Slides Gerados ({slides.length} slides)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyPresentation}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-black text-slate-600 uppercase tracking-tight flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedPres ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        {copiedPres ? "Copiado!" : "Copiar MD"}
                      </button>
                    </div>
                  </div>

                  {/* Pitch Deck Dark-mode Slide Frame */}
                  <div className="flex-1 rounded-2xl bg-slate-950 text-slate-200 p-6 shadow-md flex flex-col justify-between relative overflow-hidden min-h-[250px]">
                    {/* Futuristic wireframe accent */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff2a6d]/5 rounded-full blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#ff2a6d]/5 rounded-full blur-2xl" />

                    {/* Top slide identifier */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 shrink-0 text-slate-500 text-[11px] font-black uppercase tracking-widest select-none">
                      <span>BP-COMPRAS EXECUTIVE INTELLIGENCE</span>
                      <span>SLIDE {currentSlideIndex + 1} OF {slides.length}</span>
                    </div>

                    {/* Slide Content rendering */}
                    <div className="flex-1 flex flex-col justify-center py-4 space-y-3 overflow-y-auto">
                      {slides[currentSlideIndex]?.split("\n").map((line, idx) => {
                        const trimmed = line.trim();
                        if (trimmed.startsWith("## ")) {
                          return (
                            <h2 key={idx} className="text-sm font-black uppercase text-[#ff2a6d] tracking-tight border-l-4 border-[#ff2a6d] pl-2.5 py-0.5 my-1 leading-tight">
                              {trimmed.replace("## ", "")}
                            </h2>
                          );
                        }
                        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                          const content = trimmed.replace(/^[\-\*]\s+/, "");
                          // Parse nested **bold** elements
                          const boldParts = content.split(/\*\*(.*?)\*\*/g);
                          return (
                            <div key={idx} className="flex items-start gap-2 pl-1.5 text-xs">
                              <span className="h-1.5 w-1.5 bg-[#ff2a6d] rounded-full shrink-0 mt-2" />
                              <p className="leading-relaxed font-semibold text-slate-300">
                                {boldParts.map((part, pIdx) => 
                                  pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-black">{part}</strong> : part
                                )}
                              </p>
                            </div>
                          );
                        }
                        if (trimmed.length > 0) {
                          return <p key={idx} className="text-xs text-slate-500 pl-1 leading-relaxed">{trimmed}</p>;
                        }
                        return null;
                      })}
                    </div>

                    {/* Bottom slide pagination control */}
                    <div className="border-t border-slate-800/80 pt-3.5 shrink-0 flex items-center justify-between text-slate-500 text-[11px] select-none">
                      <span className="font-bold">Tema: {presTopic || "Insights Gerais"}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={currentSlideIndex === 0}
                          onClick={() => setCurrentSlideIndex(prev => prev - 1)}
                           className="p-1 rounded-md bg-slate-900 border border-slate-800 hover:border-[#ff2a6d] disabled:opacity-35 transition-all text-slate-500 cursor-pointer"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-mono text-slate-500 font-bold px-1">
                          {currentSlideIndex + 1} / {slides.length}
                        </span>
                        <button
                          disabled={currentSlideIndex === slides.length - 1}
                          onClick={() => setCurrentSlideIndex(prev => prev + 1)}
                           className="p-1 rounded-md bg-slate-900 border border-slate-800 hover:border-[#ff2a6d] disabled:opacity-35 transition-all text-slate-500 cursor-pointer"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-slate-50/20 text-center">
                  <Presentation className="h-10 w-10 opacity-30 text-slate-350 mb-2" />
                  <span className="text-xs font-black uppercase text-slate-500">Nenhuma apresentação formulada</span>
                  <p className="text-[11px] text-slate-500 font-bold uppercase mt-1 leading-normal max-w-xs">
                    Escolha um tema corporativo e clique em Gerar para produzir um pitch deck executivo!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DOCUMENT DETAILED VIEW MODAL */}
      {isDocModalOpen && selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in text-slate-850">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-4xl w-full h-[85vh] p-6 shadow-md flex flex-col gap-4 animate-scale-up relative">
            
            {/* Close button */}
            <button
              onClick={() => {
                setIsDocModalOpen(false);
                setSelectedDoc(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {/* Modal Header */}
            <div className="border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-sm bg-pink-100 border border-pink-200 text-[#ff2a6d] text-[11px] font-black uppercase tracking-wider">
                  {selectedDoc.theme_tag}
                </span>
                <span className="text-[11px] font-mono text-slate-500">ID: {selectedDoc.id}</span>
              </div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight truncate pr-8">
                {selectedDoc.name}
              </h2>
              
              {/* Document metadata badges */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  Responsável: <strong className="text-slate-850">{selectedDoc.user_responsible}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  Data Upload: <strong className="text-slate-850">{new Date(selectedDoc.uploaded_at).toLocaleDateString("pt-BR")}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <FileIcon className="h-3.5 w-3.5 text-slate-500" />
                  Tamanho: <strong className="text-slate-850 font-mono">{formatSize(selectedDoc.file_size)}</strong>
                </span>
              </div>
            </div>

            {/* Modal Scrollable Columns */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 min-h-0">
              
              {/* Left Side: Extracted Raw OCR Text */}
              <div className="flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                <div className="bg-slate-100 border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between shrink-0 select-none">
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-[#ff2a6d]" />
                    Transcrição OCR do Documento Original
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 text-xs font-mono font-medium text-slate-600 leading-relaxed whitespace-pre-wrap select-text selection:bg-[#ff2a6d]/20">
                  {selectedDoc.extracted_text || "Nenhum texto transcrito."}
                </div>
              </div>

              {/* Right Side: AI summary text */}
              <div className="flex flex-col border border-[#ff2a6d]/25 rounded-2xl overflow-hidden bg-pink-50/5">
                <div className="bg-pink-50/30 border-b border-[#ff2a6d]/15 px-3.5 py-2.5 flex items-center justify-between shrink-0 select-none">
                  <span className="text-[11px] font-black text-[#ff2a6d] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-[#ff2a6d]" />
                    Resumo Estruturado por IA (.txt)
                  </span>
                  
                  {/* Action buttons (Copy & Download) */}
                  <div className="flex items-center gap-1.5">
                    {/* Copy summary button */}
                    <button
                      onClick={() => {
                        if (selectedDoc.summary) {
                          navigator.clipboard.writeText(selectedDoc.summary);
                          setCopiedModalSummary(true);
                          setTimeout(() => setCopiedModalSummary(false), 2000);
                        }
                      }}
                      className="p-1 bg-white hover:bg-slate-50 rounded-lg text-[#ff2a6d] border border-pink-100/80 transition-all flex items-center justify-center cursor-pointer"
                      title="Copiar Resumo para Área de Transferência"
                    >
                      {copiedModalSummary ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* Download summary button */}
                    <a
                      href={`data:text/plain;charset=utf-8,${encodeURIComponent(selectedDoc.summary || "")}`}
                      download={`${selectedDoc.name.replace(/\.[^/.]+$/, "")}_resumo.txt`}
                      className="p-1 bg-white hover:bg-slate-50 rounded-lg text-[#ff2a6d] border border-pink-100/80 transition-all flex items-center justify-center cursor-pointer"
                      title="Baixar Resumo em TXT"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 text-xs font-semibold text-slate-750 leading-relaxed space-y-2 whitespace-pre-wrap select-text selection:bg-[#ff2a6d]/20">
                  {/* Render simple markdown styling for the summary */}
                  {selectedDoc.summary?.split("\n\n").map((para, pIdx) => {
                    if (para.startsWith("### ")) {
                      return <h3 key={pIdx} className="text-xs font-black uppercase text-[#ff2a6d] tracking-wide border-b border-pink-100 pb-1 mt-3 first:mt-0">{para.replace("### ", "")}</h3>;
                    }
                    if (para.startsWith("- ") || para.startsWith("* ")) {
                      return (
                        <ul key={pIdx} className="list-disc pl-4 space-y-1.5 my-1 text-slate-700">
                          {para.split("\n").map((li, lIdx) => {
                            const trimmedLi = li.replace(/^[\-\*]\s+/, "");
                            const boldParts = trimmedLi.split(/\*\*(.*?)\*\*/g);
                            return (
                              <li key={lIdx} className="leading-relaxed">
                                {boldParts.map((part, pIdx) => 
                                  pIdx % 2 === 1 ? <strong key={pIdx} className="text-slate-900 font-black">{part}</strong> : part
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      );
                    }
                    const boldParts = para.split(/\*\*(.*?)\*\*/g);
                    return (
                      <p key={pIdx} className="text-slate-700 leading-relaxed">
                        {boldParts.map((part, pIdx) => 
                          pIdx % 2 === 1 ? <strong key={pIdx} className="text-slate-900 font-black">{part}</strong> : part
                        )}
                      </p>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between shrink-0 select-none">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">
                Arquivado via BP-COMPRAS INTEL SYSTEM
              </span>
              <button
                onClick={() => {
                  setIsDocModalOpen(false);
                  setSelectedDoc(null);
                }}
                className="px-5 py-2 border border-slate-200 hover:bg-slate-50 font-black text-[11px] uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Fechar Painel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
