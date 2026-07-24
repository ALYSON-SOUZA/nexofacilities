import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { 
  X, FileText, Download, RotateCcw, Check, Sparkles, Receipt, 
  Building2, User, Search, MapPin 
} from "lucide-react";
import { EmojiButton } from "./EmojiButton";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  visualTheme?: "light" | "comfort" | "ultradark";
}

// Portuguese Numbers to Words Helper (Valor por Extenso)
const u = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const c = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function cent(n: number): string {
  if (n === 100) return 'cem';
  let r = '';
  if (n >= 100) {
    r = c[Math.floor(n / 100)];
    n %= 100;
    if (n) r += ' e ';
  }
  if (n >= 20) {
    r += d[Math.floor(n / 10)];
    if (n % 10) r += ' e ' + u[n % 10];
  } else if (n > 0) {
    r += u[n];
  }
  return r;
}

function buildInt(n: number): string {
  if (n === 0) return '';
  if (n < 1000) return cent(n);
  const k = Math.floor(n / 1000);
  const rest = n % 1000;
  let r = (k === 1 ? 'mil' : cent(k) + ' mil');
  if (rest) {
    if (rest < 100) r += ' e ' + cent(rest);
    else r += ' ' + cent(rest);
  }
  return r;
}

function numToWords(n: number): string {
  if (isNaN(n) || n < 0) return '';
  if (n === 0) return 'zero reais';
  const intPart = Math.floor(n);
  const decPart = Math.round((n - intPart) * 100);
  let words = '';
  if (intPart >= 1000000) {
    const m = Math.floor(intPart / 1000000);
    words += (m === 1 ? 'um milhão' : cent(m) + ' milhões');
    const rest = intPart % 1000000;
    if (rest) words += ' e ' + buildInt(rest);
  } else {
    words = buildInt(intPart);
  }
  if (intPart === 1) words += ' real';
  else if (intPart > 1) words += ' reais';
  
  if (decPart > 0) {
    words += ' e ' + (decPart === 1 ? 'um centavo' : cent(decPart) + ' centavos');
  }
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default function ReceiptModal({ isOpen, onClose, visualTheme = "light" }: ReceiptModalProps) {
  // Receipt type selector
  const [receiptModel, setReceiptModel] = useState<"Simplificado" | "Completo">("Simplificado");

  // Common Fields
  const [data, setData] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [nomeAssinatura, setNomeAssinatura] = useState("");
  const [cpfAssinatura, setCpfAssinatura] = useState("");
  const [reciboNum, setReciboNum] = useState("001");
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Complete Model Fields
  const [fontePagadoraNome, setFontePagadoraNome] = useState("BELLINATI PEREZ LTDA.");
  const [fontePagadoraCNPJ, setFontePagadoraCNPJ] = useState("01.234.567/0001-89");
  const [emissorRG, setEmissorRG] = useState("");
  const [emissorTelefone, setEmissorTelefone] = useState("");
  const [emissorEndereco, setEmissorEndereco] = useState("");
  const [emissorNumero, setEmissorNumero] = useState("");
  const [emissorBairro, setEmissorBairro] = useState("");
  const [emissorCEP, setEmissorCEP] = useState("");
  const [emissorCidade, setEmissorCidade] = useState("");
  const [emissorUF, setEmissorUF] = useState("");
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Set today's date initially
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      setData(`${dd}/${mm}/${yyyy}`);
      
      const storedNum = localStorage.getItem("bp_receipt_num_v1");
      if (storedNum) {
        setReciboNum(storedNum);
      } else {
        setReciboNum("001");
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showStatus = (text: string, type: "success" | "error" | "info" = "success") => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const maskDate = (val: string) => {
    const clean = val.replace(/\D/g, "");
    let formatted = clean;
    if (clean.length > 2) formatted = clean.slice(0, 2) + "/" + clean.slice(2);
    if (clean.length > 4) formatted = clean.slice(0, 2) + "/" + clean.slice(2, 4) + "/" + clean.slice(4, 8);
    return formatted.slice(0, 10);
  };

  const maskCpf = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length <= 11) {
      return clean
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return clean.slice(0, 11);
  };

  const maskCNPJ = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length <= 14) {
      return clean
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    }
    return clean.slice(0, 14);
  };

  const maskCEP = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length <= 8) {
      return clean.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
    }
    return clean.slice(0, 8);
  };

  const maskMoney = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) return "";
    const num = (parseInt(clean) / 100).toFixed(2);
    return num.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const getNumericValue = (): number => {
    if (!valor) return 0;
    const clean = valor.replace(/\./g, "").replace(",", ".");
    return parseFloat(clean) || 0;
  };

  const valorExtenso = getNumericValue() > 0 ? numToWords(getNumericValue()) : "—";

  const handleCepSearch = async () => {
    const rawCep = emissorCEP.replace(/\D/g, "");
    if (rawCep.length !== 8) return;
    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEmissorEndereco(data.logradouro || "");
        setEmissorBairro(data.bairro || "");
        setEmissorCidade(data.localidade || "");
        setEmissorUF(data.uf || "");
        showStatus("CEP localizado!");
      } else {
        showStatus("CEP não encontrado.", "error");
      }
    } catch (e) {
      console.error("CEP search failed:", e);
      showStatus("Falha ao buscar CEP.", "error");
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleNewReceipt = () => {
    setDescricao("");
    setValor("");
    setNomeAssinatura("");
    setCpfAssinatura("");
    setEmissorRG("");
    setEmissorTelefone("");
    setEmissorEndereco("");
    setEmissorNumero("");
    setEmissorBairro("");
    setEmissorCEP("");
    setEmissorCidade("");
    setEmissorUF("");
    
    const nextNum = (parseInt(reciboNum) + 1).toString().padStart(3, "0");
    setReciboNum(nextNum);
    localStorage.setItem("bp_receipt_num_v1", nextNum);
    showStatus(`Novo recibo iniciado: Nº ${nextNum}`, "info");
  };

  const handleDownloadPDF = () => {
    if (receiptModel === "Simplificado") {
      if (!data || !descricao || !valor || !nomeAssinatura || !cpfAssinatura) {
        showStatus("Por favor, preencha todos os campos obrigatórios.", "error");
        return;
      }
    } else {
      if (!data || !descricao || !valor || !nomeAssinatura || !cpfAssinatura || !fontePagadoraNome || !fontePagadoraCNPJ) {
        showStatus("Por favor, preencha todos os campos obrigatórios (marcados com *).", "error");
        return;
      }
    }

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      if (receiptModel === "Simplificado") {
        // Background Top Strip (Petroleum Blue)
        doc.setFillColor(37, 42, 52);
        doc.rect(0, 0, 210, 50, "F");

        // Custom highlight accent lines (Crimson / Aqua)
        doc.setDrawColor(255, 46, 99);
        doc.setLineWidth(1.5);
        doc.line(0, 50, 210, 50);
        doc.setDrawColor(255, 42, 109);
        doc.line(105, 50, 210, 50);

        // Title & Header info
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text("RECIBO DE PAGAMENTO", 20, 24);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(255, 42, 109);
        doc.text("DOCUMENTO SIMPLIFICADO DE QUITAÇÃO", 20, 31);

        doc.setFont("courier", "bold");
        doc.setFontSize(14);
        doc.setTextColor(255, 42, 109);
        doc.text(`Nº ${reciboNum}`, 190, 22, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(200, 200, 200);
        doc.text(data, 190, 30, { align: "right" });

        let y = 65;

        const drawLine = (label: string, value: string, isSerif = false, isBold = false, isLarge = false, color = [26, 26, 46]) => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(120, 120, 120);
          doc.text(label.toUpperCase(), 20, y);

          doc.setFont(isSerif ? "times" : "helvetica", isBold ? "bold" : "normal");
          doc.setFontSize(isLarge ? 14 : 11);
          doc.setTextColor(color[0], color[1], color[2]);
          
          const splitText = doc.splitTextToSize(value || "—", 140);
          doc.text(splitText, 50, y);
          y += splitText.length * 6 + 4;
        };

        const drawDivider = () => {
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.3);
          doc.line(20, y, 190, y);
          y += 8;
        };

        drawLine("Data", data);
        drawDivider();

        drawLine("Descrição", descricao);
        drawDivider();

        drawLine("Valor R$", `R$ ${valor}`, true, true, true, [168, 32, 71]);
        drawLine("Por Extenso", valorExtenso);
        drawDivider();

        // Legal disclaimer statement
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(80, 80, 80);
        const decl = "Declaro que recebi a importância descrita acima, referente à prestação de serviços/atividades conforme especificado neste documento, dando plena e irrevogável quitação pelo valor recebido.";
        const declLines = doc.splitTextToSize(decl, 170);
        doc.text(declLines, 20, y);
        y += declLines.length * 6 + 12;

        drawDivider();

        // Hand signature area
        const sigY = y;
        doc.setDrawColor(37, 42, 52);
        doc.setLineWidth(0.5);
        doc.line(40, sigY, 170, sigY);
        y += 6;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text("ASSINATURA DO EMISSOR / PRESTADOR", 105, y, { align: "center" });
        y += 6;

        doc.setFont("times", "bold");
        doc.setFontSize(12);
        doc.text(nomeAssinatura, 105, y, { align: "center" });
        y += 5;

        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`CPF: ${cpfAssinatura}`, 105, y, { align: "center" });

        y += 18;

        // Lower page footer
        doc.setFillColor(248, 248, 248);
        doc.rect(0, y, 210, 25, "F");

        doc.setFont("courier", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 150);
        const now = new Date();
        doc.text(`Gerado em: ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, 20, y + 10);
        doc.text(`Recibo Nº ${reciboNum} — Bellinati Perez`, 190, y + 10, { align: "right" });

      } else {
        // COMPLETE RECEIPT PDF
        doc.setFillColor(37, 42, 52); // Dark headers slate
        doc.rect(0, 0, 210, 42, "F");

        // Accent line
        doc.setFillColor(255, 46, 99); // Fuchsia
        doc.rect(0, 42, 210, 2.5, "F");

        // Header Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text("RECIBO DE PAGAMENTO COMPLETO", 15, 22);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 42, 109);
        doc.text("COMPROVANTE DETALHADO DE PRESTAÇÃO E QUITAÇÃO", 15, 29);

        // Value Box and Recibo No at the Top Right of page
        doc.setFillColor(245, 247, 250);
        doc.setDrawColor(220, 225, 230);
        doc.setLineWidth(0.5);
        doc.rect(130, 8, 65, 26, "FD");

        doc.setFont("courier", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(37, 42, 52);
        doc.text(`RECIBO Nº ${reciboNum}`, 162.5, 16, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(255, 46, 99);
        doc.text(`R$ ${valor}`, 162.5, 26, { align: "center" });

        let y = 58;

        // 1. Fonte Pagadora
        doc.setFillColor(245, 247, 250);
        doc.rect(15, y, 180, 20, "F");
        doc.setDrawColor(210, 215, 220);
        doc.setLineWidth(0.3);
        doc.rect(15, y, 180, 20, "D");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(120, 120, 120);
        doc.text("FONTE PAGADORA", 20, y + 6);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(37, 42, 52);
        doc.text(fontePagadoraNome, 20, y + 14);

        doc.setFont("courier", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(100, 100, 100);
        doc.text(`CNPJ: ${fontePagadoraCNPJ}`, 130, y + 14);

        y += 28;

        // 2. Statement Text (O corpo principal)
        doc.setFillColor(255, 255, 255);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(40, 40, 40);

        const textStatement = `Recebemos de ${fontePagadoraNome}, CNPJ sob o nº ${fontePagadoraCNPJ}, a importância líquida de R$ ${valor} (${valorExtenso}), referente a ${descricao.toUpperCase()}, pelo qual dou(amos) plena, geral e irrevogável quitação.`;
        const splitStatement = doc.splitTextToSize(textStatement, 180);
        doc.text(splitStatement, 15, y);

        y += splitStatement.length * 6 + 10;

        // Divider
        doc.setDrawColor(230, 230, 230);
        doc.line(15, y, 195, y);
        y += 8;

        // 3. Emissor (Recipient/Prestador) Details Block
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text("EMISSOR / BENEFICIÁRIO", 15, y);
        y += 6;

        // Detail list with styled alignment
        const drawDetailRow = (lbl1: string, val1: string, lbl2?: string, val2?: string) => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(110, 110, 110);
          doc.text(lbl1, 15, y);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(30, 30, 30);
          doc.text(val1 || "—", 40, y);

          if (lbl2 && val2) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(110, 110, 110);
            doc.text(lbl2, 115, y);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.setTextColor(30, 30, 30);
            doc.text(val2 || "—", 135, y);
          }
          y += 6.5;
        };

        drawDetailRow("Nome Completo:", nomeAssinatura);
        drawDetailRow("CPF / CNPJ:", cpfAssinatura, "RG:", emissorRG);
        drawDetailRow("Telefone:", emissorTelefone);
        
        const fullAddress = `${emissorEndereco}, Nº ${emissorNumero} ${emissorBairro ? `- ${emissorBairro}` : ""}`;
        drawDetailRow("Endereço:", fullAddress);
        drawDetailRow("Cidade / UF:", `${emissorCidade} / ${emissorUF}`, "CEP:", emissorCEP);

        y += 8;

        // Divider
        doc.setDrawColor(230, 230, 230);
        doc.line(15, y, 195, y);
        y += 12;

        // 4. Local, Date and Signature area
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const cityPrefix = emissorCidade ? `${emissorCidade}, ` : "Curitiba, ";
        doc.text(`${cityPrefix}em ${data}`, 15, y);

        y += 24;

        // Signature line
        doc.setDrawColor(37, 42, 52);
        doc.setLineWidth(0.5);
        doc.line(45, y, 165, y);
        
        y += 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(37, 42, 52);
        doc.text("ASSINATURA DO EMISSOR / BENEFICIÁRIO", 105, y, { align: "center" });

        y += 4.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(nomeAssinatura, 105, y, { align: "center" });

        y += 4.5;
        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`CPF: ${cpfAssinatura}`, 105, y, { align: "center" });

        // Footer at page bottom
        y = 270;
        doc.setFillColor(248, 249, 250);
        doc.rect(0, y, 210, 27, "F");

        doc.setFont("courier", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 150);
        const now = new Date();
        doc.text(`Gerado em: ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, 15, y + 10);
        doc.text(`Recibo Completo Nº ${reciboNum} — Bellinati Perez`, 195, y + 10, { align: "right" });
      }

      doc.save(`Recibo_${receiptModel}_No_${reciboNum}_${nomeAssinatura.replace(/\s+/g, "_").slice(0, 20)}.pdf`);
      showStatus("PDF do Recibo baixado com sucesso!");
    } catch (e) {
      console.error(e);
      showStatus("Erro ao gerar PDF do Recibo.", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 overflow-y-auto">
      <div className="bg-[#F4F6FA] dark:bg-slate-950 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* TOPBAR (Petroleum Blue #252A34) */}
        <header className="bg-[#252A34] px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div>
            <div className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#FF2E63]" />
              <span>Gerador de Recibo de Pagamento ({receiptModel})</span>
            </div>
            <div className="text-xs tracking-widest text-[#FF2E63] uppercase font-black mt-0.5">
              Documentos · Bellinati Perez
            </div>
          </div>
          
          {/* Mode switch bar */}
          <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setReceiptModel("Simplificado")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                receiptModel === "Simplificado"
                  ? "bg-[#FF2E63] text-slate-950 shadow-md"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              Simplificado
            </button>
            <button
              onClick={() => setReceiptModel("Completo")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                receiptModel === "Completo"
                  ? "bg-[#FF2E63] text-white shadow-md"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              Completo
            </button>
          </div>

          <EmojiButton
            iconKey="fechar"
            onClick={onClose}
            size="sm"
            variant="danger"
          />
        </header>

        {statusMsg && (
          <div className={`p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-2 border-b uppercase tracking-wider ${
            statusMsg.type === "error" 
              ? "bg-red-50 text-red-600 border-red-200" 
              : statusMsg.type === "info" 
                ? "bg-blue-50 text-blue-700 border-blue-200" 
                : "bg-green-50 text-green-700 border-green-200"
          }`}>
            <span>{statusMsg.type === "error" ? "⚠️" : "✓"}</span>
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* MODAL GRID CONTAINER */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* FORM PANEL - 5 COLS */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
              <div className="text-xs font-black uppercase text-slate-500 tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                <span>Dados do Recibo</span>
                <span className="text-xs text-pink-500 font-bold">Nº {reciboNum}</span>
              </div>

              {/* Recibo Num & Data */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase text-slate-500">Recibo Nº</label>
                  <input
                    type="text"
                    value={reciboNum}
                    onChange={(e) => setReciboNum(e.target.value.replace(/\D/g, ""))}
                    placeholder="001"
                    className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase text-slate-500">Data *</label>
                  <input
                    type="text"
                    value={data}
                    onChange={(e) => setData(maskDate(e.target.value))}
                    placeholder="DD/MM/AAAA"
                    className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white font-bold text-center"
                  />
                </div>
              </div>

              {/* Fonte Pagadora Info (Completo ONLY) */}
              {receiptModel === "Completo" && (
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-black uppercase text-slate-450 tracking-wider flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-[#FF2E63]" />
                    <span>Dados da Fonte Pagadora</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase text-slate-500">Razão Social / Nome *</label>
                    <input
                      type="text"
                      value={fontePagadoraNome}
                      onChange={(e) => setFontePagadoraNome(e.target.value.toUpperCase())}
                      className="p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase text-slate-500">CNPJ / CPF *</label>
                    <input
                      type="text"
                      value={fontePagadoraCNPJ}
                      onChange={(e) => setFontePagadoraCNPJ(maskCNPJ(e.target.value))}
                      className="p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white font-mono text-center"
                    />
                  </div>
                </div>
              )}

              {/* Valor R$ */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-slate-500">Valor R$ *</label>
                <input
                  type="text"
                  value={valor}
                  onChange={(e) => setValor(maskMoney(e.target.value))}
                  placeholder="0,00"
                  className="p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-extrabold text-red-650 dark:text-pink-400"
                />
              </div>

              {/* Descrição referente */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-slate-500">Descrição (Referente a) *</label>
                <textarea
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="EX: PRESTAÇÃO DE SERVIÇOS DE FACILITAÇÃO E SUPORTE DE FACILITIES"
                  className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-white font-medium resize-none uppercase"
                />
              </div>

              {/* Nome & CPF de quem assina */}
              <div className="bg-pink-50/15 dark:bg-slate-950 p-3 rounded-lg border border-pink-100/40 dark:border-slate-800 space-y-3">
                <div className="text-xs font-black uppercase text-[#FF2E63] tracking-wider flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  <span>Emissor (Quem recebe / assina)</span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase text-slate-500">Nome Completo *</label>
                  <input
                    type="text"
                    value={nomeAssinatura}
                    onChange={(e) => setNomeAssinatura(e.target.value)}
                    placeholder="NOME COMPLETO DO EMISSOR"
                    className="p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-850 dark:text-white uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase text-slate-500">CPF / CNPJ *</label>
                    <input
                      type="text"
                      value={cpfAssinatura}
                      onChange={(e) => setCpfAssinatura(maskCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      className="p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-850 dark:text-white text-center"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase text-slate-500">RG</label>
                    <input
                      type="text"
                      value={emissorRG}
                      onChange={(e) => setEmissorRG(e.target.value)}
                      placeholder="EX: 12.345.678-9"
                      className="p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-850 dark:text-white text-center"
                    />
                  </div>
                </div>

                {receiptModel === "Completo" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase text-slate-500">Telefone</label>
                    <input
                      type="text"
                      value={emissorTelefone}
                      onChange={(e) => setEmissorTelefone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-850 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Endereço Residencial (Completo ONLY) */}
              {receiptModel === "Completo" && (
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-black uppercase text-slate-450 tracking-wider flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#FF2E63]" />
                    <span>Endereço do Emissor</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase text-slate-500">CEP</label>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={emissorCEP}
                        onChange={(e) => setEmissorCEP(maskCEP(e.target.value))}
                        placeholder="00000-000"
                        className="flex-1 p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white font-mono text-center"
                      />
                      <EmojiButton
                        iconKey="pesquisar"
                        onClick={handleCepSearch}
                        disabled={isSearchingCep || emissorCEP.replace(/\D/g, "").length !== 8}
                        size="sm"
                        variant="neutral"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-3 flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Logradouro / Rua</label>
                      <input
                        type="text"
                        value={emissorEndereco}
                        onChange={(e) => setEmissorEndereco(e.target.value)}
                        placeholder="RUA, AVENIDA..."
                        className="p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white font-bold"
                      />
                    </div>
                    <div className="col-span-1 flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Nº</label>
                      <input
                        type="text"
                        value={emissorNumero}
                        onChange={(e) => setEmissorNumero(e.target.value)}
                        placeholder="123"
                        className="p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white font-bold text-center"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Bairro</label>
                      <input
                        type="text"
                        value={emissorBairro}
                        onChange={(e) => setEmissorBairro(e.target.value)}
                        placeholder="BAIRRO"
                        className="p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white font-bold"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase text-slate-500">Cidade</label>
                      <input
                        type="text"
                        value={emissorCidade}
                        onChange={(e) => setEmissorCidade(e.target.value)}
                        placeholder="CIDADE"
                        className="p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white font-bold"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase text-slate-500">UF</label>
                      <input
                        type="text"
                        value={emissorUF}
                        onChange={(e) => setEmissorUF(e.target.value.toUpperCase())}
                        maxLength={2}
                        placeholder="UF"
                        className="p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white font-bold text-center"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <EmojiButton
                iconKey="limpar"
                onClick={handleNewReceipt}
                size="md"
                variant="secondary"
                className="flex-1"
              />
              <EmojiButton
                iconKey="imprimir"
                onClick={handleDownloadPDF}
                size="md"
                variant="primary"
                className="flex-1"
              />
            </div>
          </div>

          {/* PREVIEW PANEL - 7 COLS */}
          <div className="lg:col-span-7 bg-[#252A34] p-5 rounded-2xl flex flex-col justify-between shadow-lg">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-black text-[#FF2E63] tracking-widest uppercase">
                <span className="h-2 w-2 bg-[#FF2E63] rounded-full animate-pulse"></span>
                <span>Pré-Visualização do Recibo ({receiptModel})</span>
              </div>

              {/* Receipt Layout Document */}
              <div className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-md flex flex-col justify-between min-h-[380px] border border-white">
                
                {/* Header Strip */}
                <div className="bg-[#252A34] px-5 py-4 flex items-center justify-between text-white border-b border-slate-800 shrink-0">
                  <div>
                    <div className="font-extrabold text-xs tracking-wide uppercase">
                      {receiptModel === "Completo" ? "RECIBO DE PAGAMENTO COMPLETO" : "RECIBO DE PAGAMENTO"}
                    </div>
                    <div className="text-xs font-bold text-[#FF2E63] uppercase tracking-wider mt-0.5">
                      {receiptModel === "Completo" ? "Comprovante de Quitação com Dados do Emissor" : "DOCUMENTO SIMPLIFICADO DE QUITAÇÃO"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-black text-[#FF2E63]">Nº {reciboNum}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{data || "—"}</div>
                  </div>
                </div>

                {/* Body details depending on receiptModel */}
                <div className="p-5 flex-1 space-y-4 text-xs font-medium text-slate-700">
                  {receiptModel === "Simplificado" ? (
                    <>
                      <div className="space-y-2 border-b border-slate-100 pb-3">
                        <div className="flex gap-2">
                          <span className="text-xs font-black uppercase text-slate-500 w-16 shrink-0">Data:</span>
                          <span className="font-bold text-slate-800">{data || "—"}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs font-black uppercase text-slate-500 w-16 shrink-0">Descrição:</span>
                          <span className="font-bold text-slate-800 uppercase leading-relaxed">{descricao || <span className="text-slate-350 italic">EX: PRESTAÇÃO DE SERVIÇOS...</span>}</span>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-black uppercase text-slate-500 w-16 shrink-0">Valor:</span>
                          <span className="font-black text-lg text-red-700">R$ {valor || "0,00"}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs font-black uppercase text-slate-500 w-16 shrink-0">Por extenso:</span>
                          <span className="font-semibold italic text-slate-500 leading-relaxed text-xs">{valorExtenso}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed text-justify pt-3 border-t border-slate-100">
                        Declaro que recebi a importância descrita acima, referente à prestação de serviços/atividades conforme especificado neste documento, dando plena e irrevogável quitação pelo valor recebido.
                      </p>
                    </>
                  ) : (
                    // COMPRETO MODEL PREVIEW
                    <div className="space-y-3.5">
                      {/* Payer Card */}
                      <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 space-y-1">
                        <div className="text-xs font-black uppercase text-slate-500">Fonte Pagadora</div>
                        <div className="flex justify-between items-center text-slate-800">
                          <span className="font-bold">{fontePagadoraNome || "—"}</span>
                          <span className="font-mono text-xs">{fontePagadoraCNPJ || "—"}</span>
                        </div>
                      </div>

                      {/* Statement Paragraph */}
                      <div className="border-l-4 border-[#FF2E63] pl-3 py-1 bg-pink-50/10 text-slate-800 leading-relaxed text-justify text-xs font-semibold">
                        Recebemos de <span className="text-slate-950 font-bold">{fontePagadoraNome || "—"}</span>, CNPJ sob o nº <span className="font-mono">{fontePagadoraCNPJ || "—"}</span>, a importância de <span className="text-red-700 font-extrabold">R$ {valor || "0,00"}</span> (<span className="italic text-slate-600 font-medium">{valorExtenso}</span>), referente a <span className="uppercase text-slate-950 font-bold">{descricao || "—"}</span>.
                      </div>

                      {/* Emissor info card */}
                      <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                        <div className="text-xs font-black uppercase text-slate-500">Dados do Emissor / Prestador</div>
                        <div className="grid grid-cols-2 gap-y-1 gap-x-4">
                          <div>
                            <span className="text-slate-500 uppercase text-xs font-bold block">Nome Completo</span>
                            <span className="font-bold text-slate-800 uppercase">{nomeAssinatura || "—"}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 uppercase text-xs font-bold block">CPF / CNPJ</span>
                            <span className="font-mono font-bold text-slate-800">{cpfAssinatura || "—"}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 uppercase text-xs font-bold block">Documento RG</span>
                            <span className="font-bold text-slate-800">{emissorRG || "—"}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 uppercase text-xs font-bold block">Telefone</span>
                            <span className="font-bold text-slate-800">{emissorTelefone || "—"}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-500 uppercase text-xs font-bold block">Endereço Residencial</span>
                            <span className="font-bold text-slate-800 uppercase">
                              {emissorEndereco ? `${emissorEndereco}, Nº ${emissorNumero || "S/N"} ${emissorBairro ? `- ${emissorBairro}` : ""} - CEP: ${emissorCEP || ""} - ${emissorCidade || ""}/${emissorUF || ""}` : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Signatures Area */}
                  <div className="pt-5 flex flex-col items-center justify-center text-center">
                    <div className="w-56 h-0.5 bg-slate-800 mb-1.5"></div>
                    <div className="text-xs font-black uppercase tracking-wider text-slate-500">Assinatura do Emissor / Prestador</div>
                    <div className="font-bold text-slate-900 text-xs mt-0.5">{nomeAssinatura || "—"}</div>
                    <div className="text-xs font-mono font-medium text-slate-500 mt-0.5">{cpfAssinatura ? `CPF/CNPJ: ${cpfAssinatura}` : "—"}</div>
                  </div>
                </div>

                {/* Bottom Receipt footer */}
                <div className="bg-slate-50 border-t border-slate-150 px-5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-500 uppercase shrink-0">
                  <span>BELLINATI PEREZ</span>
                  <span className="text-pink-500 font-extrabold">RECIBO DE QUITAÇÃO</span>
                </div>
              </div>

            </div>

            <p className="text-xs text-slate-500 uppercase font-bold text-center mt-4">
              Opções Simplificado ou Completo para preenchimento oficial.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
