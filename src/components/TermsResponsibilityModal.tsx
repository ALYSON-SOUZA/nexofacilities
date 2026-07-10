import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import ExcelJS from "exceljs";
import { Sparkles, X, Printer, RefreshCw, Trash2, Check, Download, FileText, FileSpreadsheet, Key, Laptop, Car, CreditCard, ChevronDown, CheckSquare, Square, Plus } from "lucide-react";
import { TermsResponsibilityData, MeiContractData } from "../types";
import { dbFetchMeiSuppliers } from "../supabaseClient";
import { EmojiButton } from "./EmojiButton";

interface TermsResponsibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  visualTheme?: string;
}

export interface CustomTermType {
  id: string;
  label: string;
  color: string;
  fields: Array<{ key: string; label: string; placeholder: string; size?: "half" | "full" }>;
  clauses: string[];
}

export const DEFAULT_TERMS: CustomTermType[] = [
  {
    id: "chaves",
    label: "Termo de Chaves",
    color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20",
    fields: [
      { key: "nomeChavePorta", label: "Chave/Porta", placeholder: "EX: SALA DE REUNIÕES 01" },
      { key: "codigoChave", label: "Código Chave", placeholder: "EX: KEY-A504" },
      { key: "localPorta", label: "Local/Sala", placeholder: "EX: BLOCO B - SEDE" },
      { key: "observacaoChaves", label: "Observação", placeholder: "EX: DEVOLVER APÓS EXPEDIENTE" }
    ],
    clauses: [
      "1. O Colaborador declara ter recebido a chave acima especificada sob sua inteira guarda e responsabilidade.",
      "2. Compromete-se a zelar pela chave de acesso, não realizando cópias sem autorização prévia por escrito da Diretoria.",
      "3. É terminantemente proibido transferir, emprestar ou ceder a chave para pessoas não autorizadas e de fora do setor.",
      "4. Em caso de extravio, perda ou danificação da chave, o colaborador deverá reportar imediatamente ao setor administrativo."
    ]
  },
  {
    id: "equipamentos",
    label: "Equipamento & Comodato",
    color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20",
    fields: [
      { key: "descricaoEquipamento", label: "Equipamento", placeholder: "EX: NOTEBOOK DE TRABALHO" },
      { key: "marcaModelo", label: "Marca/Modelo", placeholder: "EX: DELL INSPIRON 15" },
      { key: "numeroSerie", label: "Nº de Série", placeholder: "EX: ABC123XYZ" },
      { key: "patrimonio", label: "Patrimônio", placeholder: "EX: PAT-84954" },
      { key: "estadoConservacao", label: "Conservação", placeholder: "EX: NOVO / BOM ESTADO" },
      { key: "valorEstimado", label: "Valor Estimado", placeholder: "EX: R$ 4.500,00" }
    ],
    clauses: [
      "1. O Colaborador assume o compromisso de utilizar o equipamento exclusivamente para fins corporativos e profissionais.",
      "2. Compromete-se a zelar pelo bom estado de funcionamento, mantendo softwares licenciados instalados pelo setor de TI.",
      "3. Em caso de perda, roubo, furto ou danos decorrentes de negligência, poderá ser descontado o valor correspondente do colaborador.",
      "4. Compromete-se a devolver o equipamento nas mesmas condições em que o recebeu em caso de rescisão de contrato."
    ]
  },
  {
    id: "veiculos",
    label: "Uso de Veículos",
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
    fields: [
      { key: "modeloVeiculo", label: "Veículo/Modelo", placeholder: "EX: ONIX 1.0 FLEX" },
      { key: "placaVeiculo", label: "Placa", placeholder: "EX: BRA-2E45" },
      { key: "renavamVeiculo", label: "RENAVAM", placeholder: "EX: 12345678901" },
      { key: "corVeiculo", label: "Cor", placeholder: "EX: BRANCO" },
      { key: "kmInicial", label: "KM Inicial", placeholder: "EX: 42.500" },
      { key: "nivelCombustivel", label: "Combustível", placeholder: "EX: MEIO TANQUE" }
    ],
    clauses: [
      "1. O motorista cadastrado assume total responsabilidade civil e criminal na condução do veículo corporativo.",
      "2. É proibida a condução do veículo sob efeito de bebidas alcoólicas, medicamentos sedativos ou substâncias entorpecentes.",
      "3. Multas de trânsito recebidas durante o período de condução serão de responsabilidade financeira do motorista.",
      "4. O veículo deve ser devolvido devidamente limpo e com o nível de combustível acordado com a equipe de facilities."
    ]
  },
  {
    id: "cartao",
    label: "Cartão Corporativo",
    color: "text-purple-500 bg-purple-50 dark:bg-purple-950/20",
    fields: [
      { key: "numeroCartao", label: "Finais Cartão", placeholder: "EX: 8594 (4 DÍGITOS)" },
      { key: "bandeiraCartao", label: "Bandeira", placeholder: "EX: VISA / MASTERCARD" },
      { key: "limiteMensal", label: "Limite Mensal", placeholder: "EX: R$ 2.000,00" },
      { key: "finalidadeCartao", label: "Finalidade", placeholder: "EX: CUSTAS DE VIAGEM" }
    ],
    clauses: [
      "1. O Cartão Corporativo destina-se única e exclusivamente ao pagamento de despesas de viagem e custas emergenciais.",
      "2. Todas as transações realizadas deverão ser comprovadas mediante apresentação de nota fiscal idônea em até 5 dias úteis.",
      "3. Despesas pessoais de qualquer natureza acarretarão o estorno imediato em folha e aplicação de medida disciplinar correspondente.",
      "4. O limite mensal estipulado no termo não poderá ser ultrapassado sem autorização da diretoria financeira da empresa."
    ]
  }
];

const DEFAULT_FORM_DATA: TermsResponsibilityData = {
  termType: "chaves",
  nomeCompleto: "",
  cargo: "",
  setor: "",
  cpf: "",
  rg: "",
  telefone: "",
  email: "",
  nomeChavePorta: "",
  codigoChave: "",
  localPorta: "",
  observacaoChaves: "",
  descricaoEquipamento: "",
  marcaModelo: "",
  numeroSerie: "",
  patrimonio: "",
  estadoConservacao: "",
  valorEstimado: "",
  modeloVeiculo: "",
  placaVeiculo: "",
  renavamVeiculo: "",
  corVeiculo: "",
  kmInicial: "",
  nivelCombustivel: "",
  numeroCartao: "",
  bandeiraCartao: "",
  limiteMensal: "",
  finalidadeCartao: ""
};

export default function TermsResponsibilityModal({ isOpen, onClose, visualTheme = "light" }: TermsResponsibilityModalProps) {
  const [activeTerm, setActiveTerm] = useState<string>("chaves");
  const [customTerms, setCustomTerms] = useState<CustomTermType[]>(() => {
    try {
      const stored = localStorage.getItem("bp_custom_terms_v1");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Error loading custom terms:", e);
    }
    return [];
  });
  const [isNewTermModalOpen, setIsNewTermModalOpen] = useState(false);
  const [newTermName, setNewTermName] = useState("");
  const [newTermRawText, setNewTermRawText] = useState("");
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);

  const allTerms = [...DEFAULT_TERMS, ...customTerms];
  const activeTermObj = allTerms.find(t => t.id === activeTerm) || DEFAULT_TERMS[0];

  const [formData, setFormData] = useState<any>({ ...DEFAULT_FORM_DATA });
  const [savedSuppliers, setSavedSuppliers] = useState<MeiContractData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
    }
  }, [isOpen]);

  // Sync activeTerm with formData.termType
  useEffect(() => {
    setFormData(prev => ({ ...prev, termType: activeTerm }));
  }, [activeTerm]);

  const loadSuppliers = async () => {
    try {
      const data = await dbFetchMeiSuppliers();
      setSavedSuppliers(data);
    } catch (err) {
      console.error("Erro ao carregar colaboradores:", err);
      const local = localStorage.getItem("bp_saved_mei_suppliers");
      if (local) {
        try { setSavedSuppliers(JSON.parse(local)); } catch (e) { /* ignore */ }
      }
    }
  };

  const handleSelectCollaborator = (colab: MeiContractData) => {
    setFormData(prev => ({
      ...prev,
      nomeCompleto: colab.nomeCompleto || "",
      cpf: colab.cpf || "",
      cargo: colab.funcaoAtividade || "",
      telefone: colab.pix || "", // Fallback pixel/phone if any
    }));
    setShowSupplierDropdown(false);
    setSearchQuery("");
    setStatusMessage(`Dados de "${colab.nomeCompleto}" carregados com sucesso!`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClear = () => {
    setFormData({ ...DEFAULT_FORM_DATA, termType: activeTerm });
    setPasteText("");
    setStatusMessage("Campos limpos.");
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleAIExtract = async () => {
    if (!pasteText.trim()) {
      alert("Por favor, cole algum texto contendo as informações para extrair.");
      return;
    }

    setIsExtracting(true);
    setStatusMessage("Analisando texto com IA Gemini...");
    try {
      const response = await fetch("/api/gemini/extract-terms-responsibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: pasteText, termType: activeTerm }),
      });

      if (!response.ok) {
        throw new Error("Falha ao se comunicar com o servidor de IA.");
      }

      const data = await response.json();
      setFormData(data);
      setPasteText("");
      setStatusMessage("Dados do termo extraídos e preenchidos!");
    } catch (err: any) {
      console.error(err);
      alert(`Erro na extração: ${err.message || "Erro desconhecido"}`);
      setStatusMessage("Falha ao extrair.");
    } finally {
      setIsExtracting(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleCreateCustomTerm = async () => {
    if (!newTermName.trim()) {
      alert("Por favor, informe o nome do termo.");
      return;
    }

    setIsGeneratingStructure(true);
    setStatusMessage("Construindo estrutura do termo com IA Gemini...");
    try {
      const response = await fetch("/api/gemini/create-term-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termName: newTermName, rawText: newTermRawText }),
      });

      if (!response.ok) {
        throw new Error("Erro de comunicação com o servidor.");
      }

      const termData = await response.json();
      
      const newTerm: CustomTermType = {
        id: termData.id || `custom-${Date.now()}`,
        label: termData.label || newTermName,
        color: "text-purple-500 bg-purple-50 dark:bg-purple-950/20",
        fields: termData.fields || [],
        clauses: termData.clauses || []
      };

      const updated = [...customTerms, newTerm];
      setCustomTerms(updated);
      localStorage.setItem("bp_custom_terms_v1", JSON.stringify(updated));

      setNewTermName("");
      setNewTermRawText("");
      setIsNewTermModalOpen(false);
      setActiveTerm(newTerm.id);
      
      setStatusMessage(`Estrutura para "${newTerm.label}" criada com sucesso!`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      alert("Falha ao criar termo: " + err.message);
    } finally {
      setIsGeneratingStructure(false);
    }
  };

  const handleDeleteCustomTerm = (termId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este modelo de termo personalizado?")) {
      const updated = customTerms.filter(t => t.id !== termId);
      setCustomTerms(updated);
      localStorage.setItem("bp_custom_terms_v1", JSON.stringify(updated));
      if (activeTerm === termId) {
        setActiveTerm("chaves");
      }
      setStatusMessage("Modelo de termo excluído.");
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // --- PDF PORTRAIT GENERATION ---
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const startX = 20;
      let currentY = 20;
      const width = 170; // 210mm wide A4 - 40mm margins (20mm each side)

      // Header company info
      doc.setDrawColor(180, 190, 200);
      doc.setLineWidth(0.3);
      doc.rect(startX, currentY, width, 22);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 30, 45);
      doc.text("ADV BELLINATI PEREZ", startX + 5, currentY + 6);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(80, 90, 100);
      doc.text("CNPJ: 03.404.018/0051-06", startX + 5, currentY + 11);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(80, 90, 100);
      const addressLines = doc.splitTextToSize("Av. Santos Dumont, 5335 — Salas 101 a 120 e 201 a 220 — CEP 60175-047 — Papicu — Fortaleza/CE", width - 45);
      doc.text(addressLines, startX + 5, currentY + 15);
      
      // Right date indicator
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(`DATA: ${new Date().toLocaleDateString("pt-BR")}`, startX + width - 35, currentY + 11);

      currentY += 28;

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(11, 79, 108);
      let termTitleText = `TERMO DE RESPONSABILIDADE DE ${activeTermObj.label.toUpperCase()}`;
      
      doc.text(termTitleText, startX + width / 2, currentY, { align: "center" });
      currentY += 10;

      // Box: Identificação do Responsável
      doc.setFillColor(242, 245, 248);
      doc.rect(startX, currentY, width, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(20, 35, 60);
      doc.text("1. IDENTIFICAÇÃO DO COLABORADOR / RESPONSÁVEL", startX + 3, currentY + 4.5);
      
      currentY += 6;
      doc.setDrawColor(180, 190, 200);
      doc.setLineWidth(0.2);
      doc.rect(startX, currentY, width, 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      doc.text(`Nome Completo: ${formData.nomeCompleto || "____________________________________________"}`, startX + 4, currentY + 6);
      doc.text(`CPF: ${formData.cpf || "_______________"}`, startX + 4, currentY + 13);
      doc.text(`RG: ${formData.rg || "_______________"}`, startX + width / 2, currentY + 13);
      doc.text(`Cargo: ${formData.cargo || "_______________"}`, startX + 4, currentY + 20);
      doc.text(`Setor / Filial: ${formData.setor || "_______________"}`, startX + width / 2, currentY + 20);

      currentY += 30;

      // Box: Especificações do Termo
      doc.setFillColor(242, 245, 248);
      doc.rect(startX, currentY, width, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 35, 60);
      doc.text("2. ESPECIFICAÇÕES DO OBJETO ENTREGUE", startX + 3, currentY + 4.5);
      
      currentY += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      
      const fieldsToDraw = activeTermObj.fields;
      let fieldYOffset = 6;
      for (let i = 0; i < fieldsToDraw.length; i += 2) {
        const f1 = fieldsToDraw[i];
        const val1 = formData[f1.key] || "____________________";
        doc.text(`${f1.label}: ${val1}`, startX + 4, currentY + fieldYOffset);

        if (fieldsToDraw[i + 1]) {
          const f2 = fieldsToDraw[i + 1];
          const val2 = formData[f2.key] || "____________________";
          doc.text(`${f2.label}: ${val2}`, startX + width / 2, currentY + fieldYOffset);
        }
        fieldYOffset += 8;
      }

      const rectHeight = fieldYOffset + 2;
      doc.rect(startX, currentY, width, rectHeight);

      currentY += rectHeight + 6;

      // Clauses
      doc.setFillColor(242, 245, 248);
      doc.rect(startX, currentY, width, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.text("3. CLÁUSULAS E RESPONSABILIDADES", startX + 3, currentY + 4.5);
      
      currentY += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(60, 60, 60);

      const selectedClauses = activeTermObj.clauses;
      selectedClauses.forEach((clause) => {
        const splitText = doc.splitTextToSize(clause, width - 6);
        doc.text(splitText, startX + 2, currentY);
        currentY += (splitText.length * 3.5) + 1;
      });

      currentY += 15;

      // Declarations & Signatures
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.text("Por estar de pleno acordo com os termos descritos acima, assino o presente documento.", startX, currentY);

      currentY += 24;

      doc.setDrawColor(120, 120, 120);
      doc.line(startX + 10, currentY, startX + 70, currentY);
      doc.line(startX + width - 70, currentY, startX + width - 10, currentY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("ASSINATURA DO COLABORADOR", startX + 40, currentY + 4, { align: "center" });
      doc.text("ADMINISTRAÇÃO / GESTOR", startX + width - 40, currentY + 4, { align: "center" });

      const safeName = formData.nomeCompleto.trim().replace(/\s+/g, "_") || "Responsavel";
      doc.save(`Termo_${activeTerm}_${safeName}.pdf`);
      
      setStatusMessage("Termo exportado para PDF com sucesso!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      alert("Erro ao exportar PDF.");
    }
  };

  // --- EXCEL GENERATION ---
  const handleExportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Termo de Responsabilidade");

      ws.views = [{ showGridLines: true }];

      // Define columns
      ws.columns = [
        { width: 4 }, // A
        { width: 15 }, // B
        { width: 15 }, // C
        { width: 15 }, // D
        { width: 15 }, // E
        { width: 15 }, // F
        { width: 15 }, // G
        { width: 15 }, // H
        { width: 15 }, // I
        { width: 15 }, // J
        { width: 15 }, // K
        { width: 15 }, // L
        { width: 15 }, // M
        { width: 15 }, // N
        { width: 4 }  // O
      ];

      // Merge and fill helper
      const merge_fill = (r1: number, c1: number, r2: number, c2: number, text: string, bold: boolean, size: number, fgColor: string, bgColor: string, align: "center" | "left" | "right") => {
        ws.mergeCells(r1, c1, r2, c2);
        for (let r = r1; r <= r2; r++) {
          for (let c = c1; c <= c2; c++) {
            const cell = ws.getCell(r, c);
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: bgColor }
            };
          }
        }
        const cell = ws.getCell(r1, c1);
        cell.value = text;
        cell.font = {
          name: "Arial",
          bold: bold,
          size: size,
          color: { argb: fgColor }
        };
        cell.alignment = {
          horizontal: align,
          vertical: "middle",
          wrapText: true
        };
      };

      // Styles label
      const style_label = (r: number, c: number, text: string) => {
        const cell = ws.getCell(r, c);
        cell.value = text;
        cell.font = { name: "Arial", bold: true, size: 8, color: { argb: "FF333333" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEFEFEF" }
        };
        cell.alignment = { horizontal: "left", vertical: "middle" };
      };

      // Styles field value
      const style_field = (r: number, c: number, text: string) => {
        const cell = ws.getCell(r, c);
        cell.value = text || "";
        cell.font = { name: "Arial", bold: false, size: 9, color: { argb: "FF000000" } };
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFCCCCCC" } }
        };
      };

      // Header background
      for (let r = 2; r <= 4; r++) {
        for (let c = 2; c <= 14; c++) {
          ws.getCell(r, c).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1A3A5A" }
          };
        }
      }
      merge_fill(2, 2, 2, 14, "ADV BELLINATI PEREZ", true, 11, "FFFFFFFF", "FF1A3A5A", "center");
      merge_fill(3, 2, 3, 14, "CNPJ: 03.404.018/0051-06", false, 8.5, "FFFFFFFF", "FF1A3A5A", "center");
      merge_fill(4, 2, 4, 14, "Av. Santos Dumont, 5335 — Salas 101 a 120 e 201 a 220 — CEP 60175-047 — Papicu — Fortaleza/CE", false, 7.5, "FFD2D5D8", "FF1A3A5A", "center");
      
      for (let c = 2; c <= 14; c++) {
        ws.getCell(5, c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF39C12" } // Orange stripe
        };
      }

      // 1. IDENTIFICATION
      merge_fill(7, 2, 7, 14, "1. IDENTIFICAÇÃO DO RESPONSÁVEL / COLABORADOR", true, 9, "FF1A3A5A", "FFE8F1F8", "left");
      
      style_label(8, 2, "Nome Completo:");
      ws.mergeCells(8, 3, 8, 7);
      style_field(8, 3, formData.nomeCompleto);

      style_label(8, 8, "CPF:");
      ws.mergeCells(8, 9, 8, 10);
      style_field(8, 9, formData.cpf);

      style_label(8, 11, "RG:");
      ws.mergeCells(8, 12, 8, 14);
      style_field(8, 12, formData.rg);

      style_label(9, 2, "Cargo:");
      ws.mergeCells(9, 3, 9, 7);
      style_field(9, 3, formData.cargo);

      style_label(9, 8, "Setor / Área:");
      ws.mergeCells(9, 9, 9, 14);
      style_field(9, 9, formData.setor);

      // 2. SPECIFIC OBJETO
      merge_fill(11, 2, 11, 14, "2. DESCRIÇÃO DO OBJETO ENTREGUE EM RESPONSABILIDADE", true, 9, "FF1A3A5A", "FFE8F1F8", "left");

      let currentExcelRow = 12;
      const fieldsToDraw = activeTermObj.fields;
      for (let i = 0; i < fieldsToDraw.length; i += 2) {
        const f1 = fieldsToDraw[i];
        style_label(currentExcelRow, 2, f1.label + ":");
        ws.mergeCells(currentExcelRow, 3, currentExcelRow, 7);
        style_field(currentExcelRow, 3, formData[f1.key] || "");

        if (fieldsToDraw[i + 1]) {
          const f2 = fieldsToDraw[i + 1];
          style_label(currentExcelRow, 8, f2.label + ":");
          ws.mergeCells(currentExcelRow, 9, currentExcelRow, 14);
          style_field(currentExcelRow, 9, formData[f2.key] || "");
        } else {
          ws.mergeCells(currentExcelRow, 8, currentExcelRow, 14);
          style_field(currentExcelRow, 8, "");
        }
        currentExcelRow++;
      }

      // 3. TERMS
      const termsRow = currentExcelRow + 2;
      merge_fill(termsRow, 2, termsRow, 14, "3. DECLARAÇÃO DE COMPROMISSO E DEVERES", true, 9, "FF1A3A5A", "FFE8F1F8", "left");
      
      const declText = activeTermObj.clauses.join(" ") || `Declaro para os devidos fins de direito que recebi o objeto especificado acima em plenas condições de uso e perfeito estado de conservação. Comprometo-me a cumprir todas as obrigações e regras decorrentes deste Termo de Responsabilidade e das Políticas Internas da empresa. Em caso de extravio, perda ou danificação por dolo ou negligência, aceito os descontos legais equivalentes.`;
      
      ws.mergeCells(termsRow + 1, 2, termsRow + 4, 14);
      const textCell = ws.getCell(termsRow + 1, 2);
      textCell.value = declText;
      textCell.font = { name: "Arial", size: 8, color: { argb: "FF555555" }, italic: true };
      textCell.alignment = { wrapText: true, vertical: "top" };

      // 4. SIGNATURES
      const sigRow = termsRow + 7;
      ws.mergeCells(sigRow, 2, sigRow, 7);
      ws.getCell(sigRow, 2).border = { top: { style: "thin" } };
      ws.getCell(sigRow, 2).value = "ASSINATURA DO COLABORADOR";
      ws.getCell(sigRow, 2).alignment = { horizontal: "center" };
      ws.getCell(sigRow, 2).font = { name: "Arial", bold: true, size: 7.5 };

      ws.mergeCells(sigRow, 9, sigRow, 14);
      ws.getCell(sigRow, 9).border = { top: { style: "thin" } };
      ws.getCell(sigRow, 9).value = "ADMINISTRAÇÃO / GESTOR";
      ws.getCell(sigRow, 9).alignment = { horizontal: "center" };
      ws.getCell(sigRow, 9).font = { name: "Arial", bold: true, size: 7.5 };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = formData.nomeCompleto.trim().replace(/\s+/g, "_") || "Responsavel";
      a.href = url;
      a.download = `Termo_${activeTerm}_${safeName}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      setStatusMessage("Termo exportado para Excel!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
      alert("Erro ao exportar Excel.");
    }
  };

  // --- SAVE AS TXT ---
  const handleExportTXT = () => {
    try {
      let documentContent = `ADV BELLINATI PEREZ
CNPJ: 03.404.018/0051-06
Av. Santos Dumont, 5335 — Salas 101 a 120 e 201 a 220 — CEP 60175-047 — Papicu — Fortaleza/CE
================================================================================
TERMO DE RESPONSABILIDADE ADMINISTRATIVO — DE ${activeTermObj.label.toUpperCase()}
================================================================================
1. IDENTIFICAÇÃO DO COLABORADOR / RESPONSÁVEL
Nome Completo: ${formData.nomeCompleto || ""}
CPF: ${formData.cpf || ""}
RG: ${formData.rg || ""}
Cargo: ${formData.cargo || ""}
Setor / Área: ${formData.setor || ""}
Telefone: ${formData.telefone || ""}
Email: ${formData.email || ""}

2. ESPECIFICAÇÕES DO OBJETO ENTREGUE EM RESPONSABILIDADE
`;

      activeTermObj.fields.forEach((field) => {
        const val = formData[field.key] || "";
        documentContent += `${field.label}: ${val}\n`;
      });

      documentContent += `

--------------------------------------------------------------------------------
3. COMPROMISSO E DECLARAÇÃO
O Colaborador identificado declara expressamente ter recebido o(s) objeto(s) 
acima descrito(s), assumindo total compromisso de zelar por sua correta utilização 
e boa conservação. Declara estar ciente de que o uso inadequado ou negligente 
que cause danos ao patrimônio da empresa ensejará a apuração de responsabilidades 
com a possibilidade de desconto legal.

Emitido digitalmente via Sistema BP-Compras em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}.

--------------------------------------------------------------------------------
Assinatura do Colaborador: _____________________________________________________
Assinatura da Administração: ____________________________________________________
`;

      const blob = new Blob([documentContent], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = formData.nomeCompleto.trim().replace(/\s+/g, "_") || "Responsavel";
      link.href = url;
      link.download = `Termo_${activeTerm}_${safeName}.txt`;
      link.click();
      window.URL.revokeObjectURL(url);

      setStatusMessage("Termo salvo em TXT com sucesso!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      console.error(e);
      alert("Erro ao exportar TXT.");
    }
  };

  const colors = {
    navy: "#1A3A5A",
    lightBlue: "#E8F1F8",
    orange: "#FFF39C12",
    rowBorder: "rgba(226, 232, 240, 1)"
  };

  const getFieldClass = (value: string) => {
    return `flex-1 px-3 py-2 text-[10.5px] bg-transparent focus:outline-hidden text-slate-900 dark:text-white placeholder-slate-400 font-bold tracking-wide uppercase ${
      value ? "font-black text-blue-900 dark:text-blue-300" : ""
    }`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="relative bg-white dark:bg-[#1E222B] w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[92vh]">
        
        {/* Top Header Bar with Emoji Close Button */}
        <div className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-[#15171d] border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span className="text-xs font-black tracking-wider uppercase text-[#0B4F6C] dark:text-[#5fa8c9]">
              Emissão de Termos de Responsabilidade & Comodato
            </span>
          </div>
          
          <EmojiButton
            iconKey="fecharModal"
            onClick={onClose}
            size="sm"
            variant="custom"
            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-bold rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2 text-xs border border-rose-150 dark:border-rose-900/20 shadow-2xs"
          />
        </div>

        {/* Inner Content Area */}
        <div className="flex flex-col md:flex-row overflow-hidden flex-1">
          
          {/* Left Side: Select Terms checklist & AI extractor */}
          <div className="w-full md:w-2/5 p-5 bg-slate-50 dark:bg-[#171a21] border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col gap-4 overflow-y-auto">
            
            {/* Checklist of Terms Selection Bar */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-white dark:bg-[#1a1d24] shadow-2xs">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
                Barra de Seleção de Termos (Checklist)
              </h3>
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                {allTerms.map((term) => {
                  const isSelected = activeTerm === term.id;
                  const IconComp = term.id === "chaves" ? Key : term.id === "equipamentos" ? Laptop : term.id === "veiculos" ? Car : term.id === "cartao" ? CreditCard : FileText;
                  const isCustom = customTerms.some(ct => ct.id === term.id);
                  return (
                    <div key={term.id} className="relative group flex items-center w-full">
                      <button
                        onClick={() => setActiveTerm(term.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                          isSelected 
                            ? "border-[#08D9D6] bg-slate-100/60 dark:bg-slate-800/30" 
                            : "border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900/60"
                        } ${isCustom ? "pr-10" : "pr-8"}`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className={`p-1.5 rounded-md shrink-0 ${term.color || "text-purple-500 bg-purple-50 dark:bg-purple-950/20"}`}>
                            <IconComp className="h-4 w-4" />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-tight text-slate-700 dark:text-slate-200 truncate">
                            {term.label}
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-[#08D9D6]" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300 dark:text-slate-700" />
                          )}
                        </div>
                      </button>

                      {isCustom && (
                        <EmojiButton
                          iconKey="excluir"
                          onClick={(e) => handleDeleteCustomTerm(term.id, e)}
                          size="sm"
                          variant="custom"
                          className="absolute right-8 text-slate-400 hover:text-red-500 transition-all p-1 min-h-0 min-w-0 h-6 w-6 text-xs"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <EmojiButton
                iconKey="adicionar"
                onClick={() => setIsNewTermModalOpen(true)}
                size="md"
                variant="primary"
                className="w-full mt-3 bg-slate-50 dark:bg-[#13151b] border border-dashed border-[#08D9D6]/35 hover:border-[#08D9D6] hover:bg-[#08D9D6]/5 text-[#08D9D6]"
              />
            </div>

            {/* Pre-fill Collaborator Panel */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-white dark:bg-[#1a1d24] shadow-2xs relative">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                Vincular à Ficha de Colaborador Salvo
              </h3>
              <div className="relative">
                <button
                  onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                  className="w-full p-2 bg-slate-50 dark:bg-[#13151b] border border-slate-200 dark:border-slate-800 rounded-lg text-left text-[11px] text-slate-700 dark:text-slate-300 font-bold flex items-center justify-between cursor-pointer"
                >
                  <span>Importar Dados do Colaborador...</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {showSupplierDropdown && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-[160px] overflow-y-auto bg-white dark:bg-[#20242e] border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg">
                    {savedSuppliers.length === 0 ? (
                      <div className="p-3 text-[10px] text-slate-500 italic text-center">
                        Nenhum colaborador salvo encontrado.
                      </div>
                    ) : (
                      savedSuppliers.map((colab) => (
                        <button
                          key={colab.nomeCompleto}
                          onClick={() => handleSelectCollaborator(colab)}
                          className="w-full px-3 py-2 text-left text-[10.5px] hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 font-medium border-b border-slate-100 dark:border-slate-800 flex flex-col cursor-pointer"
                        >
                          <span className="font-bold uppercase">{colab.nomeCompleto}</span>
                          <span className="text-[9px] text-slate-400">CPF: {colab.cpf || "Sem CPF"}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* AI Text Extractor */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-white dark:bg-[#1a1d24] shadow-2xs">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                Preencher com IA Gemini 🤖
              </h3>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Cole dados brutos do colaborador e do objeto (ex: 'João da Silva CPF 123 recebeu a chave da sala de TI ontem')"
                className="w-full min-h-[90px] p-2 text-[11px] bg-slate-50 dark:bg-[#13151b] border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#08D9D6] resize-none text-slate-700 dark:text-slate-200 font-medium"
              />

              <div className="mt-3 flex gap-1.5">
                <EmojiButton
                  iconKey="geradorIA"
                  onClick={handleAIExtract}
                  disabled={isExtracting}
                  size="md"
                  variant="primary"
                  className="flex-1 bg-[#08D9D6] hover:bg-teal-500 border-[#08D9D6]"
                />

                <EmojiButton
                  iconKey="limpar"
                  onClick={handleClear}
                  size="md"
                  variant="custom"
                  className="px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 text-slate-650 dark:text-slate-450 rounded-lg transition-all cursor-pointer flex items-center justify-center min-h-0"
                />
              </div>
            </div>
            
            {statusMessage && (
              <div className="p-2.5 bg-slate-800 text-teal-400 text-[10.5px] font-bold uppercase text-center rounded-lg animate-pulse">
                {statusMessage}
              </div>
            )}
          </div>

          {/* Right Side: Visual Paper/Form Preview */}
          <div className="flex-1 p-5 flex flex-col overflow-y-auto max-h-[70vh] md:max-h-none">
            
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#FF2E63]" />
                Visualização do Termo em Tempo Real
              </h2>
              
              <div className="flex items-center gap-2 flex-wrap">
                <EmojiButton
                  iconKey="gerarRelatorio"
                  onClick={handleExportPDF}
                  size="sm"
                  variant="custom"
                  className="bg-[#FF2E63] hover:bg-pink-600 text-white rounded-full shadow-md min-h-0 py-1.5 px-3 border-[#FF2E63]"
                />

                <EmojiButton
                  iconKey="exportarExcel"
                  onClick={handleExportExcel}
                  size="sm"
                  variant="custom"
                  className="bg-[#107C41] hover:bg-green-700 text-white rounded-full shadow-md min-h-0 py-1.5 px-3 border-[#107C41]"
                />

                <EmojiButton
                  iconKey="salvarTXT"
                  onClick={handleExportTXT}
                  size="sm"
                  variant="custom"
                  className="bg-[#0B4F6C] hover:bg-[#083E54] text-white rounded-full shadow-md min-h-0 py-1.5 px-3 border-[#0B4F6C]"
                />
              </div>
            </div>

            {/* Live Interactive Form Spreadsheet layout */}
            <div className="bg-slate-50 dark:bg-[#1a1c23] border border-slate-200 dark:border-slate-800 rounded-xl p-3 md:p-6 overflow-x-auto">
              <div className="w-full min-w-[320px] max-w-4xl mx-auto border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E222B] text-slate-800 dark:text-white font-sans text-[11px] select-text shadow-md">
                
                {/* Header Strip */}
                <div className="bg-[#1A3A5A] text-white flex flex-col items-center justify-center py-4 px-4 text-center">
                  <div className="font-black text-xs uppercase tracking-widest text-[#08D9D6] mb-1">
                    ADV BELLINATI PEREZ
                  </div>
                  <div className="text-[9px] font-bold text-slate-300 tracking-wider mb-1">
                    CNPJ: 03.404.018/0051-06
                  </div>
                  <div className="text-[8px] text-slate-400 font-medium max-w-xl leading-relaxed">
                    Av. Santos Dumont, 5335 — Salas 101 a 120 e 201 a 220 — CEP 60175-047 — Papicu — Fortaleza/CE
                  </div>
                </div>
                
                {/* Visual Orange Stripe */}
                <div style={{ backgroundColor: colors.orange, height: "4px" }} />

                {/* Section 1: Identificação */}
                <div 
                  style={{ backgroundColor: colors.lightBlue, color: colors.navy, borderBottomColor: colors.navy, borderBottomWidth: "2px" }}
                  className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wider"
                >
                  1. IDENTIFICAÇÃO DO COLABORADOR / RESPONSÁVEL
                </div>

                <div className="border-b border-slate-200 dark:border-slate-800 grid grid-cols-12 min-h-[40px]">
                  <div className="col-span-12 flex flex-col sm:flex-row">
                    <div className="w-full sm:w-28 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-850 text-slate-400">
                      Nome Completo:
                    </div>
                    <input
                      type="text"
                      value={formData.nomeCompleto}
                      onChange={(e) => handleInputChange("nomeCompleto", e.target.value)}
                      className={getFieldClass(formData.nomeCompleto)}
                      placeholder="NOME COMPLETO DO COLABORADOR"
                    />
                  </div>
                </div>

                <div className="border-b border-slate-200 dark:border-slate-800 grid grid-cols-12 min-h-[40px]">
                  <div className="col-span-12 md:col-span-6 flex flex-col sm:flex-row border-b md:border-b-0 border-r-0 md:border-r border-slate-200 dark:border-slate-800">
                    <div className="w-full sm:w-20 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-850 text-slate-400">
                      CPF:
                    </div>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={(e) => handleInputChange("cpf", e.target.value)}
                      className={getFieldClass(formData.cpf)}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="col-span-12 md:col-span-6 flex flex-col sm:flex-row">
                    <div className="w-full sm:w-20 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-850 text-slate-400">
                      RG:
                    </div>
                    <input
                      type="text"
                      value={formData.rg}
                      onChange={(e) => handleInputChange("rg", e.target.value)}
                      className={getFieldClass(formData.rg)}
                      placeholder="00.000.000-0"
                    />
                  </div>
                </div>

                <div className="border-b border-slate-200 dark:border-slate-800 grid grid-cols-12 min-h-[40px]">
                  <div className="col-span-12 md:col-span-6 flex flex-col sm:flex-row border-b md:border-b-0 border-r-0 md:border-r border-slate-200 dark:border-slate-800">
                    <div className="w-full sm:w-20 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-850 text-slate-400">
                      Cargo:
                    </div>
                    <input
                      type="text"
                      value={formData.cargo}
                      onChange={(e) => handleInputChange("cargo", e.target.value)}
                      className={getFieldClass(formData.cargo)}
                      placeholder="CARGO / FUNÇÃO"
                    />
                  </div>
                  <div className="col-span-12 md:col-span-6 flex flex-col sm:flex-row">
                    <div className="w-full sm:w-20 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-850 text-slate-400">
                      Setor:
                    </div>
                    <input
                      type="text"
                      value={formData.setor}
                      onChange={(e) => handleInputChange("setor", e.target.value)}
                      className={getFieldClass(formData.setor)}
                      placeholder="SETOR / DEPARTAMENTO"
                    />
                  </div>
                </div>

                {/* Section 2: Especificações */}
                <div 
                  style={{ backgroundColor: colors.lightBlue, color: colors.navy, borderBottomColor: colors.navy, borderBottomWidth: "2px" }}
                  className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wider"
                >
                  2. ESPECIFICAÇÕES DO OBJETO ENTREGUE
                </div>

                {(() => {
                  const chunkedFields: typeof activeTermObj.fields[] = [];
                  for (let i = 0; i < activeTermObj.fields.length; i += 2) {
                    chunkedFields.push(activeTermObj.fields.slice(i, i + 2));
                  }
                  return chunkedFields.map((pair, rowIndex) => (
                    <div key={rowIndex} className="border-b border-slate-200 dark:border-slate-800 grid grid-cols-12 min-h-[40px]">
                      {pair.map((field, fIdx) => {
                        const isLastSingle = pair.length === 1;
                        const colSpanClass = isLastSingle ? "col-span-12" : "col-span-12 md:col-span-6";
                        const borderClass = (fIdx === 0 && !isLastSingle) ? "border-b md:border-b-0 border-r-0 md:border-r border-slate-200 dark:border-slate-800" : "";
                        return (
                          <div key={field.key} className={`flex flex-col sm:flex-row ${colSpanClass} ${borderClass}`}>
                            <div className="w-full sm:w-28 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-850 text-slate-400 shrink-0">
                              {field.label}:
                            </div>
                            <input
                              type="text"
                              value={formData[field.key] || ""}
                              onChange={(e) => handleInputChange(field.key, e.target.value)}
                              className={getFieldClass(formData[field.key])}
                              placeholder={`INFORMAR ${field.label.toUpperCase()}`}
                            />
                          </div>
                        );
                      })}
                      {pair.length === 1 && (
                        <div className="hidden md:block col-span-6 bg-slate-50/20 dark:bg-transparent" />
                      )}
                    </div>
                  ));
                })()}

                {/* Section 3: Cláusulas */}
                <div 
                  style={{ backgroundColor: colors.lightBlue, color: colors.navy, borderBottomColor: colors.navy, borderBottomWidth: "2px" }}
                  className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wider"
                >
                  3. COMPROMISSOS E CLÁUSULAS LEGAIS
                </div>
                
                <div className="p-4 bg-slate-50/50 dark:bg-[#121419] border-b border-slate-200 dark:border-slate-800 space-y-2">
                  {activeTermObj.clauses.map((clause, idx) => (
                    <p key={idx} className="text-[10px] text-slate-500 italic leading-relaxed text-justify">
                      {idx + 1}. {clause}
                    </p>
                  ))}
                </div>

                {/* Section 4: Assinaturas */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 dark:bg-[#121419] min-h-[100px]">
                  <div className="flex flex-col items-center justify-end pt-8">
                    <div className="w-full border-t border-slate-400 dark:border-slate-600 my-1" />
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 text-center">
                      ASSINATURA DO COLABORADOR
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-end pt-8">
                    <div className="w-full border-t border-slate-400 dark:border-slate-600 my-1" />
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 text-center">
                      ADMINISTRAÇÃO / RECURSOS HUMANOS
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
      {/* Dynamic Term Creation Sub-Modal */}
      {isNewTermModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#13151b]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-[#08D9D6]" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Criar Novo Modelo de Termo
                </h4>
              </div>
              <button 
                onClick={() => setIsNewTermModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Nome do Termo / Objeto
                </label>
                <input
                  type="text"
                  placeholder="EX: Termo de Chaves, Entrega de Notebook, etc."
                  value={newTermName}
                  onChange={(e) => setNewTermName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-[#13151b] border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#08D9D6] text-slate-700 dark:text-slate-200 font-bold placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Dados ou Texto de Referência</span>
                  <span className="text-[9px] text-[#08D9D6] font-medium lowercase italic">Gemini criará a estrutura ideal</span>
                </label>
                <textarea
                  placeholder="Exemplo de conteúdo que você quer que exista nesse termo. A IA do Gemini analisará este texto para identificar automaticamente quais campos (marca, modelo, chaves, placa, etc.) e cláusulas de responsabilidade o seu termo precisa, gerando uma ficha limpa e elegante estruturada!"
                  value={newTermRawText}
                  onChange={(e) => setNewTermRawText(e.target.value)}
                  className="w-full min-h-[140px] p-2.5 text-xs bg-slate-50 dark:bg-[#13151b] border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#08D9D6] text-slate-700 dark:text-slate-200 font-medium placeholder-slate-400 resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#13151b] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsNewTermModalOpen(false)}
                className="px-4 py-2 text-[10.5px] font-bold uppercase text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleCreateCustomTerm}
                disabled={isGeneratingStructure || !newTermName.trim()}
                className="px-4 py-2 bg-[#08D9D6] hover:bg-teal-500 disabled:opacity-50 text-slate-900 text-[10.5px] font-black uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {isGeneratingStructure ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Estruturando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>ESTRUTURAR TERMO</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
