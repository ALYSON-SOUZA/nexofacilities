import React from "react";
import { Calendar, Loader2, Check, CloudOff, Github } from "lucide-react";
import { EmojiButton } from "./EmojiButton";

interface HeaderProps {
  quoteDate?: string;
  userName: string;
  userCpf: string;
  activeQuoteId: string;
  chamadoNumber?: string;
  quoteTitle?: string;
  onDateChange?: (date: string) => void;
  onReset?: () => void;
  onPrint?: () => void;
  onLogout: () => void;
  onSaveComparison?: () => void;
  onNewQuote?: () => void;
  hasHistory?: boolean;
  activeCategoryName?: string;
  onCategoryClick?: () => void;
  syncStatus?: "synced" | "syncing" | "error" | "offline";
  onAiClick?: () => void;
  onGithubClick?: () => void;
  activeView: "cotacao" | "estoque" | "normativa" | "docs" | "ronda";
  onViewChange: (view: "cotacao" | "estoque" | "normativa" | "docs" | "ronda") => void;
  visualTheme: "light" | "comfort" | "ultradark";
  onThemeChange: (theme: "light" | "comfort" | "ultradark") => void;
}

export default function Header({
  quoteDate,
  userName,
  userCpf,
  activeQuoteId,
  chamadoNumber,
  quoteTitle,
  onDateChange,
  onReset,
  onPrint,
  onLogout,
  onSaveComparison,
  onNewQuote,
  hasHistory,
  activeCategoryName = "Material de Limpeza e Higiene",
  onCategoryClick,
  syncStatus,
  onAiClick,
  onGithubClick,
  activeView,
  onViewChange,
  visualTheme,
  onThemeChange,
}: HeaderProps) {
  const firstName = userName ? userName.trim().split(" ")[0] : "Usuário";
  const displayCpf = userCpf ? userCpf : "000.000.000-00";

  const syncBadge = (() => {
    if (!syncStatus || syncStatus === "offline") return null;
    const config = {
      syncing: {
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        label: "Sincronizando",
        bg: "bg-blue-50 border-blue-200 text-blue-600",
        dot: "bg-blue-500 sync-dot-syncing",
      },
      synced: {
        icon: <Check className="h-3 w-3" />,
        label: "Sincronizado",
        bg: "bg-green-50 border-green-200 text-green-600",
        dot: "bg-green-500",
      },
      error: {
        icon: <CloudOff className="h-3 w-3" />,
        label: "Erro de sync",
        bg: "bg-red-50 border-red-200 text-red-500",
        dot: "bg-red-500",
      },
    } as const;
    const c = config[syncStatus as keyof typeof config];
    if (!c) return null;
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-150 ${c.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {c.icon}
        <span className="hidden sm:inline">{c.label}</span>
      </div>
    );
  })();

  return (
    <header className={`${activeView !== "cotacao" ? "print:hidden" : ""}`}>
      
      {/* 1. MOBILE TOP BAR */}
      <div className="flex items-center justify-between pb-3 print:hidden md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-slate-900 select-none">
            FACILITIES <span className="text-blue-600 font-bold">BP</span>
          </span>
          <span className="badge-premium badge-premium-pink">
            {activeQuoteId}
          </span>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <div className="flex bg-slate-100 rounded-md p-0.5 gap-0.5 border border-slate-200">
            <EmojiButton
              iconKey="temaClaro"
              onClick={() => onThemeChange("light")}
              size="sm"
              variant={visualTheme === "light" ? "primary" : "neutral"}
            />
            <EmojiButton
              iconKey="temaSepia"
              onClick={() => onThemeChange("comfort")}
              size="sm"
              variant={visualTheme === "comfort" ? "warning" : "neutral"}
            />
            <EmojiButton
              iconKey="temaEscuro"
              onClick={() => onThemeChange("ultradark")}
              size="sm"
              variant={visualTheme === "ultradark" ? "primary" : "neutral"}
            />
          </div>

          <div className="flex items-center gap-2 print:hidden select-none">
            <div className="text-right flex flex-col">
              <span className="text-xs font-semibold text-slate-700 tracking-tight leading-none uppercase">
                {firstName}
              </span>
            </div>
            <EmojiButton
              iconKey="sair"
              onClick={onLogout}
              size="sm"
              variant="danger"
            />
          </div>
        </div>
      </div>

      {/* 2. ACCENT LINE */}
      <div className="h-px bg-slate-200 w-full mb-4 print:hidden md:hidden" />

      {/* 3. PRINT ONLY REPORT HEADER */}
      {activeView === "cotacao" && (
        <div className="hidden print:flex flex-col border-b border-slate-200 pb-2 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold tracking-tight text-slate-900">
                FACILITIES <span className="text-blue-600">BP</span>
              </span>
              <div className="h-5 w-px bg-slate-300" />
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block leading-none">
                  COTAÇÃO
                </span>
                <h1 className="text-sm font-bold tracking-tight text-slate-900 mt-0.5 leading-none">
                  COMPARATIVO
                </h1>
              </div>
            </div>
            <div className="text-right text-xs space-y-0.5 leading-tight">
              <p className="font-semibold text-slate-900">
                ID: <span className="text-blue-600 font-bold underline">{activeQuoteId}</span>
              </p>
              <p className="font-semibold text-slate-700"><span>{userName}</span> ({displayCpf})</p>
              <p className="text-slate-400 font-medium">Mês de Referência: {quoteDate} • Emitido em: 15/06/2026</p>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 uppercase text-xs font-semibold tracking-wider">Título:</span>
              <span className="text-slate-900 font-bold uppercase">{quoteTitle || "Sem Título"}</span>
            </div>
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
              <span className="text-slate-400 uppercase text-xs font-semibold tracking-wider">Chamado:</span>
              <span className="text-slate-900 font-mono font-bold">{chamadoNumber || "Sem Chamado"}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. HEADER CONTENT */}
      <div className="print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
          {/* Left: Title + Category */}
          <div className="flex items-center gap-2 md:gap-3 min-w-0 shrink-0">
            <div className="border-l-2 border-slate-300 pl-3 py-0.5 min-w-0">
              <h2 className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wide leading-none flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {activeView === "cotacao" ? "COTAÇÃO" : activeView === "estoque" ? "ESTOQUE" : activeView === "normativa" ? "NORMATIVA" : activeView === "docs" ? "DOCUMENTOS" : "RONDA"}
                {onCategoryClick && activeView === "cotacao" && (
                  <div className="inline-flex items-center gap-1.5 sm:gap-2">
                    <span className="bp-badge bp-badge-navy hidden sm:inline-flex">
                      {activeCategoryName}
                    </span>
                    <EmojiButton
                      iconKey="cotacao"
                      onClick={onCategoryClick}
                      size="sm"
                      variant="neutral"
                    />
                  </div>
                )}
                <span className="bp-badge bp-badge-slate">
                  #{activeQuoteId}
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-1 font-medium leading-none">
                Otimização de orçamentos
              </p>
            </div>
          </div>

          {/* Right: Tools */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
            {syncBadge}

            {onDateChange && activeView === "cotacao" && (
              <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 sm:px-2.5 sm:py-1.5 cursor-default">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={quoteDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  placeholder="jul/26"
                  className="w-10 sm:w-12 border-0 bg-transparent p-0 text-[10px] sm:text-xs font-mono font-semibold text-slate-700 outline-none focus:ring-0 leading-none uppercase"
                  title="Mês de Referência da Cotação"
                />
              </div>
            )}

            <div className="flex bg-slate-100 rounded-md p-0.5 sm:p-1 gap-0.5 border border-slate-200 transition-colors">
              <EmojiButton
                iconKey="temaClaro"
                onClick={() => onThemeChange("light")}
                size="sm"
                variant={visualTheme === "light" ? "primary" : "neutral"}
              />
              <EmojiButton
                iconKey="temaSepia"
                onClick={() => onThemeChange("comfort")}
                size="sm"
                variant={visualTheme === "comfort" ? "warning" : "neutral"}
              />
              <EmojiButton
                iconKey="temaEscuro"
                onClick={() => onThemeChange("ultradark")}
                size="sm"
                variant={visualTheme === "ultradark" ? "primary" : "neutral"}
              />
            </div>

            {onGithubClick && (
              <button
                onClick={onGithubClick}
                className="hidden sm:flex items-center justify-center p-1.5 h-7 w-7 sm:h-8 sm:w-8 rounded-md border border-slate-200 hover:border-slate-300 bg-white text-slate-500 hover:text-slate-700 transition-all duration-150 cursor-pointer"
                title="Diagnosticar Conectividade"
              >
                <Github className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 select-none border-l border-slate-200 pl-2 sm:pl-3">
              <div className="text-right flex flex-col">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-700 tracking-tight leading-none uppercase">
                  {firstName}
                </span>
                <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 mt-0.5 leading-none">
                  ID: {displayCpf}
                </span>
              </div>
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-slate-200 overflow-hidden shrink-0 bg-slate-100">
                <img 
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${firstName}&backgroundColor=f1f5f9&textColor=475569`}
                  alt="Operador" 
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>

              <EmojiButton
                iconKey="sair"
                onClick={onLogout}
                size="sm"
                variant="danger"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
