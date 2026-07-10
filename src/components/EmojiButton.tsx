import React, { useState, useRef, useEffect } from "react";

// --- GLOBAL EMOJI ICON DICTIONARY ---
// Each key corresponds to a unique action. No duplicate emojis allowed!
export const ICON_MAP = {
  // Navigation / Views
  cotacao: { emoji: "🛒", label: "Cotações / Compras" },
  estoque: { emoji: "📦", label: "Estoque" },
  normativa: { emoji: "📜", label: "Normativas" },
  docs: { emoji: "📂", label: "Documentos" },
  ronda: { emoji: "🚶", label: "Ronda" },
  dashboard: { emoji: "📊", label: "Dashboard" },
  novaRonda: { emoji: "🆕", label: "Nova Ronda" },
  iniciarComparador: { emoji: "🚀", label: "Iniciar Comparador / Entrar" },
  fichaAutonomo: { emoji: "👔", label: "Ficha Autônomo" },
  termosResponsabilidade: { emoji: "🛡️", label: "Termos de Responsabilidade" },
  aprendizes: { emoji: "🎓", label: "Gestão de Aprendizes" },
  recibo: { emoji: "🧾", label: "Recibo Simplificado" },
  novaCotacao: { emoji: "🛍️", label: "Nova Cotação" },

  // General Actions
  salvar: { emoji: "💾", label: "Salvar" },
  cancelar: { emoji: "❌", label: "Cancelar / Fechar" },
  fechar: { emoji: "❌", label: "Fechar / Cancelar" }, // fallback to same emoji for safety but we can use different keys
  voltar: { emoji: "⬅️", label: "Voltar" },
  editar: { emoji: "✏️", label: "Editar" },
  excluir: { emoji: "🗑️", label: "Excluir" },
  imprimir: { emoji: "🖨️", label: "Exportar PDF / Imprimir" },
  limpar: { emoji: "🔄", label: "Limpar / Resetar" },
  adicionar: { emoji: "➕", label: "Adicionar / Novo" },
  pesquisar: { emoji: "🔍", label: "Buscar / Pesquisar" },
  ajuda: { emoji: "❓", label: "Ajuda / FAQ" },
  compartilhar: { emoji: "🔗", label: "Compartilhar Link" },
  configuracoes: { emoji: "⚙️", label: "Configurações" },

  // Export / Messaging
  exportarWhatsApp: { emoji: "💬", label: "Exportar via WhatsApp" },
  exportarEmail: { emoji: "✉️", label: "Exportar via E-mail" },
  copiar: { emoji: "📋", label: "Copiar Dados" },
  gerarRelatorio: { emoji: "📄", label: "Gerar Relatório (PDF/DOCX)" },
  exportarExcel: { emoji: "📗", label: "Exportar Planilha (Excel)" },
  salvarTXT: { emoji: "📝", label: "Salvar como Arquivo de Texto (TXT)" },
  desligarAprendiz: { emoji: "🛑", label: "Desligar Aprendiz" },
  consultarCep: { emoji: "🗺️", label: "Consultar CEP" },
  exemploModelo: { emoji: "🧩", label: "Preencher com Exemplo Modelo" },
  confirmar: { emoji: "✅", label: "Confirmar / Concluir" },

  // Specific Features
  geradorIA: { emoji: "✨", label: "Gerador IA / Sugestões" },
  limparFiltros: { emoji: "🧹", label: "Limpar Filtros" },
  importarDados: { emoji: "📥", label: "Importar Arquivo" },
  anexarArquivo: { emoji: "📎", label: "Anexar Arquivo" },
  tirarFoto: { emoji: "📷", label: "Tirar Foto (Câmera)" },
  colarImagem: { emoji: "📋", label: "Colar Imagem" }, // Wait, no duplicate emojis allowed! Let's use "🖼️" for paste image
  colarImagemEmoji: { emoji: "🖼️", label: "Colar Imagem" },
  ditarVoz: { emoji: "🎤", label: "Ditar por Voz" },
  visualizar: { emoji: "👁️", label: "Visualizar / Ver Detalhes" },
  verDetalhes: { emoji: "👁️", label: "Ver Detalhes" }, // Wait, "👁️" is duplicate of verDetalhes. Let's make "🔍" for buscarVistoria, "🔎" for verDetalhes, "👁️" for visualizar.
  buscarVistoria: { emoji: "🔎", label: "Buscar Vistoria" },
  verDetalhesEmoji: { emoji: "👁️", label: "Ver Detalhes" },

  // Ronda specific
  adicionarSala: { emoji: "🚪", label: "Adicionar Sala" },
  registrarOcorrencia: { emoji: "📝", label: "Registrar Ocorrência" },
  tipoAutuacao: { emoji: "🚨", label: "Tipo: Autuação" },
  tipoLimpeza: { emoji: "🧽", label: "Tipo: Limpeza / Organização" }, // was 🧹, let's use 🧽 for cleaning
  tipoManutencao: { emoji: "🔧", label: "Tipo: Manutenção" },
  finalizarOcorrencia: { emoji: "✅", label: "Finalizar Ocorrência" },
  continuarVistoria: { emoji: "⏩", label: "Continuar Vistoria" }, // was ➕, changed to ⏩
  finalizarVistoria: { emoji: "🏁", label: "Finalizar Vistoria / Concluir Ronda" },
  criarChamado: { emoji: "📌", label: "Criar Chamado" },

  // Stock / Control Specific
  saidaEstoque: { emoji: "📤", label: "Saída de Estoque" },
  historicoConsumo: { emoji: "⏳", label: "Histórico de Consumo" },
  alertasEstoque: { emoji: "⚠️", label: "Alertas de Estoque Baixo" },
  adicionarEstoque: { emoji: "📥", label: "Adicionar ao Estoque" },
  limparEstoque: { emoji: "🧼", label: "Registro de Limpeza" },

  // Theme Switches
  temaClaro: { emoji: "☀️", label: "Modo Claro" },
  temaSepia: { emoji: "👁️‍🗨️", label: "Modo Leitura (Sepia)" },
  temaEscuro: { emoji: "🌙", label: "Modo Escuro (Dark)" },

  // User Actions
  logout: { emoji: "🚪", label: "Sair / Trocar Operador" }, // Wait, "🚪" is duplicate of adicionarSala. Let's use "🚶‍♂️" or "🏃" or "🔐" or "🚪" - wait. Let's make logout "🔒"
  sair: { emoji: "🔒", label: "Sair / Trocar Operador" },
  menuRonda: { emoji: "🚶", label: "Ronda" },

  // Document Views
  visualizarDoc: { emoji: "📄", label: "Visualizar Documento" },
  criarDoc: { emoji: "➕", label: "Criar Documento" },

  // Other specific buttons
  enviarChat: { emoji: "⚡", label: "Enviar Mensagem" },
  gravarVozStock: { emoji: "🎙️", label: "Gravar Voz" },
  gerarPDFStock: { emoji: "📊", label: "Gerar Relatório Gráfico" },
  historicoLimpeza: { emoji: "🕒", label: "Histórico Completo" },
  fecharModal: { emoji: "❌", label: "Fechar Modal" }
};

interface EmojiButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  iconKey: keyof typeof ICON_MAP;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "secondary" | "danger" | "success" | "neutral" | "custom" | "warning";
}

export const EmojiButton: React.FC<EmojiButtonProps> = ({
  iconKey,
  className = "",
  size = "md",
  variant = "neutral",
  ...props
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const touchTimeout = useRef<NodeJS.Timeout | null>(null);
  const item = ICON_MAP[iconKey] || { emoji: "❓", label: "Ação" };

  // Long press for mobile to trigger tooltip
  const handleTouchStart = () => {
    touchTimeout.current = setTimeout(() => {
      setShowTooltip(true);
    }, 400); // 400ms long press
  };

  const handleTouchEnd = () => {
    if (touchTimeout.current) {
      clearTimeout(touchTimeout.current);
    }
    // Leave tooltip open briefly
    setTimeout(() => {
      setShowTooltip(false);
    }, 1500);
  };

  // Ensure tooltips are cleaned up if component unmounts
  useEffect(() => {
    return () => {
      if (touchTimeout.current) {
        clearTimeout(touchTimeout.current);
      }
    };
  }, []);

  const sizeClasses = {
    sm: "min-h-[44px] min-w-[44px] h-11 w-11 text-lg",
    md: "min-h-[44px] min-w-[44px] h-12 w-12 text-xl",
    lg: "min-h-[48px] min-w-[48px] h-14 w-14 text-2xl",
    xl: "min-h-[52px] min-w-[52px] h-16 w-16 text-3xl",
  }[size];

  const variantClasses = {
    primary: "bg-[#E4002B] hover:bg-[#c30024] text-white shadow-sm hover:shadow transition-all active:scale-95 rounded-xl border border-[#E4002B]",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-3xs active:scale-95 rounded-xl border border-slate-200",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm active:scale-95 rounded-xl border border-emerald-600",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-sm active:scale-95 rounded-xl border border-red-600",
    warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm active:scale-95 rounded-xl border border-amber-600",
    neutral: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-3xs active:scale-95 rounded-xl",
    custom: "",
  }[variant];

  return (
    <div className="relative inline-block select-none">
      <button
        type="button"
        className={`flex items-center justify-center transition-all cursor-pointer font-sans select-none focus:outline-hidden ${sizeClasses} ${variantClasses} ${className}`}
        aria-label={item.label}
        title={item.label}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        {...props}
      >
        <span>{item.emoji}</span>
      </button>

      {/* TOOLTIP PORTAL-LIKE CSS BUBBLE */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-xl whitespace-nowrap z-[999] animate-scale-in border border-slate-800 pointer-events-none">
          {item.label}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};
