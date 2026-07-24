import React, { useState, useRef, useEffect } from "react";
import {
  ShoppingCart, Package, ScrollText, FolderOpen, Footprints,
  LayoutDashboard, PlusCircle, Play, Shirt, Shield, GraduationCap,
  Receipt, ShoppingBag, Save, XCircle, X, ArrowLeft, Pencil,
  Trash2, Printer, RotateCcw, Plus, Search, HelpCircle, Link,
  Settings, MessageSquare, Mail, ClipboardList, FileText,
  FileSpreadsheet, FileDown, UserMinus, MapPin, Puzzle, CheckCircle,
  Sparkles, FilterX, Paperclip, Camera, Image, Mic, Eye,
  CircleAlert, DoorOpen, AlertTriangle, Paintbrush, Wrench,
  FastForward, Flag, CheckCircle2, Sun, BookOpen, Moon,
  LogOut, Send, Zap, Mic2, BarChart3, Clock, XOctagon,
  type LucideIcon,
} from "lucide-react";

// --- GLOBAL ICON DICTIONARY ---
// Each key maps to a lucide-react icon + label. No emojis.
export const ICON_MAP: Record<string, { icon: LucideIcon; label: string }> = {
  // Navigation / Views
  cotacao: { icon: ShoppingCart, label: "Cotações / Compras" },
  estoque: { icon: Package, label: "Estoque" },
  normativa: { icon: ScrollText, label: "Normativas" },
  docs: { icon: FolderOpen, label: "Documentos" },
  ronda: { icon: Footprints, label: "Ronda" },
  dashboard: { icon: LayoutDashboard, label: "Dashboard" },
  novaRonda: { icon: PlusCircle, label: "Nova Ronda" },
  iniciarComparador: { icon: Play, label: "Iniciar Comparador / Entrar" },
  fichaAutonomo: { icon: Shirt, label: "Ficha Autônomo" },
  termosResponsabilidade: { icon: Shield, label: "Termos de Responsabilidade" },
  aprendizes: { icon: GraduationCap, label: "Gestão de Aprendizes" },
  recibo: { icon: Receipt, label: "Recibo Simplificado" },
  novaCotacao: { icon: ShoppingBag, label: "Nova Cotação" },

  // General Actions
  salvar: { icon: Save, label: "Salvar" },
  cancelar: { icon: XCircle, label: "Cancelar / Fechar" },
  fechar: { icon: X, label: "Fechar / Cancelar" },
  voltar: { icon: ArrowLeft, label: "Voltar" },
  editar: { icon: Pencil, label: "Editar" },
  excluir: { icon: Trash2, label: "Excluir" },
  imprimir: { icon: Printer, label: "Exportar PDF / Imprimir" },
  limpar: { icon: RotateCcw, label: "Limpar / Resetar" },
  adicionar: { icon: Plus, label: "Adicionar / Novo" },
  pesquisar: { icon: Search, label: "Buscar / Pesquisar" },
  ajuda: { icon: HelpCircle, label: "Ajuda / FAQ" },
  compartilhar: { icon: Link, label: "Compartilhar Link" },
  configuracoes: { icon: Settings, label: "Configurações" },

  // Export / Messaging
  exportarWhatsApp: { icon: MessageSquare, label: "Exportar via WhatsApp" },
  exportarEmail: { icon: Mail, label: "Exportar via E-mail" },
  copiar: { icon: ClipboardList, label: "Copiar Dados" },
  gerarRelatorio: { icon: FileText, label: "Gerar Relatório (PDF/DOCX)" },
  exportarExcel: { icon: FileSpreadsheet, label: "Exportar Planilha (Excel)" },
  salvarTXT: { icon: FileDown, label: "Salvar como Arquivo de Texto (TXT)" },
  desligarAprendiz: { icon: UserMinus, label: "Desligar Aprendiz" },
  consultarCep: { icon: MapPin, label: "Consultar CEP" },
  exemploModelo: { icon: Puzzle, label: "Preencher com Exemplo Modelo" },
  confirmar: { icon: CheckCircle, label: "Confirmar / Concluir" },

  // Specific Features
  geradorIA: { icon: Sparkles, label: "Gerador IA / Sugestões" },
  limparFiltros: { icon: FilterX, label: "Limpar Filtros" },
  importarDados: { icon: Plus, label: "Importar Arquivo" },
  anexarArquivo: { icon: Paperclip, label: "Anexar Arquivo" },
  tirarFoto: { icon: Camera, label: "Tirar Foto (Câmera)" },
  colarImagem: { icon: ClipboardList, label: "Colar Imagem" },
  colarImagemEmoji: { icon: Image, label: "Colar Imagem" },
  ditarVoz: { icon: Mic, label: "Ditar por Voz" },
  visualizar: { icon: Eye, label: "Visualizar / Ver Detalhes" },
  verDetalhes: { icon: Eye, label: "Ver Detalhes" },
  buscarVistoria: { icon: Search, label: "Buscar Vistoria" },
  verDetalhesEmoji: { icon: Eye, label: "Ver Detalhes" },

  // Ronda specific
  adicionarSala: { icon: DoorOpen, label: "Adicionar Sala" },
  registrarOcorrencia: { icon: CircleAlert, label: "Registrar Ocorrência" },
  tipoAutuacao: { icon: AlertTriangle, label: "Tipo: Autuação" },
  tipoLimpeza: { icon: Paintbrush, label: "Tipo: Limpeza / Organização" },
  tipoManutencao: { icon: Wrench, label: "Tipo: Manutenção" },
  finalizarOcorrencia: { icon: CheckCircle2, label: "Finalizar Ocorrência" },
  continuarVistoria: { icon: FastForward, label: "Continuar Vistoria" },
  finalizarVistoria: { icon: Flag, label: "Finalizar Vistoria / Concluir Ronda" },
  criarChamado: { icon: PlusCircle, label: "Criar Chamado" },

  // Stock / Control Specific
  saidaEstoque: { icon: Package, label: "Saída de Estoque" },
  historicoConsumo: { icon: Clock, label: "Histórico de Consumo" },
  alertasEstoque: { icon: AlertTriangle, label: "Alertas de Estoque Baixo" },
  adicionarEstoque: { icon: Plus, label: "Adicionar ao Estoque" },
  limparEstoque: { icon: Paintbrush, label: "Registro de Limpeza" },

  // Theme Switches
  temaClaro: { icon: Sun, label: "Modo Claro" },
  temaSepia: { icon: BookOpen, label: "Modo Leitura (Sepia)" },
  temaEscuro: { icon: Moon, label: "Modo Escuro (Dark)" },

  // User Actions
  logout: { icon: LogOut, label: "Sair / Trocar Operador" },
  sair: { icon: LogOut, label: "Sair / Trocar Operador" },
  menuRonda: { icon: Footprints, label: "Ronda" },

  // Document Views
  visualizarDoc: { icon: FileText, label: "Visualizar Documento" },
  criarDoc: { icon: Plus, label: "Criar Documento" },

  // Other specific buttons
  enviarChat: { icon: Send, label: "Enviar Mensagem" },
  gravarVozStock: { icon: Mic2, label: "Gravar Voz" },
  gerarPDFStock: { icon: BarChart3, label: "Gerar Relatório Gráfico" },
  historicoLimpeza: { icon: Clock, label: "Histórico Completo" },
  fecharModal: { icon: XOctagon, label: "Fechar Modal" },
};

const ICON_SIZES: Record<string, number> = {
  sm: 18,
  md: 20,
  lg: 24,
  xl: 28,
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
  const fallback = { icon: HelpCircle, label: "Ação" };
  const item = ICON_MAP[iconKey] || fallback;
  const IconComponent = item.icon;
  const iconSize = ICON_SIZES[size] || 20;

  const handleTouchStart = () => {
    touchTimeout.current = setTimeout(() => {
      setShowTooltip(true);
    }, 400);
  };

  const handleTouchEnd = () => {
    if (touchTimeout.current) {
      clearTimeout(touchTimeout.current);
    }
    setTimeout(() => {
      setShowTooltip(false);
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (touchTimeout.current) {
        clearTimeout(touchTimeout.current);
      }
    };
  }, []);

  const sizeClasses = {
    sm: "min-h-[44px] min-w-[44px] h-11 w-11",
    md: "min-h-[44px] min-w-[44px] h-12 w-12",
    lg: "min-h-[48px] min-w-[48px] h-14 w-14",
    xl: "min-h-[52px] min-w-[52px] h-16 w-16",
  }[size];

  const variantClasses = {
    primary: "bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-sm hover:shadow-premium-pink btn-magnetic rounded-xl border border-[#3b82f6]",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-3xs btn-magnetic rounded-xl border border-slate-200",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm btn-magnetic rounded-xl border border-emerald-600",
    danger: "bg-[#2563eb] hover:bg-[#a01845] text-white shadow-sm btn-magnetic rounded-xl border border-[#2563eb]",
    warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm btn-magnetic rounded-xl border border-amber-600",
    neutral: "bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-3xs btn-magnetic rounded-xl",
    custom: "",
  }[variant];

  return (
    <div className="relative inline-block select-none">
      <button
        type="button"
        className={`flex items-center justify-center transition-all cursor-pointer select-none focus:outline-hidden ${sizeClasses} ${variantClasses} ${className}`}
        aria-label={item.label}
        title={item.label}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        {...props}
      >
        <IconComponent size={iconSize} strokeWidth={1.75} className="pointer-events-none" />
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#0f172a] text-white text-[11px] font-black uppercase tracking-wider rounded-lg shadow-premium whitespace-nowrap z-[999] animate-premium-scale-in border border-[#0f172a] pointer-events-none">
          {item.label}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#0f172a]" />
        </div>
      )}
    </div>
  );
};
