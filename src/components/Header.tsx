import React from "react";
import { Printer, RotateCcw, Calendar, LogOut, Save, FileSpreadsheet, Sparkles, Sun, Moon, Eye, Github, Cloud, CloudOff, Loader2, Check } from "lucide-react";
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
  // Extract strictly the first name
  const firstName = userName ? userName.trim().split(" ")[0] : "Usuário";

  // Clean formatted display CPF
  const displayCpf = userCpf ? userCpf : "000.000.000-00";

  // Sync status badge helper
  const syncBadge = (() => {
    if (!syncStatus || syncStatus === "offline") return null;
    const config = {
      syncing: {
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        label: "Sincronizando",
        bg: "bg-sky-50 border-sky-200 text-sky-700",
        dot: "bg-sky-500 sync-dot-syncing",
      },
      synced: {
        icon: <Check className="h-3 w-3" />,
        label: "Sincronizado",
        bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
        dot: "bg-emerald-500",
      },
      error: {
        icon: <CloudOff className="h-3 w-3" />,
        label: "Erro de sync",
        bg: "bg-rose-50 border-rose-200 text-rose-600",
        dot: "bg-rose-500",
      },
    } as const;
    const c = config[syncStatus as keyof typeof config];
    if (!c) return null;
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${c.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {c.icon}
        <span className="hidden sm:inline">{c.label}</span>
      </div>
    );
  })();

  return (
    <header className={`mb-3 transition-all duration-300 ${activeView !== "cotacao" ? "print:hidden" : ""}`}>
      
      {/* 1. TOP MOST BAR - Brand logo and Operator Pill (visible on mobile only, print:hidden) */}
      <div className="flex items-center justify-between pb-2.5 print:hidden md:hidden">
        {/* FACILITIES BP-COMPRAS Inspired logo layout */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold tracking-tighter text-[#111c2e] select-none">
            FACILITIES <span className="text-[#ff2a6d] font-black">BP-COMPRAS</span>
          </span>
          
          <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#ff2a6d]/10 border border-[#ff2a6d]/20 px-1.5 py-0.5 text-[11px] font-black text-[#ff2a6d] uppercase">
            {activeQuoteId}
          </span>
        </div>

        {/* Top-Right Tools Block including Theme Selector and Operator name */}
        <div className="flex items-center gap-2 print:hidden">
          {/* Segmented Theme Switcher */}
          <div className="flex bg-slate-200/85 rounded-xl p-1 gap-1 border border-slate-300">
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

          {/* Top-Right Profile block (Exactly like the attached image layout) */}
          <div className="flex items-center gap-2 print:hidden select-none">
            <div className="text-right flex flex-col">
              <span className="text-[11px] font-black text-slate-800 tracking-tight leading-none uppercase">
                {firstName}
              </span>
            </div>
            
            {/* Operator Avatar */}
            <div className="h-7 w-7 rounded-lg border border-slate-200/80 overflow-hidden shrink-0 shadow-3xs bg-slate-100">
              <img 
                src="https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&q=80&w=150" 
                alt="Operador" 
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${firstName}&backgroundColor=252a34&textColor=ffffff`;
                }}
              />
            </div>

            {/* Logout Trigger button */}
            <EmojiButton
              iconKey="sair"
              onClick={onLogout}
              size="sm"
              variant="danger"
            />
          </div>
        </div>
      </div>

      {/* 2. PERSISTENT HORIZONTAL BRAND LINE UNDER HEADER (HOT PINK/FUCHSIA AS SEEN IN THE IMAGE) */}
      <div className="h-1 w-full bg-[#ff2a6d] rounded-full mb-3 print:hidden md:hidden" />

      {/* 3. PRINT ONLY REPORT HEADER PAGE-1 INSIDE REPORT PANEL */}
      {activeView === "cotacao" && (
        <div className="hidden print:flex flex-col border-b border-slate-350 pb-2 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-extrabold tracking-tighter text-[#111c2e]">
                FACILITIES <span className="text-[#ff2a6d] font-black">BP-COMPRAS</span>
              </span>
              <div className="h-5 w-[2px] bg-slate-400" />
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#ff2a6d] block leading-none">
                  COTAÇÃO
                </span>
                <h1 className="text-sm font-black tracking-tight text-slate-900 mt-0.5 leading-none">
                  COMPARATIVO
                </h1>
              </div>
            </div>
            <div className="text-right text-[11px] space-y-0.5 leading-tight">
              <p className="font-extrabold text-slate-900">
                ID DA COTAÇÃO: <span className="text-[#ff2a6d] font-black underline">{activeQuoteId}</span>
              </p>
              <p className="font-bold text-slate-800"><span>{userName}</span> ({displayCpf})</p>
              <p className="text-slate-500 font-semibold">Mês de Referência: {quoteDate} • Emitido em: 15/06/2026</p>
            </div>
          </div>

          {/* Highlighted Title and Ticket details for print output */}
          <div className="mt-2 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-450 uppercase text-[11px] font-black tracking-wider">Título do Orçamento:</span>
              <span className="text-slate-900 font-black uppercase">{quoteTitle || "Sem Título"}</span>
            </div>
            <div className="flex items-center gap-1.5 border-l border-slate-300 pl-4">
              <span className="text-slate-450 uppercase text-[11px] font-black tracking-wider">Número do Chamado:</span>
              <span className="text-slate-900 font-mono font-black">{chamadoNumber || "Sem Chamado"}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN ACTION BLOCK - Title on left with fuchsia border line, user profile and themes on right */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-2 border-b border-slate-200/50 print:hidden">
        {/* Title with left pink border mimicking the image section headers */}
        <div className="border-l-4 border-[#ff2a6d] pl-2.5">
          <h2 className="text-sm font-black text-slate-905 uppercase tracking-wide leading-none flex items-center gap-1.5 flex-wrap">
            COTAÇÃO
            {onCategoryClick && (
              <div className="inline-flex items-center gap-2">
                <span className="font-mono text-[11px] bg-[#ff2a6d]/10 border border-[#ff2a6d]/25 text-[#ff2a6d] px-2 py-1 rounded-md font-extrabold uppercase tracking-wide">
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
            <span className="font-mono text-[11px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-sm normal-case font-extrabold tracking-normal">
              # {activeQuoteId}
            </span>
          </h2>
          <p className="text-[11px] text-slate-450 mt-1 font-semibold leading-none">
            Otimização de orçamentos
          </p>
        </div>

        {/* Right tools side: Theme selection, username, and logout button on the same line */}
        <div className="flex flex-wrap items-center gap-2.5">

          {/* Sync Status Badge */}
          {syncBadge}

          {/* Calendar reference month (neatly placed) */}
          {onDateChange && (
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-3xs hover:border-slate-350 transition-all">
              <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <input
                type="text"
                value={quoteDate}
                onChange={(e) => onDateChange(e.target.value)}
                placeholder="jul/26"
                className="w-12 border-0 bg-transparent p-0 text-[11px] font-black text-slate-800 outline-hidden focus:ring-0 leading-none uppercase font-mono"
                title="Mês de Referência da Cotação"
              />
            </div>
          )}

          {/* Theme switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 gap-1 border border-slate-200 dark:border-slate-700">
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

          {/* GitHub Troubleshooter button */}
          {onGithubClick && (
            <button
              onClick={onGithubClick}
              className="flex items-center justify-center p-1.5 h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#ff2a6d]/40 bg-white dark:bg-slate-900 text-slate-750 hover:text-[#ff2a6d] dark:text-slate-350 dark:hover:text-[#ff2a6d] transition-all cursor-pointer shadow-3xs"
              title="Diagnosticar e Solucionar Conectividade com GitHub"
            >
              <Github className="h-4 w-4 shrink-0" />
            </button>
          )}

          {/* User profile with initials card & logout button */}
          <div className="flex items-center gap-2 select-none border-l border-slate-200 pl-3">
            <div className="h-7 w-7 rounded-lg border border-slate-200/80 overflow-hidden shrink-0 shadow-3xs bg-slate-100">
              <img 
                src="https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&q=80&w=150" 
                alt="Operador" 
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${firstName}&backgroundColor=252a34&textColor=ffffff`;
                }}
              />
            </div>
            <div className="text-left flex flex-col">
              <span className="text-[11px] font-black text-slate-800 tracking-tight leading-none uppercase">
                {firstName}
              </span>
              <span className="text-[11px] font-bold text-slate-500 mt-0.5 leading-none">
                ID: {displayCpf}
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
    </header>
  );
}
