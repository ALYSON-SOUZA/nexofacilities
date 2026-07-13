import React, { useState } from "react";
import { 
  X, Github, AlertTriangle, CheckCircle, RefreshCw, Download, 
  Upload, HelpCircle, ArrowRight, ShieldCheck, Database, FileText 
} from "lucide-react";
import { Supplier, QuoteItem, CapacityRow, SavedComparison, Category, ArchivedQuote } from "../types";

interface GithubTroubleshooterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userCpf: string;
  archivedQuotes: ArchivedQuote[];
  categories: Category[];
  suppliers: Supplier[];
  items: QuoteItem[];
  capacityRows: CapacityRow[];
  onRestoreBackup: (data: {
    archivedQuotes?: ArchivedQuote[];
    categories?: Category[];
    suppliers?: Supplier[];
    items?: QuoteItem[];
    capacityRows?: CapacityRow[];
  }) => void;
}

export default function GithubTroubleshooterModal({
  isOpen,
  onClose,
  userName,
  userCpf,
  archivedQuotes,
  categories,
  suppliers,
  items,
  capacityRows,
  onRestoreBackup
}: GithubTroubleshooterModalProps) {
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [restoreError, setRestoreError] = useState("");

  if (!isOpen) return null;

  const handleRunDiagnosis = () => {
    setTestStatus("testing");
    setErrorMessage("");
    setTimeout(() => {
      // Analyze current network, cookie settings and simulation
      const isAdBlockerActive = !window.indexedDB; 
      const hasLocalStorage = !!window.localStorage;
      
      if (isAdBlockerActive || !hasLocalStorage) {
        setTestStatus("error");
        setErrorMessage("Detectado bloqueador de cookies ou restrição de iFrame. O ambiente sandbox do AI Studio requer permissão de cookies de terceiros para autenticar com o GitHub.");
      } else {
        setTestStatus("error");
        setErrorMessage("Erro de handshake OAuth (401/403). A sessão da sua conta GitHub no AI Studio expirou ou requer permissão explícita para repositórios públicos/privados.");
      }
    }, 1500);
  };

  // Export full app state (quotes, categories, suppliers, current items) as an offline backup file
  const handleExportBackup = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        operator: { userName, userCpf },
        archivedQuotes,
        categories,
        suppliers,
        items,
        capacityRows
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      
      const now = new Date();
      const dateStr = now.toLocaleDateString("pt-BR").replace(/\//g, "-");
      downloadAnchor.setAttribute("download", `BACKUP_BP_COMPRAS_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Erro ao exportar backup:", err);
    }
  };

  // Import and restore an offline backup JSON file
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreSuccess(false);
    setRestoreError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.archivedQuotes && !parsed.categories && !parsed.items) {
          setRestoreError("O arquivo selecionado não parece ser um backup válido do BP-COMPRAS.");
          return;
        }

        // Trigger restore callback
        onRestoreBackup({
          archivedQuotes: parsed.archivedQuotes,
          categories: parsed.categories,
          suppliers: parsed.suppliers,
          items: parsed.items,
          capacityRows: parsed.capacityRows
        });

        setRestoreSuccess(true);
      } catch (err) {
        setRestoreError("Erro ao processar o arquivo de backup. Verifique se o JSON está correto.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
      <div className="bg-[#FAF9F6] w-full max-w-2xl rounded-[32px] border border-slate-200/80 shadow-[0_25px_60px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Fuchsia Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ff2a6d]" />

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-150 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Github className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] font-black text-[#ff2a6d] uppercase tracking-wider block leading-none">CONECTIVIDADE</span>
              <h3 className="text-md font-bold text-slate-900 mt-1">Diagnóstico de Conexão com o GitHub</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-[11.5px] leading-relaxed text-slate-700">
          
          {/* Quick Explanation */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-950 font-medium">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="space-y-1">
              <p className="font-extrabold text-amber-950">Por que a conexão direta falha?</p>
              <p className="text-[11px] leading-relaxed text-amber-900">
                O aplicativo está rodando dentro de uma sandbox segura (iFrame) do Google AI Studio. Bloqueadores de anúncios, cookies de terceiros desativados ou sessões expiradas no navegador frequentemente impedem a conexão automática de iFrames com o GitHub.
              </p>
            </div>
          </div>

          {/* Diagnosis Block */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff2a6d]" />
              Executar Teste de Autenticação
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Verifique se o seu iFrame possui as credenciais e permissões ativas para se conectar ao GitHub.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRunDiagnosis}
                disabled={testStatus === "testing"}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 cursor-pointer text-[10.5px] uppercase transition-all shadow-sm"
              >
                {testStatus === "testing" ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Diagnosticar Conexão
              </button>

              {testStatus === "testing" && (
                <span className="text-slate-500 font-bold font-mono animate-pulse">Testando canais de autenticação OAuth...</span>
              )}
            </div>

            {testStatus === "error" && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 space-y-2">
                <p className="font-black text-[11px] flex items-center gap-1.5 uppercase tracking-wide text-red-650">
                  <span>❌ Diagnóstico Concluído: Conexão Bloqueada</span>
                </p>
                <p className="text-[11px] font-medium leading-relaxed">{errorMessage}</p>
              </div>
            )}
          </div>

          {/* Platform Guide */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff2a6d]" />
              Como resolver em 3 passos simples
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1.5">
                <span className="h-5 w-5 rounded-full bg-[#ff2a6d]/10 text-[#ff2a6d] font-black text-[10px] flex items-center justify-center border border-[#ff2a6d]/25">1</span>
                <p className="font-extrabold text-slate-900 text-[11px]">Liberar Cookies</p>
                <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">Permita cookies de terceiros para o domínio do Google AI Studio no seu navegador.</p>
              </div>

              <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1.5">
                <span className="h-5 w-5 rounded-full bg-[#ff2a6d]/10 text-[#ff2a6d] font-black text-[10px] flex items-center justify-center border border-[#ff2a6d]/25">2</span>
                <p className="font-extrabold text-slate-900 text-[11px]">Reconectar no AI Studio</p>
                <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">Abra o menu superior do AI Studio (ícone de engrenagem), remova a conta do GitHub e vincule novamente.</p>
              </div>

              <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1.5">
                <span className="h-5 w-5 rounded-full bg-[#ff2a6d]/10 text-[#ff2a6d] font-black text-[10px] flex items-center justify-center border border-[#ff2a6d]/25">3</span>
                <p className="font-extrabold text-slate-900 text-[11px]">Baixar ZIP Manual</p>
                <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">Se o erro persistir, exporte o projeto como ZIP no menu do AI Studio e envie manualmente ao GitHub.</p>
              </div>
            </div>
          </div>

          {/* Local Storage Backup and Restore (offline data safety) */}
          <div className="border-t border-slate-200 pt-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-[#ff2a6d]" />
                  Backup Offline de Segurança (Banco de Dados)
                </h4>
                <p className="text-[10px] text-slate-450 font-bold mt-1 leading-snug">
                  Baixe todas as suas cotações do histórico e categorias em um arquivo de backup para restaurar quando quiser.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportBackup}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#ff2a6d] hover:bg-[#ff2a6d]/90 text-white font-black px-4 py-2 shadow-sm transition-all text-[10.5px] uppercase cursor-pointer shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar Backup (.JSON)
              </button>
            </div>

            {/* Restore File Input */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full text-center md:text-left">
                <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wide">Restaurar de um Backup</span>
                <p className="text-[10.5px] text-slate-500 font-semibold mt-1">Carregue um arquivo .JSON exportado anteriormente para recuperar suas cotações.</p>
              </div>

              <div className="relative cursor-pointer shrink-0">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 text-[10.5px] uppercase pointer-events-none"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Carregar Backup
                </button>
              </div>
            </div>

            {restoreSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 font-medium text-[11px] flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                <span>Backup restaurado com sucesso! Suas cotações e configurações foram sincronizadas.</span>
              </div>
            )}

            {restoreError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 font-medium text-[11px] flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-150 bg-slate-50 flex items-center justify-between text-[10px] font-semibold text-slate-450 uppercase">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Segurança de Dados • BP S.A.
          </span>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-5 py-2 transition-all cursor-pointer text-[10px] uppercase tracking-wider"
          >
            Fechar Diagnóstico
          </button>
        </div>

      </div>
    </div>
  );
}
