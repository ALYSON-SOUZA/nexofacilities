import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, 
  Search, 
  HelpCircle, 
  Send, 
  Mic, 
  MicOff, 
  ChevronRight, 
  MessageSquare, 
  Check, 
  AlertCircle, 
  Info, 
  X,
  RefreshCw,
  Compass,
  ArrowLeft,
  Briefcase,
  Printer,
  ChevronDown
} from "lucide-react";
import { NORMATIVA_SECTIONS, NormativaSection, NormativaSubSection } from "../data/normativa_data";
import { EmojiButton } from "./EmojiButton";

// Type definitions for Chat Messages
interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

interface NormativaViewProps {
  onBack: () => void;
  visualTheme: "light" | "comfort" | "ultradark";
}

export default function NormativaView({ onBack, visualTheme }: NormativaViewProps) {
  // Navigation states
  const [selectedSectionId, setSelectedSectionId] = useState<string>("sec-1");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeSubTab, setActiveSubTab] = useState<number>(0);

  // Chat/Tutor states
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string>("");

  // Refs for scroll and voice
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Get currently active section
  const activeSection = NORMATIVA_SECTIONS.find(s => s.id === selectedSectionId) || NORMATIVA_SECTIONS[0];

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isAiLoading]);

  // Handle active section change to reset subtab
  useEffect(() => {
    setActiveSubTab(0);
  }, [selectedSectionId]);

  // Scroll tracking to auto-highlight active section in sidebar index
  useEffect(() => {
    const container = document.getElementById("normativa-scroll-container");
    if (!container) return;

    const handleScroll = () => {
      const sections = container.querySelectorAll(".section-block");
      let currentActiveId = "";
      let closestDistance = Infinity;

      sections.forEach((sec: any) => {
        const rect = sec.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const distance = rect.top - containerRect.top;
        
        if (distance <= 120) {
          const absDist = Math.abs(distance);
          if (absDist < closestDistance) {
            closestDistance = absDist;
            currentActiveId = sec.id;
          }
        }
      });

      if (currentActiveId && currentActiveId !== selectedSectionId) {
        setSelectedSectionId(currentActiveId);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [selectedSectionId]);

  // Set up Speech Recognition on mount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "pt-BR";

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => (prev ? prev + " " + transcript : transcript));
        }
      };

      const handleSpeechError = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      rec.onerror = handleSpeechError;
      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Navegador não suporta gravação de áudio por voz.");
      setTimeout(() => setSpeechError(""), 4000);
      return;
    }

    try {
      if (isRecording) {
        recognitionRef.current?.stop();
        setIsRecording(false);
      } else {
        setSpeechError("");
        recognitionRef.current?.start();
      }
    } catch (e) {
      console.error("Error starting speech recognition:", e);
    }
  };

  // Filter sections by search query
  const filteredSections = NORMATIVA_SECTIONS.filter(sec => {
    const matchesTitle = sec.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNumber = sec.number.includes(searchQuery);
    const matchesContent = sec.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubsections = sec.subsections?.some(sub => 
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      sub.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesTitle || matchesNumber || matchesContent || matchesSubsections;
  });

  // Render HTML safely
  const renderHtml = (htmlStr: string) => {
    return <div dangerouslySetInnerHTML={{ __html: htmlStr }} />;
  };

  // Chat message submission
  const handleSendMessage = async (textToSend?: string) => {
    const finalQuery = (textToSend || inputText).trim();
    if (!finalQuery) return;

    if (!textToSend) {
      setInputText("");
    }

    // Add user message to history
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: finalQuery,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    setChatHistory(prev => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
      // Gather normative context to pass to backend
      const simplifiedContext = NORMATIVA_SECTIONS.map(s => ({
        chapter: `${s.number} - ${s.title}`,
        content: s.content || "",
        subsections: s.subsections?.map(sub => `${sub.number || ""} ${sub.title}: ${sub.content}`) || []
      }));

      const res = await fetch("/api/gemini/normativa-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: finalQuery,
          chatHistory: chatHistory.map(h => ({ role: h.role, text: h.text })),
          normativaContext: simplifiedContext
        })
      });

      if (!res.ok) throw new Error("Erro na comunicação com o servidor.");

      const data = await res.json();

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: data.answer || "Desculpe, ocorreu um erro ao gerar a resposta.",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };

      setChatHistory(prev => [...prev, modelMsg]);
    } catch (e: any) {
      console.error(e);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: "⚠️ **Erro de Conexão:** Não consegui me comunicar com o servidor. Por favor, verifique se o servidor de desenvolvimento está ativo.",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
  };

  // Parse markdown for chatbot response (simple rendering for bold, bullet lists, titles)
  const formatTutorMarkdown = (text: string) => {
    const lines = text.split("\n");
    return (
      <div className="space-y-2 text-xs leading-relaxed">
        {lines.map((line, idx) => {
          let renderedLine = line.trim();
          
          if (!renderedLine) {
            return <div key={idx} className="h-1" />;
          }

          // Headers
          if (renderedLine.startsWith("###")) {
            return (
              <h4 key={idx} className="text-xs font-black text-slate-900 mt-3 mb-1 uppercase tracking-tight flex items-center gap-1">
                {renderedLine.replace("###", "").trim()}
              </h4>
            );
          }
          if (renderedLine.startsWith("##") || renderedLine.startsWith("#")) {
            return (
              <h3 key={idx} className="text-xs font-black text-[#3b82f6] mt-4 mb-1.5 uppercase tracking-wide border-b border-slate-100 pb-0.5">
                {renderedLine.replace(/^#+/, "").trim()}
              </h3>
            );
          }

          // Bullet points
          if (renderedLine.startsWith("*") || renderedLine.startsWith("-")) {
            const cleanContent = renderedLine.replace(/^[*+-]/, "").trim();
            return (
              <ul key={idx} className="list-disc pl-4 space-y-1 my-0.5">
                <li className="text-slate-700">
                  {parseBoldText(cleanContent)}
                </li>
              </ul>
            );
          }

          // Numbered lists
          if (/^\d+\./.test(renderedLine)) {
            const numberMatch = renderedLine.match(/^(\d+\.)/);
            const cleanContent = renderedLine.replace(/^\d+\./, "").trim();
            return (
              <div key={idx} className="flex gap-2.5 my-1 items-start pl-1">
                <span className="font-black text-[#3b82f6] shrink-0 font-mono text-xs">{numberMatch ? numberMatch[0] : ""}</span>
                <p className="text-slate-700 flex-1">{parseBoldText(cleanContent)}</p>
              </div>
            );
          }

          return <p key={idx} className="text-slate-750">{parseBoldText(renderedLine)}</p>;
        })}
      </div>
    );
  };

  // Helper parser for bold text "**text**" -> "<strong>text</strong>"
  const parseBoldText = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      // Alternate normal text and bold text
      return index % 2 === 1 ? <strong key={index} className="font-extrabold text-slate-900">{part}</strong> : part;
    });
  };

  // Suggested questions
  const SUGGESTED_QUESTIONS = [
    { text: "Zeladora: como ganhar o bônus?", query: "Zeladoras: como funciona o bônus de R$ 90?" },
    { text: "Uber: cadastrar no Módulo 353", query: "Uber: como fazer o lançamento fiscal no Módulo 353?" },
    { text: "Correios: pré-postagem", query: "Correios: como fazer a pré-postagem no SGPWeb?" },
    { text: "Salas: prazo de agendamento", query: "Salas de treinamento: qual o prazo e regras para reservar?" },
    { text: "Almoço: como funciona o voucher?", query: "Almoço corporativo com contratante: como emitir voucher?" }
  ];

  return (
    <div className="w-full flex flex-col text-slate-800 bg-slate-50 p-3 md:p-5">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5">
        <div className="flex items-center gap-3">
          <EmojiButton
            iconKey="voltar"
            onClick={onBack}
            size="sm"
            variant="neutral"
          />
          <div className="h-6 w-[1.5px] bg-slate-200 hidden sm:block" />
          <div className="flex flex-col">
            <h1 className="text-base font-black text-slate-900 leading-none uppercase tracking-tight flex items-center gap-1.5">
              <BookOpen className="h-5 w-5 text-[#3b82f6]" />
              Manual & Normativa <span className="text-[#3b82f6]">Facilities 2026</span>
            </h1>
            <p className="text-xs text-slate-450 mt-1 font-semibold leading-none">
              Governança, Sistemas, Operações e Auditorias Integradas
            </p>
          </div>
        </div>
        
        <div className="text-right hidden md:block">
          <span className="text-xs font-black uppercase text-[#3b82f6] block leading-none">DOCUMENTO UNIFICADO</span>
          <span className="text-xs text-slate-500 font-mono font-bold mt-1 block">Versão 2.0 • Julho de 2026</span>
        </div>
      </div>

      {/* Main Grid: split in 2 panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-1">
        
        {/* Left Side: Normativa Manual Browser (cols 7) */}
        <div className="lg:col-span-7 flex flex-col bp-card overflow-hidden flex-1">
          
          {/* Internal Browser Controls */}
          <div className="p-3 border-b border-slate-150 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Table of contents dropdown or fast select */}
            <div className="w-full sm:w-72">
              <select
                value={activeSectionId()}
                onChange={(e) => {
                  const target = document.getElementById(e.target.value);
                  if (target) {
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:border-[#3b82f6]"
              >
                {NORMATIVA_SECTIONS.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.number} - {sec.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick manual search */}
            <div className="w-full sm:w-64 relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar palavra-chave..."
                className="w-full pl-9 pr-12 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-850 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]"
              />
              {searchQuery && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
                  <EmojiButton 
                    iconKey="fechar"
                    onClick={() => setSearchQuery("")}
                    size="sm"
                    variant="neutral"
                    className="h-8 w-8 min-h-[32px] min-w-[32px] text-xs border-0 bg-transparent hover:bg-slate-100"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Container holding Table of Contents sidebar and the actual reader */}
          <div className="flex-1 flex flex-row overflow-hidden min-h-0">
            {/* Table of Contents Index (Visible on md and larger) */}
            <div className="w-64 border-r border-slate-150 bg-slate-50/50 shrink-0 hidden md:flex flex-col select-none overflow-y-auto">
              <div className="p-3 border-b border-slate-150 flex items-center justify-between shrink-0 bg-slate-100/40">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Índice de Capítulos
                </span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 font-mono">
                  {NORMATIVA_SECTIONS.length} itens
                </span>
              </div>
              
              <div className="p-2 space-y-1">
                {NORMATIVA_SECTIONS.map((sec) => {
                  const isSelected = selectedSectionId === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        setSelectedSectionId(sec.id);
                        const target = document.getElementById(sec.id);
                        if (target) {
                          target.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }}
                      className={`w-full text-left px-2.5 py-2.5 rounded-xl text-xs leading-tight transition-all cursor-pointer flex gap-2.5 items-start group ${
                        isSelected
                          ? "bg-[#3b82f6]/10 text-[#3b82f6] font-black border-l-2 border-[#3b82f6] pl-2 bg-gradient-to-r from-[#3b82f6]/5 to-transparent"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <span className={`font-mono text-xs font-black px-1.5 py-0.5 rounded shrink-0 transition-all ${
                        isSelected 
                          ? "bg-[#3b82f6] text-white scale-105 shadow-3xs" 
                          : "bg-slate-200 text-slate-500 group-hover:bg-slate-300"
                      }`}>
                        {sec.number}
                      </span>
                      <span className="flex-1 line-clamp-2 leading-snug">{sec.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actual Manual Document Flow */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 select-text scroll-smooth" id="normativa-scroll-container">
              {filteredSections.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center">
                  <AlertCircle className="h-10 w-10 text-amber-500 mb-2.5" />
                  <h3 className="text-xs font-black uppercase text-slate-800">Nenhum resultado encontrado</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Não encontramos correspondência para sua busca de palavra-chave. Tente buscar por termos mais genéricos como "Uber", "Correios", "Zeladora" ou "GLPI".
                  </p>
                  <EmojiButton
                    iconKey="limparFiltros"
                    onClick={() => setSearchQuery("")}
                    size="md"
                    variant="neutral"
                    className="mt-4"
                  />
                </div>
              ) : (
                filteredSections.map((section) => (
                  <div 
                    key={section.id} 
                    id={section.id} 
                    className={`border-b border-slate-100 pb-6 last:border-b-0 scroll-mt-6 section-block transition-all duration-300 ${
                      selectedSectionId === section.id 
                        ? "bg-[#3b82f6]/3 p-4 rounded-2xl border-l-4 border-l-[#3b82f6] shadow-3xs" 
                        : ""
                    }`}
                    onClick={() => setSelectedSectionId(section.id)}
                  >
                    {/* Section Title Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white font-mono font-black text-xs shadow-xs">
                        {section.number}
                      </div>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        {section.title}
                      </h2>
                    </div>

                    {/* Section Plain Content HTML */}
                    {section.content && (
                      <div className="text-xs text-slate-750 leading-relaxed prose">
                        {renderHtml(section.content)}
                      </div>
                    )}

                    {/* Subsections rendering */}
                    {section.subsections && section.subsections.length > 0 && (
                      <div className="space-y-4 mt-3">
                        
                        {/* Interactive Tab bar if more than 2 subsections */}
                        {section.subsections.length > 2 ? (
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                              {section.subsections.map((sub, sIdx) => (
                                <button
                                  key={sIdx}
                                  onClick={() => setActiveSubTab(sIdx)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all cursor-pointer ${
                                    activeSubTab === sIdx
                                      ? "bg-white text-[#3b82f6] shadow-3xs"
                                      : "text-slate-500 hover:text-slate-800"
                                  }`}
                                >
                                  {sub.title}
                                </button>
                              ))}
                            </div>
                            
                            {/* Active Tab Subsection */}
                            {(() => {
                              const sub = section.subsections[activeSubTab];
                              if (!sub) return null;
                              return renderSubsectionContent(sub);
                            })()}
                          </div>
                        ) : (
                          section.subsections.map((sub, sIdx) => (
                            <div key={sIdx} className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 mt-2">
                              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5 mb-2 border-b border-slate-150 pb-1.5">
                                {sub.number && <span className="font-mono font-bold text-[#3b82f6] text-xs">{sub.number}</span>}
                                {sub.title}
                              </h3>
                              {renderSubsectionContent(sub)}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Interactive AI Tutor and Voice Recognition Widget (cols 5) */}
        <div className="lg:col-span-5 flex flex-col bg-slate-100 border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 min-h-[300px]">
          
          {/* Chat Header */}
          <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#3b82f6] flex items-center justify-center text-white font-black shadow-xs">
                <HelpCircle className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-wide text-slate-900">TUTOR INTELIGENTE DE NORMATIVAS</span>
                <span className="text-xs text-[#3b82f6] font-bold leading-none mt-0.5">Suporte operacional por voz e IA</span>
              </div>
            </div>
            
            {chatHistory.length > 0 && (
              <EmojiButton
                iconKey="limpar"
                onClick={handleClearChat}
                size="sm"
                variant="danger"
                className="h-8 w-8 min-h-[32px] min-w-[32px] text-xs border-0"
              />
            )}
          </div>

          {/* Interactive Suggested Actions Bar (scrollable horizontally) */}
          <div className="p-2 border-b border-slate-200 bg-slate-50 overflow-x-auto shrink-0 flex items-center gap-1.5 scrollbar-none">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider shrink-0 mr-1 select-none">Dicas Rápidas:</span>
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q.query)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-[#3b82f6] hover:bg-slate-100 rounded-full text-xs font-extrabold text-slate-650 hover:text-slate-900 shrink-0 cursor-pointer shadow-3xs transition-all active:scale-95 leading-none"
              >
                {q.text}
              </button>
            ))}
          </div>

          {/* Chat Window Messages Thread */}
          <div className="flex-1 p-3 overflow-y-auto space-y-4 max-h-[300px] lg:max-h-none select-text">
            {chatHistory.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center justify-center h-full max-w-xs mx-auto">
                <div className="h-12 w-12 rounded-full bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] mb-3 animate-bounce">
                  <Compass className="h-6 w-6" />
                </div>
                <h3 className="text-xs font-black uppercase text-slate-800">Tire suas dúvidas operacionais</h3>
                <p className="text-xs/relaxed text-slate-500 font-bold mt-1 text-center">
                  Digite sua dúvida acima ou clique no botão de microfone para <strong>falar sua dúvida</strong>. Nosso tutor explicará o procedimento correto segundo a normativa oficial de 2026.
                </p>
                <div className="mt-4 p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs/snug text-slate-600 font-bold italic w-full text-center">
                  💡 Experimente perguntar: <br/>
                  <span className="text-[#3b82f6] font-black not-italic block mt-1 hover:underline cursor-pointer" onClick={() => handleSendMessage("Zeladoras: como funciona o bônus de R$ 90?")}>
                    "Como funciona o bônus das zeladoras?"
                  </span>
                </div>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div className={`max-w-[90%] rounded-2xl p-3 shadow-3xs ${
                    msg.role === "user"
                      ? "bg-[#3b82f6] text-white rounded-tr-xs"
                      : "bg-white text-slate-800 rounded-tl-xs border border-slate-200"
                  }`}>
                    
                    {/* Header bubble with avatar and name */}
                    <div className="flex items-center gap-1.5 border-b border-white/10 pb-1 mb-1.5 select-none text-xs font-black uppercase tracking-wider">
                      {msg.role === "user" ? (
                        <>
                          <span className="text-white/80">VOCÊ</span>
                          <span className="text-white/50">•</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[#3b82f6]">AI TUTOR</span>
                          <span className="text-slate-500">•</span>
                        </>
                      )}
                      <span className={msg.role === "user" ? "text-white/60" : "text-slate-500"}>{msg.timestamp}</span>
                    </div>

                    {/* Chat Bubble Text */}
                    {msg.role === "user" ? (
                      <p className="text-xs font-bold whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    ) : (
                      formatTutorMarkdown(msg.text)
                    )}
                  </div>
                </div>
              ))
            )}

            {isAiLoading && (
              <div className="flex items-start gap-2.5">
                <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-2 max-w-sm animate-pulse">
                  <RefreshCw className="h-3.5 w-3.5 text-[#3b82f6] animate-spin" />
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wide">
                    O Tutor de IA está lendo a Normativa e redigindo resposta...
                  </span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Voice status notification banner if speaking */}
          {isRecording && (
            <div className="px-3.5 py-1.5 bg-[#3b82f6] text-white text-xs font-black uppercase flex items-center justify-between animate-pulse shrink-0 tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                🎙️ Ouvindo sua voz... Fale sua dúvida sobre a normativa de facilities
              </span>
              <EmojiButton 
                iconKey="fechar"
                onClick={() => recognitionRef.current?.stop()}
                size="sm"
                variant="neutral"
                className="h-7 w-7 min-h-[28px] min-w-[28px] border-0"
              />
            </div>
          )}

          {speechError && (
            <div className="px-3.5 py-1.5 bg-rose-600 text-white text-xs font-bold uppercase flex items-center gap-1 shrink-0">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{speechError}</span>
            </div>
          )}

          {/* Chat input form box */}
          <div className="p-3 bg-white border-t border-slate-200 flex flex-col gap-2 shrink-0">
            <div className="flex gap-1.5 items-center relative">
              
              {/* Mic Speech Button */}
              <EmojiButton
                iconKey="ditarVoz"
                onClick={startListening}
                size="md"
                variant={isRecording ? "danger" : "neutral"}
                className={isRecording ? "animate-pulse" : ""}
              />

              {/* Text input area */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isAiLoading) {
                    handleSendMessage();
                  }
                }}
                disabled={isAiLoading}
                placeholder="Digite sua dúvida sobre a Normativa..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-850 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6] disabled:opacity-50"
              />

              {/* Send Button */}
              <EmojiButton
                iconKey="enviarChat"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isAiLoading}
                size="md"
                variant="primary"
              />
            </div>

            <div className="text-xs text-slate-500 font-bold text-center select-none">
              O Tutor utiliza inteligência artificial. Valide as informações fiscais com os manuais oficiais.
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  // Helper renderer to render subsection objects nicely
  function renderSubsectionContent(sub: NormativaSubSection) {
    return (
      <div className="space-y-3 mt-1 text-xs text-slate-750 leading-relaxed">
        
        {/* Subsection content (HTML format) */}
        {sub.content && (
          <div className="prose">
            {renderHtml(sub.content)}
          </div>
        )}

        {/* Steps sequence lists */}
        {sub.steps && sub.steps.length > 0 && (
          <div className="space-y-2 mt-2">
            {sub.steps.map((step, idx) => {
              const parts = step.split(":");
              const titlePart = parts.length > 1 ? parts[0] + ":" : "";
              const textPart = parts.length > 1 ? parts.slice(1).join(":") : step;
              return (
                <div key={idx} className="flex gap-2.5 items-start pl-1 animate-fade-in">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#3b82f6] text-slate-900 font-mono font-black text-xs shrink-0">
                    {idx + 1}
                  </span>
                  <p className="flex-1">
                    {titlePart && <strong className="font-extrabold text-slate-850 mr-1 block sm:inline">{titlePart}</strong>}
                    <span className="text-slate-700">{textPart}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Tables inside subsections */}
        {sub.table && (
          <div className="overflow-x-auto rounded-xl border border-slate-150 mt-3 shadow-3xs">
            <table className="w-full text-left text-xs leading-relaxed border-collapse bg-white">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-extrabold text-slate-850">
                  {sub.table.headers.map((h, hIdx) => (
                    <th key={hIdx} className="p-2 py-2.5 font-black uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {sub.table.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2 py-2.5">
                        {cIdx === 0 ? (
                          <strong className="font-bold text-slate-850">{cell}</strong>
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Banners and callouts inside subsections */}
        {sub.alert && (
          <div className={`mt-4 p-3.5 border-l-4 rounded-r-xl flex items-start gap-2.5 leading-relaxed ${
            sub.alert.type === "warning" 
              ? "bg-rose-500/5 border-rose-500 text-rose-900"
              : sub.alert.type === "success"
              ? "bg-emerald-500/5 border-emerald-500 text-emerald-900"
              : "bg-sky-500/5 border-sky-500 text-sky-900"
          }`}>
            <span className="text-base leading-none shrink-0 select-none">
              {sub.alert.icon || (sub.alert.type === "warning" ? "⚠️" : "📌")}
            </span>
            <p className="text-xs font-bold">
              {sub.alert.text}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Calculate current active section index based on scroll position or manual select
  function activeSectionId() {
    return selectedSectionId;
  }
}
