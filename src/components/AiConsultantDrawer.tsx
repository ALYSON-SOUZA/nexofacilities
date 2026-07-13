import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, X, AlertTriangle, HelpCircle, TrendingDown, Check, 
  ChevronRight, RefreshCw, ShoppingBag, ShieldAlert, Award, ArrowUpRight
} from "lucide-react";
import { QuoteItem, Supplier, ArchivedQuote } from "../types";

interface ConsistencyIssue {
  itemName: string;
  issueType: string;
  description: string;
  severity: "low" | "medium" | "high";
  suggestedFix: string;
}

interface SavingSuggestion {
  title: string;
  description: string;
  estimatedSavings: string;
  alternatives?: string[];
}

interface ServiceRecommendation {
  serviceName: string;
  description: string;
  whyItFits: string;
}

interface AiAnalysisResult {
  consistencyIssues: ConsistencyIssue[];
  savingSuggestions: SavingSuggestion[];
  serviceRecommendations: ServiceRecommendation[];
}

interface AiConsultantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: QuoteItem[];
  suppliers: Supplier[];
  activeCategoryName: string;
  archivedQuotes: ArchivedQuote[];
}

const CYCLING_MESSAGES = [
  "Avaliando itens e embalagens...",
  "Analisando discrepâncias nos preços fornecidos...",
  "Checando consistência das unidades físicas...",
  "Cruzando informações com compras anteriores...",
  "Formatando propostas de economia de facilities...",
  "Identificando oportunidades de redução de custo..."
];

export default function AiConsultantDrawer({
  isOpen,
  onClose,
  items,
  suppliers,
  activeCategoryName,
  archivedQuotes
}: AiConsultantDrawerProps) {
  const [activeTab, setActiveTab] = useState<"alerts" | "savings" | "services">("alerts");
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cycle through loading messages while thinking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % CYCLING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Trigger analysis when opened for the first time
  useEffect(() => {
    if (isOpen && !result && !loading && items.length > 0) {
      handleAnalyze();
    }
  }, [isOpen]);

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingMsgIdx(0);

      const response = await fetch("/api/gemini/analyze-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
          suppliers,
          categoryName: activeCategoryName,
          historicalQuotes: archivedQuotes
        }),
      });

      if (!response.ok) {
        throw new Error("Erro na solicitação com o servidor de IA.");
      }

      const data = await response.json();
      setResult(data);
      // Automatically switch to first populated tab or defaults
      if (data.consistencyIssues && data.consistencyIssues.length > 0) {
        setActiveTab("alerts");
      } else if (data.savingSuggestions && data.savingSuggestions.length > 0) {
        setActiveTab("savings");
      }
    } catch (err: any) {
      setError(err?.message || "Algo deu errado durante a análise.");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-rose-50 border border-rose-200 text-rose-700 font-bold";
      case "medium":
        return "bg-amber-50 border border-amber-200 text-amber-700 font-bold";
      default:
        return "bg-slate-50 border border-slate-200 text-slate-700 font-medium";
    }
  };

  const hasAlerts = result?.consistencyIssues && result.consistencyIssues.length > 0;
  const hasSavings = result?.savingSuggestions && result.savingSuggestions.length > 0;
  const hasServices = result?.serviceRecommendations && result.serviceRecommendations.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs print:hidden"
          />

          {/* Sliding Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col font-sans print:hidden border-l border-slate-200"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <div className="p-1 px-1.5 rounded-lg bg-[#ff2a6d]/25 border border-[#ff2a6d]/40 flex items-center justify-center animate-pulse">
                  <Sparkles className="h-4 w-4 text-[#ff2a6d]" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight uppercase">Assistente de IA</h3>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Consultoria em Facilities</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Recarregar análise da IA"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Inner Content Scroller */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {loading ? (
                /* Dynamic Loading Screen with Cycle Messages */
                <div className="h-full flex flex-col items-center justify-center py-12 px-6 space-y-4">
                  <div className="relative flex items-center justify-center h-16 w-16">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#ff2a6d]/20 animate-ping" />
                    <div className="rounded-full bg-slate-900 border border-slate-700/50 h-10 w-10 flex items-center justify-center text-white">
                      <Sparkles className="h-5 w-5 text-[#ff2a6d] animate-spin" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-black uppercase text-slate-800 tracking-wider">Consultando Gemini AI</p>
                    <p className="text-xs text-slate-500 font-medium h-5 animate-pulse">
                      {CYCLING_MESSAGES[loadingMsgIdx]}
                    </p>
                  </div>
                </div>
              ) : error ? (
                /* Error Handler card */
                <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 space-y-3">
                  <div className="flex items-start gap-2.5 text-rose-700">
                    <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-rose-900">Falha ao processar dados</h4>
                      <p className="text-[10px] text-rose-700 font-medium leading-relaxed mt-1">
                        {error}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    className="w-full text-center bg-rose-100/80 hover:bg-rose-150 border border-rose-200 p-2 text-xs font-bold text-rose-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Reavaliar Novamente
                  </button>
                </div>
              ) : result ? (
                /* Main Diagnostic Report View */
                <div className="space-y-4">
                  {/* Category Pill Summary Badge */}
                  <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>Análise Atualizada</span>
                      <span className="text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-[5px] border border-emerald-100 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Concluído
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 mt-1 uppercase">
                      {activeCategoryName || "Geral"}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                      Sua cotação possui <strong className="text-slate-700">{items.length} itens</strong> com marcas e orçamentos de <strong className="text-slate-700">{suppliers.length} fornecedores</strong>.
                    </p>
                  </div>

                  {/* IA Tabs Navigation */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setActiveTab("alerts")}
                      className={`py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                        activeTab === "alerts"
                          ? "bg-white shadow-xs text-slate-900"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Alertas ({result.consistencyIssues?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab("savings")}
                      className={`py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                        activeTab === "savings"
                          ? "bg-white shadow-xs text-slate-900"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Ajustes ({result.savingSuggestions?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab("services")}
                      className={`py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                        activeTab === "services"
                          ? "bg-white shadow-xs text-slate-900"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Serviços ({result.serviceRecommendations?.length || 0})
                    </button>
                  </div>

                  {/* ACTIVE TAB ITEMS DISPLAY */}
                  {activeTab === "alerts" && (
                    <div className="space-y-2.5">
                      {!hasAlerts ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center space-y-2">
                          <div className="mx-auto rounded-full bg-emerald-50 h-8 w-8 flex items-center justify-center text-emerald-600">
                            <Check className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase">Tudo certo com os itens!</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-1">
                              Nenhuma inconsistência de unidade ou divergência séria de preço foi detectada na cotação ativa.
                            </p>
                          </div>
                        </div>
                      ) : (
                        result.consistencyIssues.map((issue, idx) => (
                          <div key={idx} className="bg-white rounded-xl border border-slate-100 p-3.5 shadow-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[250px]">
                                {issue.itemName}
                              </span>
                              <span className={`px-2 py-0.5 rounded-[4px] text-[8.5px] uppercase tracking-wider ${getSeverityBadge(issue.severity)}`}>
                                {issue.severity === "high" ? "Grave" : issue.severity === "medium" ? "Moderado" : "Leve"}
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                              {issue.description}
                            </p>

                            <div className="pt-2 border-t border-slate-50 bg-slate-50/50 rounded-lg p-2.5">
                              <span className="text-[8.5px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                                Ajuste Recomendado:
                              </span>
                              <p className="text-[10px] text-cyan-950 font-semibold leading-relaxed">
                                {issue.suggestedFix}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === "savings" && (
                    <div className="space-y-2.5">
                      {!hasSavings ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center">
                          <p className="text-xs font-bold text-slate-500">Sem dicas de otimização disponíveis.</p>
                        </div>
                      ) : (
                        result.savingSuggestions.map((sug, idx) => (
                          <div key={idx} className="bg-white rounded-xl border border-slate-100 p-3.5 shadow-xs space-y-3">
                            <div className="flex items-start justify-between gap-1.5">
                              <div>
                                <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-tight flex items-center gap-1">
                                  <TrendingDown className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                  {sug.title}
                                </h5>
                              </div>
                              <span className="shrink-0 inline-flex items-center rounded-md bg-[#ff2a6d]/10 border border-[#ff2a6d]/20 px-2 py-0.5 text-[9px] font-black text-[#ff2a6d] uppercase">
                                economize {sug.estimatedSavings}
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                              {sug.description}
                            </p>

                            {sug.alternatives && sug.alternatives.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {sug.alternatives.map((alt, aIdx) => (
                                  <span key={aIdx} className="text-[9px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-[4px] flex items-center gap-1">
                                    <ShoppingBag className="h-3 w-3 text-slate-500" />
                                    {alt}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === "services" && (
                    <div className="space-y-2.5">
                      {!hasServices ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center">
                          <p className="text-xs font-bold text-slate-500">Sem indicações de serviços.</p>
                        </div>
                      ) : (
                        result.serviceRecommendations.map((svc, idx) => (
                          <div key={idx} className="bg-white rounded-xl border border-slate-100 p-3.5 shadow-xs space-y-2.5">
                            <h5 className="text-[11.5px] font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                              <Award className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                              {svc.serviceName}
                            </h5>

                            <p className="text-[10px] text-slate-600 font-normal leading-relaxed">
                              {svc.description}
                            </p>

                            <div className="bg-cyan-50/50 border border-cyan-100/50 rounded-lg p-2.5">
                              <span className="text-[8.5px] font-black uppercase text-cyan-600 tracking-wider flex items-center gap-1">
                                <ArrowUpRight className="h-3 w-3" /> Por que faz sentido comprar:
                              </span>
                              <p className="text-[10px] text-cyan-900 font-semibold leading-relaxed mt-1">
                                {svc.whyItFits}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Static view if there is items but no output has loaded */
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3.5 py-12">
                  <div className="p-3.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase">Consultoria em tempo real</h4>
                    <p className="text-[10.5px] text-slate-500 font-medium mt-1 leading-relaxed">
                      Clique no botão abaixo para permitir que o modelo Gemini avalie marcas, embalagens e preços indicando de forma inteligente os melhores ajustes comerciais.
                    </p>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    className="bg-[#ff2a6d] hover:bg-[#c21e54] text-white px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-colors w-full"
                  >
                    Analisar Cotação com IA
                  </button>
                </div>
              )}
            </div>

            {/* Footer containing help text */}
            <div className="border-t border-slate-100 p-3.5 bg-slate-50 text-center text-[9px] text-slate-500 font-bold uppercase tracking-wider select-none">
              FACILITIES BP-COMPRAS INTEL · GEMINI PRO POWERED
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
