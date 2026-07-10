import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import ExcelJS from "exceljs";
import { Sparkles, X, Printer, RefreshCw, Clipboard, Trash2, Check, Download, FileText, FileSpreadsheet, Search, Save } from "lucide-react";
import { MeiContractData } from "../types";
import { dbFetchMeiSuppliers, dbUpsertMeiSupplier, dbDeleteMeiSupplier } from "../supabaseClient";
import { EmojiButton } from "./EmojiButton";

interface MeiContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  visualTheme?: "light" | "comfort" | "ultradark";
}

const emptyForm: MeiContractData = {
  nomeCompleto: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cep: "",
  cidade: "",
  uf: "",
  dataNascimento: "",
  naturalidade: "",
  naturalidadeUf: "",
  sexo: "",
  grauInstrucao: "",
  estadoCivil: "",
  dataCasamento: "",
  nomeConjuge: "",
  racaCor: "",
  funcaoAtividade: "",
  cpf: "",
  pis: "",
  pix: "",
  banco: "",
  cnpj: "",
  agencia: "",
  conta: "",
};

// Formatter functions
const formatCPF = (val: string) => {
  const clean = val.replace(/\D/g, "");
  if (clean.length <= 11) {
    return clean
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return val.slice(0, 14);
};

const formatCNPJ = (val: string) => {
  const clean = val.replace(/\D/g, "");
  if (clean.length <= 14) {
    return clean
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }
  return val.slice(0, 18);
};

const formatCEP = (val: string) => {
  const clean = val.replace(/\D/g, "");
  if (clean.length <= 8) {
    return clean.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
  }
  return val.slice(0, 9);
};

const formatDate = (val: string) => {
  const clean = val.replace(/\D/g, "");
  if (clean.length <= 8) {
    return clean
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2})(\d)/, "$1/$2");
  }
  return val.slice(0, 10);
};

// Preset sample to demonstrate instantly
const sampleForm: MeiContractData = {
  nomeCompleto: "Claudio Oliveira de Sousa",
  endereco: "Rua Vergueiro",
  numero: "2048",
  complemento: "Apto 105 Bloco B",
  bairro: "Vila Mariana",
  cep: "04102-000",
  cidade: "São Paulo",
  uf: "SP",
  dataNascimento: "12/04/1990",
  naturalidade: "Belo Horizonte",
  naturalidadeUf: "MG",
  sexo: "M",
  grauInstrucao: "Superior (completo)",
  estadoCivil: "Casado",
  dataCasamento: "20/10/2018",
  nomeConjuge: "Aline Pereira de Sousa",
  racaCor: "Parda",
  funcaoAtividade: "Instalador de Divisórias & Reparos",
  cpf: "283.940.118-42",
  pis: "128.49581.03-9",
  pix: "claudio.sousa@gmail.com",
  banco: "Banco Itaú",
  cnpj: "40.384.293/0001-92",
  agencia: "0340",
  conta: "28401-2",
};

export default function MeiContractModal({ isOpen, onClose, visualTheme = "light" }: MeiContractModalProps) {
  const [formData, setFormData] = useState<MeiContractData>(emptyForm);
  const [pasteText, setPasteText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Dynamic color configuration based on the active visual theme, matching the physical form spec
  const colors = {
    navy: visualTheme === "ultradark" ? "#1E293B" : "#1a3a5a",
    orange: visualTheme === "ultradark" ? "#FF2E63" : "#f39c12",
    lightBlue: visualTheme === "ultradark" ? "#334155" : "#e8f1f8",
    empty: visualTheme === "ultradark" ? "#1E222B" : "#ececec",
    border: visualTheme === "ultradark" ? "#475569" : "#bdc3c7",
    textNavy: visualTheme === "ultradark" ? "#38BDF8" : "#1a3a5a",
    textMuted: visualTheme === "ultradark" ? "#94A3B8" : "#666666",
    textMain: visualTheme === "ultradark" ? "#F1F5F9" : "#1e293b",
    bgForm: visualTheme === "ultradark" ? "#0F172A" : "#ffffff",
    rowBorder: visualTheme === "ultradark" ? "#334155" : "#eeeeee",
  };

  // Helper to apply the 'is-empty' styles requested by the user (input background #ececec if empty)
  const getFieldClass = (value: string) => {
    const isValEmpty = !value || value.trim() === "";
    return `flex-1 px-3 py-1.5 text-xs bg-transparent focus:ring-0 focus:outline-hidden font-semibold transition-colors duration-200 ${
      isValEmpty ? "bg-[#ececec]/85 dark:bg-slate-800/60" : ""
    }`;
  };

  // Heuristic Local Parser (Translates and improves the user's runIA script for robust React usage)
  const handleLocalExtract = () => {
    if (!pasteText.trim()) {
      alert("Por favor, cole algum texto contendo as informações do profissional para extrair.");
      return;
    }

    const text = pasteText;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== "");

    const sanitize = (val: string, isPix = false) => {
      if (!val) return "";
      let cleaned = val.replace(/\(.*\)/g, '').replace(/[:\-]/g, '').trim();
      if (isPix) cleaned = cleaned.replace(/\s+/g, '');
      return cleaned;
    };

    const find = (keys: string[], numericOnly = false) => {
      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i].toLowerCase();
        for (let k of keys) {
          if (currentLine.includes(k.toLowerCase())) {
            let val = lines[i].substring(currentLine.indexOf(k.toLowerCase()) + k.length).trim();
            
            if (val.startsWith(":") || val.startsWith("-") || val.startsWith("=")) {
              val = val.substring(1).trim();
            }

            if (val.replace(/[:\-]/g, '').trim() === "" && lines[i + 1]) {
              const nextLow = lines[i + 1].toLowerCase();
              const isLabel = labelsList.some(lbl => nextLow.startsWith(lbl));
              if (!isLabel) val = lines[i + 1];
              else val = "";
            }

            let final = sanitize(val, keys.includes('PIX') || keys.includes('pix'));
            if (numericOnly && final !== "" && !/[\d]/.test(final)) return "";
            return final;
          }
        }
      }
      return "";
    };

    const labelsList = [
      "nome completo", "endereço", "número", "complemento", "bairro", "cep", "cidade", "uf", "estado",
      "data de nascimento", "nascimento", "naturalidade", "uf de nascimento", "sexo", "escolaridade", "instrução",
      "estado civil", "data de casamento", "nome do cônjuge", "raça", "cor", "função", "atividade", 
      "documentos", "cpf", "pis", "dados bancários", "banco", "ag", "agência", "conta", "pix"
    ];

    const nomeCompleto = find(['Nome Completo', 'Nome:']);
    const endereco = find(['Endereço', 'Rua', 'Avenida', 'Logradouro']);
    const numero = find(['Número', 'Nº', 'Num:']);
    const complemento = find(['Complemento', 'Apto', 'Complemento:']);
    const bairro = find(['Bairro:', 'Bairro']);
    const cep = formatCEP(find(['CEP']));
    const cidade = find(['Cidade:', 'Cidade']);
    
    let uf = find(['UF (Estado)', 'UF:', 'Estado:']).toUpperCase();
    if (uf.length > 2) uf = uf.substring(0, 2);

    const dataNascimento = formatDate(find(['Data de Nascimento', 'Nascimento:']));
    const naturalidade = find(['Naturalidade:', 'Naturalidade']);
    
    let naturalidadeUf = find(['UF de Nascimento', 'UF Nasc', 'UF Natal']).toUpperCase();
    if (naturalidadeUf.length > 2) naturalidadeUf = naturalidadeUf.substring(0, 2);

    const estadoCivil = find(['Estado Civil:','Estado Civil']);
    const dataCasamento = formatDate(find(['Data de Casamento', 'Casamento:']));
    const nomeConjuge = find(['Nome do Cônjuge', 'Cônjuge', 'Conjuge']);
    const funcaoAtividade = find(['Função e/ou Atividade', 'Função:', 'Atividade:', 'Função / Atividade']);
    const cpf = formatCPF(find(['CPF'], true));
    const pis = find(['PIS'], true);
    const cnpj = formatCNPJ(find(['CNPJ'], true));
    const pix = find(['PIX', 'Pix:']);
    const banco = find(['Banco:','Banco']);
    const agencia = find(['Agência', 'Agência:', 'Ag ']);
    const conta = find(['Conta:', 'Conta Poupança']);

    const fullText = text.toLowerCase();
    
    // Sex Check
    let sexo = "";
    if (fullText.includes('sexo: m') || fullText.includes('sexo m') || fullText.includes('masculino') || fullText.includes(' homem')) {
      sexo = "M";
    } else if (fullText.includes('sexo: f') || fullText.includes('sexo f') || fullText.includes('feminino') || fullText.includes(' mulher')) {
      sexo = "F";
    }

    // Education Check
    let grauInstrucao = "";
    if (fullText.includes('superior completo') || fullText.includes('ensino superior completo')) {
      grauInstrucao = "Superior (completo)";
    } else if (fullText.includes('superior cursando') || fullText.includes('superior incompleto') || fullText.includes('superior (cursar)')) {
      grauInstrucao = "Superior (cursando)";
    } else if (fullText.includes('2º grau completo') || fullText.includes('ensino medio completo') || fullText.includes('ensino médio completo') || fullText.includes('2º grau (completo)')) {
      grauInstrucao = "2º Grau (completo)";
    } else if (fullText.includes('2º grau cursando') || fullText.includes('ensino medio incompleto') || fullText.includes('2º grau (cursando)')) {
      grauInstrucao = "2º Grau (cursando)";
    } else if (fullText.includes('1º grau') || fullText.includes('ensino fundamental') || fullText.includes('fundamental completo')) {
      grauInstrucao = "1º Grau";
    }

    // Race Check
    let racaCor = "";
    if (fullText.includes('branca') || fullText.includes('branco')) {
      racaCor = "Branca";
    } else if (fullText.includes('preta') || fullText.includes('negra') || fullText.includes('negro') || fullText.includes('preto')) {
      racaCor = "Preta";
    } else if (fullText.includes('parda') || fullText.includes('pardo')) {
      racaCor = "Parda";
    } else if (fullText.includes('amarela') || fullText.includes('amarelo')) {
      racaCor = "Amarela";
    } else if (fullText.includes('indígena') || fullText.includes('indigena') || fullText.includes('índio')) {
      racaCor = "Indígena";
    }

    setFormData({
      nomeCompleto,
      endereco,
      numero,
      complemento,
      bairro,
      cep,
      cidade,
      uf,
      dataNascimento,
      naturalidade,
      naturalidadeUf,
      sexo,
      grauInstrucao,
      estadoCivil,
      dataCasamento,
      nomeConjuge,
      racaCor,
      funcaoAtividade,
      cpf,
      pis,
      cnpj,
      pix,
      banco,
      agencia,
      conta
    });

    setStatusMessage("Distribuição com Heurística Local concluída!");
    setPasteText("");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // States for saved suppliers
  const [savedSuppliers, setSavedSuppliers] = useState<MeiContractData[]>(() => {
    try {
      const stored = localStorage.getItem("bp_saved_mei_suppliers");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error loading saved MEI suppliers", e);
    }
    return [sampleForm];
  });
  const [searchQuery, setSearchQuery] = useState("");

  const triggerCepLookup = async (rawCep: string) => {
    setIsSearchingCep(true);
    setStatusMessage("Buscando CEP...");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      if (res.ok) {
        const data = await res.json();
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            endereco: data.logradouro || prev.endereco,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            uf: data.uf ? data.uf.toUpperCase() : prev.uf,
          }));
          setStatusMessage("Endereço preenchido pelo CEP com sucesso!");
        } else {
          setStatusMessage("CEP não encontrado.");
        }
      }
    } catch (e) {
      console.error("Erro ao buscar CEP:", e);
      setStatusMessage("Erro ao buscar CEP de rede.");
    } finally {
      setIsSearchingCep(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Load from Supabase on mount/open
  useEffect(() => {
    if (!isOpen) return;
    const loadSuppliers = async () => {
      try {
        const data = await dbFetchMeiSuppliers();
        if (data && data.length > 0) {
          setSavedSuppliers(data);
          localStorage.setItem("bp_saved_mei_suppliers", JSON.stringify(data));
        } else {
          // If Supabase is empty, initialize with sampleForm
          setSavedSuppliers([sampleForm]);
        }
      } catch (err) {
        console.error("Error loading suppliers from Supabase:", err);
      }
    };
    loadSuppliers();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof MeiContractData, value: string) => {
    let formattedValue = value;
    if (field === "cpf") {
      formattedValue = formatCPF(value);
    } else if (field === "cnpj") {
      formattedValue = formatCNPJ(value);
    } else if (field === "cep") {
      formattedValue = formatCEP(value);
      const rawCep = value.replace(/\D/g, "");
      if (rawCep.length === 8) {
        triggerCepLookup(rawCep);
      }
    } else if (field === "dataNascimento" || field === "dataCasamento") {
      formattedValue = formatDate(value);
    }

    setFormData((prev) => ({
      ...prev,
      [field]: formattedValue,
    }));
  };

  const handleClear = () => {
    setFormData(emptyForm);
    setStatusMessage("Ficha limpa com sucesso.");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveSupplier = async () => {
    if (!formData.nomeCompleto.trim()) {
      alert("Por favor, preencha o Nome Completo do fornecedor para salvar.");
      return;
    }

    const updated = [...savedSuppliers];
    const index = updated.findIndex(
      (s) => s.nomeCompleto.trim().toLowerCase() === formData.nomeCompleto.trim().toLowerCase()
    );

    if (index >= 0) {
      updated[index] = { ...formData };
      setStatusMessage("Cadastro do fornecedor atualizado com sucesso!");
    } else {
      updated.push({ ...formData });
      setStatusMessage("Fornecedor cadastrado e salvo com sucesso!");
    }

    // Update state & local storage
    setSavedSuppliers(updated);
    localStorage.setItem("bp_saved_mei_suppliers", JSON.stringify(updated));

    // Save/Upsert to Supabase database
    try {
      await dbUpsertMeiSupplier(formData);
    } catch (err) {
      console.error("Error saving supplier to Supabase:", err);
    }

    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleDeleteSupplier = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    
    // Non-blocking, iframe-safe deletion without window.confirm (which is blocked inside the iframe)
    try {
      await dbDeleteMeiSupplier(name);
    } catch (err) {
      console.error("Error deleting supplier from Supabase:", err);
    }

    const updated = savedSuppliers.filter((s) => s.nomeCompleto !== name);
    setSavedSuppliers(updated);
    localStorage.setItem("bp_saved_mei_suppliers", JSON.stringify(updated));
    setStatusMessage(`Fornecedor "${name}" excluído com sucesso.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSelectSupplier = (supplier: MeiContractData) => {
    setFormData({ ...supplier });
    setStatusMessage(`Dados do fornecedor "${supplier.nomeCompleto}" carregados!`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const filteredSuppliers = savedSuppliers.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.nomeCompleto.toLowerCase().includes(q) ||
      (s.cpf && s.cpf.toLowerCase().includes(q)) ||
      (s.funcaoAtividade && s.funcaoAtividade.toLowerCase().includes(q))
    );
  });

  // Perform AI extraction via backend
  const handleAIExtract = async () => {
    if (!pasteText.trim()) {
      alert("Por favor, cole algum texto contendo as informações do profissional para extrair.");
      return;
    }

    setIsExtracting(true);
    setStatusMessage("Analisando texto com Inteligência Artificial...");
    try {
      const response = await fetch("/api/gemini/extract-mei-contract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rawText: pasteText }),
      });

      if (!response.ok) {
        throw new Error("Falha ao comunicar com o servidor de IA.");
      }

      const data = await response.json();
      setFormData(data);
      setStatusMessage("Dados extraídos e preenchidos com sucesso!");
      setPasteText(""); // clear paste area upon success
    } catch (error: any) {
      console.error(error);
      alert(`Erro na extração de IA: ${error.message || "Erro desconhecido"}`);
      setStatusMessage("Erro ao extrair dados.");
    } finally {
      setIsExtracting(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Save the form as a highly formatted real Excel .xlsx file conforming to the exact 16-column structure
  const handleExportExcel = async () => {
    try {
      const safeName = formData.nomeCompleto.trim().replace(/\s+/g, "_") || "Autonomo";

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Ficha de Autônomo", {
        views: [{ showGridLines: false }] // Hide standard gridlines just like python openpyxl
      });

      // 1. Column widths
      const larguras = [1, 14, 2, 10, 2, 10, 2, 10, 2, 10, 2, 10, 2, 10, 2, 1];
      larguras.forEach((w, idx) => {
        ws.getColumn(idx + 1).width = w;
      });

      // 2. Row heights
      for (let r = 1; r <= 46; r++) {
        ws.getRow(r).height = 18;
      }
      ws.getRow(1).height = 6;
      ws.getRow(2).height = 8;
      ws.getRow(3).height = 26;
      ws.getRow(4).height = 8;

      ws.getRow(5).height = 14;
      ws.getRow(6).height = 13;
      ws.getRow(7).height = 20;

      ws.getRow(9).height = 14;
      ws.getRow(10).height = 13;
      ws.getRow(11).height = 20;
      ws.getRow(12).height = 13;
      ws.getRow(13).height = 20;

      ws.getRow(15).height = 14;
      ws.getRow(16).height = 13;
      ws.getRow(17).height = 20;

      ws.getRow(19).height = 14;
      ws.getRow(20).height = 20;

      ws.getRow(22).height = 14;
      ws.getRow(23).height = 13;
      ws.getRow(24).height = 20;

      ws.getRow(26).height = 14;
      ws.getRow(27).height = 20;

      ws.getRow(29).height = 14;
      ws.getRow(30).height = 13;
      ws.getRow(31).height = 20;

      ws.getRow(32).height = 3;

      ws.getRow(33).height = 14;
      ws.getRow(34).height = 13;
      ws.getRow(35).height = 20;
      ws.getRow(36).height = 13;
      ws.getRow(37).height = 20;
      ws.getRow(38).height = 13;
      ws.getRow(39).height = 20;

      ws.getRow(41).height = 30;
      ws.getRow(42).height = 10;
      ws.getRow(43).height = 14;
      ws.getRow(45).height = 10;

      // Helper function for single-cell styling
      const cel = (
        row: number,
        col: number,
        valor: any = "",
        bold: boolean = false,
        size: number = 10,
        colorHex: string = "FF000000",
        bgHex?: string,
        align: "left" | "center" | "right" = "left",
        valign: "top" | "middle" | "bottom" = "middle"
      ) => {
        const c = ws.getCell(row, col);
        c.value = valor;
        c.font = {
          name: "Arial",
          bold: bold,
          size: size,
          color: { argb: colorHex }
        };
        c.alignment = {
          horizontal: align,
          vertical: valign,
          wrapText: false
        };
        if (bgHex) {
          c.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgHex }
          };
        }
        return c;
      };

      // Helper function to merge and style cells
      const merge_fill = (
        r1: number,
        c1: number,
        r2: number,
        c2: number,
        valor: any = "",
        bold: boolean = false,
        size: number = 10,
        colorHex: string = "FF000000",
        bgHex?: string,
        align: "left" | "center" | "right" = "left"
      ) => {
        ws.mergeCells(r1, c1, r2, c2);
        if (bgHex) {
          for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
              ws.getCell(r, c).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: bgHex }
              };
            }
          }
        }
        return cel(r1, c1, valor, bold, size, colorHex, bgHex, align);
      };

      // Helper function for section / field headers (Labels)
      const merge_cells_and_style_label = (r: number, c1: number, c2: number, text: string) => {
        ws.mergeCells(r, c1, r, c2);
        for (let c = c1; c <= c2; c++) {
          const cell = ws.getCell(r, c);
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE8F1F8" } // AZUL_CLARO (#e8f1f8)
          };
        }
        const c = ws.getCell(r, c1);
        c.value = text;
        c.font = {
          name: "Arial",
          bold: true,
          size: 8.5,
          color: { argb: "FF1A3A5A" } // AZUL_ESCURO (#1a3a5a)
        };
        c.alignment = {
          horizontal: "left",
          vertical: "middle"
        };
      };

      // Helper function to draw dynamic fields with thin gray borders and light-gray backgrounds
      const draw_campo_field = (r: number, c1: number, c2: number, value: any = "", fontSize = 9.5) => {
        ws.mergeCells(r, c1, r, c2);
        for (let col = c1; col <= c2; col++) {
          const cell = ws.getCell(r, col);
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF7F9FC" } // CINZA_CAMPO
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFB0BEC5' } },
            bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
            left: col === c1 ? { style: 'thin', color: { argb: 'FFB0BEC5' } } : undefined,
            right: col === c2 ? { style: 'thin', color: { argb: 'FFB0BEC5' } } : undefined
          };
        }
        const startCell = ws.getCell(r, c1);
        startCell.value = value;
        startCell.font = {
          name: "Arial",
          size: fontSize,
          color: { argb: "FF0F141E" }
        };
        startCell.alignment = {
          horizontal: "left",
          vertical: "middle"
        };
      };

      // --- SECTION 1: HEADER (Rows 2, 3, 4) ---
      for (let r of [2, 3, 4]) {
        for (let c = 1; c <= 16; c++) {
          ws.getCell(r, c).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1A3A5A" } // AZUL_ESCURO (#1a3a5a)
          };
        }
      }
      merge_fill(3, 2, 3, 15, "FICHA DE CONTRATAÇÃO DE AUTÔNOMO / MEI", true, 13, "FFFFFFFF", "FF1A3A5A", "center");
      for (let c = 2; c <= 15; c++) {
        ws.getCell(4, c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF39C12" } // LARANJA (#f39c12)
        };
      }

      // --- SECTION 2: IDENTIFICAÇÃO ---
      merge_fill(5, 2, 5, 15, "IDENTIFICAÇÃO", true, 8, "FF1A3A5A", "FFE8F1F8", "left");
      merge_cells_and_style_label(6, 2, 15, "NOME COMPLETO *");
      draw_campo_field(7, 2, 15, formData.nomeCompleto || "");

      // --- SECTION 3: ENDEREÇO ---
      merge_fill(9, 2, 9, 15, "ENDEREÇO", true, 8, "FF1A3A5A", "FFE8F1F8", "left");
      merge_cells_and_style_label(10, 2, 9, "ENDEREÇO (RUA / AV.) *");
      merge_cells_and_style_label(10, 10, 11, "NÚMERO *");
      merge_cells_and_style_label(10, 12, 15, "COMPLEMENTO");
      draw_campo_field(11, 2, 9, formData.endereco || "");
      draw_campo_field(11, 10, 11, formData.numero || "");
      draw_campo_field(11, 12, 15, formData.complemento || "");

      merge_cells_and_style_label(12, 2, 5, "BAIRRO *");
      merge_cells_and_style_label(12, 6, 7, "CEP *");
      merge_cells_and_style_label(12, 8, 13, "CIDADE *");
      merge_cells_and_style_label(12, 14, 15, "UF *");
      draw_campo_field(13, 2, 5, formData.bairro || "");
      draw_campo_field(13, 6, 7, formData.cep || "");
      draw_campo_field(13, 8, 13, formData.cidade || "");
      draw_campo_field(13, 14, 15, formData.uf || "");

      // --- SECTION 4: NASCIMENTO & SEXO ---
      merge_fill(15, 2, 15, 15, "NASCIMENTO & SEXO", true, 8, "FF1A3A5A", "FFE8F1F8", "left");
      merge_cells_and_style_label(16, 2, 5, "DATA DE NASCIMENTO *");
      merge_cells_and_style_label(16, 6, 9, "NATURALIDADE *");
      merge_cells_and_style_label(16, 10, 11, "UF NASC.");
      merge_cells_and_style_label(16, 12, 15, "SEXO *");
      draw_campo_field(17, 2, 5, formData.dataNascimento || "");
      draw_campo_field(17, 6, 9, formData.naturalidade || "");
      draw_campo_field(17, 10, 11, formData.naturalidadeUf || "");

      let sexoText = "(   ) F     (   ) M";
      if (formData.sexo === "F") {
        sexoText = "( X ) F     (   ) M";
      } else if (formData.sexo === "M") {
        sexoText = "(   ) F     ( X ) M";
      }
      draw_campo_field(17, 12, 15, sexoText, 10.5);

      // --- SECTION 5: GRAU DE INSTRUÇÃO ---
      merge_fill(19, 2, 19, 15, "GRAU DE INSTRUÇÃO", true, 8, "FF1A3A5A", "FFE8F1F8", "left");
      const grauOptions = [
        { col1: 2, col2: 4, label: "1º Grau", checked: formData.grauInstrucao === "1º Grau" },
        { col1: 5, col2: 7, label: "2º Grau (cursando)", checked: formData.grauInstrucao === "2º Grau (cursando)" },
        { col1: 8, col2: 10, label: "2º Grau (completo)", checked: formData.grauInstrucao === "2º Grau (completo)" },
        { col1: 11, col2: 13, label: "Superior (cursando)", checked: formData.grauInstrucao === "Superior (cursando)" },
        { col1: 14, col2: 15, label: "Superior (completo)", checked: formData.grauInstrucao === "Superior (completo)" }
      ];
      grauOptions.forEach(({ col1, col2, label, checked }) => {
        ws.mergeCells(20, col1, 20, col2);
        const text = checked ? `( X ) ${label}` : `(   ) ${label}`;
        const c = ws.getCell(20, col1);
        c.value = text;
        c.font = { name: "Arial", size: 9.5, color: { argb: "FF14191E" } };
        c.alignment = { horizontal: "left", vertical: "middle" };
      });

      // --- SECTION 6: ESTADO CIVIL ---
      merge_fill(22, 2, 22, 15, "ESTADO CIVIL", true, 8, "FF1A3A5A", "FFE8F1F8", "left");
      merge_cells_and_style_label(23, 2, 5, "ESTADO CIVIL *");
      merge_cells_and_style_label(23, 6, 9, "DATA DE CASAMENTO");
      merge_cells_and_style_label(23, 10, 15, "NOME DO CÔNJUGE");
      draw_campo_field(24, 2, 5, formData.estadoCivil || "");
      draw_campo_field(24, 6, 9, formData.dataCasamento || "");
      draw_campo_field(24, 10, 15, formData.nomeConjuge || "");

      // --- SECTION 7: RAÇA / COR ---
      merge_fill(26, 2, 26, 15, "RAÇA / COR", true, 8, "FF1A3A5A", "FFE8F1F8", "left");
      const racaOptions = [
        { col1: 2, col2: 4, label: "Branca", checked: formData.racaCor?.toLowerCase() === "branca" },
        { col1: 5, col2: 7, label: "Preta", checked: formData.racaCor?.toLowerCase() === "preta" },
        { col1: 8, col2: 10, label: "Amarela", checked: formData.racaCor?.toLowerCase() === "amarela" },
        { col1: 11, col2: 13, label: "Parda", checked: formData.racaCor?.toLowerCase() === "parda" },
        { col1: 14, col2: 15, label: "Indígena", checked: formData.racaCor?.toLowerCase() === "indígena" || formData.racaCor?.toLowerCase() === "indigena" }
      ];
      racaOptions.forEach(({ col1, col2, label, checked }) => {
        ws.mergeCells(27, col1, 27, col2);
        const text = checked ? `( X ) ${label}` : `(   ) ${label}`;
        const c = ws.getCell(27, col1);
        c.value = text;
        c.font = { name: "Arial", size: 10, color: { argb: "FF14191E" } };
        c.alignment = { horizontal: "left", vertical: "middle" };
      });

      // --- SECTION 8: FUNÇÃO E/OU ATIVIDADE ---
      merge_fill(29, 2, 29, 15, "FUNÇÃO E/OU ATIVIDADE EXERCIDA", true, 8, "FF1A3A5A", "FFE8F1F8", "left");
      merge_cells_and_style_label(30, 2, 15, "FUNÇÃO / ATIVIDADE *");
      draw_campo_field(31, 2, 15, formData.funcaoAtividade || "");

      // --- GOLDEN SPLITTER ---
      for (let c = 2; c <= 15; c++) {
        ws.getCell(32, c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF39C12" } // LARANJA (#f39c12)
        };
      }

      // --- SECTION 9: DOCUMENTOS & DADOS BANCÁRIOS ---
      merge_fill(33, 2, 33, 8, "DOCUMENTOS", true, 8, "FF1A3A5A", "FFE8F1F8", "left");
      merge_fill(33, 9, 33, 15, "DADOS BANCÁRIOS", true, 8, "FF1A3A5A", "FFE8F1F8", "left");

      merge_cells_and_style_label(34, 2, 4, "CPF *");
      merge_cells_and_style_label(34, 5, 8, "PIS / NIT");
      merge_cells_and_style_label(34, 9, 15, "BANCO *");
      draw_campo_field(35, 2, 4, formData.cpf || "");
      draw_campo_field(35, 5, 8, formData.pis || "");
      draw_campo_field(35, 9, 15, formData.banco || "");

      merge_cells_and_style_label(36, 2, 8, "CNPJ (MEI)");
      merge_cells_and_style_label(36, 9, 11, "AGÊNCIA");
      merge_cells_and_style_label(36, 12, 15, "CONTA");
      draw_campo_field(37, 2, 8, formData.cnpj || "");
      draw_campo_field(37, 9, 11, formData.agencia || "");
      draw_campo_field(37, 12, 15, formData.conta || "");

      // left side of PIX is integrated emission box
      ws.mergeCells(38, 2, 38, 8);
      for (let c = 2; c <= 8; c++) {
        ws.getCell(38, c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF7F9FC" }
        };
      }
      merge_cells_and_style_label(38, 9, 15, "CHAVE PIX");

      ws.mergeCells(39, 2, 39, 8);
      for (let c = 2; c <= 8; c++) {
        ws.getCell(39, c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF7F9FC" }
        };
      }
      const sysCell = ws.getCell(39, 2);
      sysCell.value = "";
      sysCell.font = { name: "Arial", bold: true, size: 7.5, color: { argb: "FF5A6A7A" } };
      sysCell.alignment = { horizontal: "center", vertical: "middle" };

      draw_campo_field(39, 9, 15, formData.pix || "");

      // --- SECTION 10: ASSINATURAS ---
      // set signature lines
      for (let c = 2; c <= 8; c++) {
        ws.getCell(42, c).border = {
          bottom: { style: "medium", color: { argb: "FF1A3A5C" } }
        };
      }
      for (let c = 9; c <= 15; c++) {
        ws.getCell(42, c).border = {
          bottom: { style: "medium", color: { argb: "FF1A3A5C" } }
        };
      }
      merge_fill(43, 2, 43, 8, "ASSINATURA DO CONTRATADO", false, 8, "FF5A6A7A", undefined, "center");
      merge_fill(43, 9, 43, 15, "RESPONSÁVEL PELA EMPRESA / DATA", false, 8, "FF5A6A7A", undefined, "center");

      // --- SECTION 11: RODAPÉ ---
      for (let c = 1; c <= 16; c++) {
        ws.getCell(45, c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1A3A5C" }
        };
      }

      // --- SECTION 12: BORDAS EXTERNAS ---
      const borda_ext_side = { style: "medium", color: { argb: "FF1A3A5C" } } as const;
      for (let r = 2; r <= 44; r++) {
        for (let c = 1; c <= 16; c++) {
          const cell = ws.getCell(r, c);
          const currentBorder = cell.border || {};

          const top = r === 2 ? borda_ext_side : currentBorder.top;
          const bottom = r === 44 ? borda_ext_side : currentBorder.bottom;
          const left = c === 1 ? borda_ext_side : currentBorder.left;
          const right = c === 16 ? borda_ext_side : currentBorder.right;

          cell.border = { top, bottom, left, right };
        }
      }

      // --- EXPORT & SAVE FILE ---
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Ficha_Contratacao_${safeName}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      setStatusMessage("Ficha salva em Excel (.xlsx) com sucesso!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      console.error(e);
      alert("Erro ao exportar Excel.");
    }
  };

  // Generate Landscape A4 PDF using exact visual layout specifications
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const startX = 15;
      const startY = 15;
      const width = 267; // A4 landscape is 297mm wide (15mm margins on each side)
      
      // Background colors
      const labelBg = [240, 242, 245];
      const borderLine = [100, 110, 120];

      // Document Title Header with border
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
      doc.setLineWidth(0.4);
      doc.rect(startX, startY, width, 12, "DF");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(20, 25, 35);
      doc.text("FICHA DE CONTRATAÇÃO DE AUTÔNOMO / MEI", startX + width / 2, startY + 8, { align: "center" });

      let currentY = startY + 12;

      // Helper function to draw a cell with light gray label and white input space
      const drawCell = (
        x: number,
        y: number,
        w: number,
        h: number,
        labelText: string,
        valueText: string,
        labelWidth: number
      ) => {
        // Draw overall box border
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
        doc.rect(x, y, w, h, "DF");

        // Fill label background on the left portion
        doc.setFillColor(labelBg[0], labelBg[1], labelBg[2]);
        doc.rect(x, y, labelWidth, h, "F");
        
        // Draw dividing vertical line between label and value
        doc.line(x + labelWidth, y, x + labelWidth, y + h);

        // Draw label text
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(50, 55, 65);
        doc.text(labelText, x + 2, y + h / 2 + 2.5);

        // Draw value text with dynamic text resizing to prevent truncation
        doc.setFont("helvetica", "normal");
        let fontSize = 12.5;
        doc.setFontSize(fontSize);
        doc.setTextColor(15, 20, 30);
        
        let truncatedValue = valueText || "";
        const maxValWidth = w - labelWidth - 4.5;

        // Dynamically shrink font size to fit within cell bounds (down to a readable 5.5pt minimum)
        while (doc.getTextWidth(truncatedValue) > maxValWidth && fontSize > 5.5) {
          fontSize -= 0.5;
          doc.setFontSize(fontSize);
        }

        // Only truncate with ellipsis as an absolute fallback if still too long at 5.5pt
        if (doc.getTextWidth(truncatedValue) > maxValWidth) {
          while (truncatedValue.length > 0 && doc.getTextWidth(truncatedValue + "...") > maxValWidth) {
            truncatedValue = truncatedValue.slice(0, -1);
          }
          truncatedValue += "...";
        }

        const textYOffset = h / 2 + (fontSize / 3);
        doc.text(truncatedValue, x + labelWidth + 3, y + textYOffset);
      };

      // 1. Nome Completo Row (Extra wide in landscape)
      drawCell(startX, currentY, width, 10, "Nome Completo:", formData.nomeCompleto, 26);
      currentY += 10;

      // 2. Endereço Row (Endereço, Número, Complemento)
      const colAddrW = 140;
      const colNumW = 40;
      const colCompW = 87;
      
      drawCell(startX, currentY, colAddrW, 10, "Endereço:", formData.endereco, 18);
      drawCell(startX + colAddrW, currentY, colNumW, 10, "Número:", formData.numero, 16);
      drawCell(startX + colAddrW + colNumW, currentY, colCompW, 10, "Complemento:", formData.complemento, 25);
      currentY += 10;

      // 3. Bairro, CEP, Cidade, UF Row
      const colBairroW = 75;
      const colCepW = 45;
      const colCidadeW = 107;
      const colUfW = 40;

      drawCell(startX, currentY, colBairroW, 10, "Bairro:", formData.bairro, 14);
      drawCell(startX + colBairroW, currentY, colCepW, 10, "CEP:", formData.cep, 11);
      drawCell(startX + colBairroW + colCepW, currentY, colCidadeW, 10, "Cidade:", formData.cidade, 15);
      drawCell(startX + colBairroW + colCepW + colCidadeW, currentY, colUfW, 10, "UF:", formData.uf, 10);
      currentY += 10;

      // 4. Data Nascimento, Naturalidade, UF, Sexo
      const colNascW = 60;
      const colNatW = 80;
      const colNatUfW = 30;
      const colSexoW = 97;

      drawCell(startX, currentY, colNascW, 10, "Data Nascimento:", formData.dataNascimento, 28);
      drawCell(startX + colNascW, currentY, colNatW, 10, "Naturalidade:", formData.naturalidade, 22);
      drawCell(startX + colNascW + colNatW, currentY, colNatUfW, 10, "UF:", formData.naturalidadeUf, 10);
      
      // Draw Sexo cell manually for nice checkboxes
      doc.setFillColor(255, 255, 255);
      doc.rect(startX + colNascW + colNatW + colNatUfW, currentY, colSexoW, 10, "DF");
      doc.setFillColor(labelBg[0], labelBg[1], labelBg[2]);
      doc.rect(startX + colNascW + colNatW + colNatUfW, currentY, 12, 10, "F");
      doc.line(startX + colNascW + colNatW + colNatUfW + 12, currentY, startX + colNascW + colNatW + colNatUfW + 12, currentY + 10);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(50, 55, 65);
      doc.text("Sexo:", startX + colNascW + colNatW + colNatUfW + 2, currentY + 6.5);

      // Checkbox for M and F
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(20, 25, 30);
      
      // Box Male
      const isMale = formData.sexo === "M";
      doc.rect(startX + colNascW + colNatW + colNatUfW + 20, currentY + 3, 3.5, 3.5);
      if (isMale) {
        doc.setFont("helvetica", "bold");
        doc.text("X", startX + colNascW + colNatW + colNatUfW + 20.8, currentY + 5.8);
      }
      doc.setFont("helvetica", "normal");
      doc.text("M", startX + colNascW + colNatW + colNatUfW + 25, currentY + 6.2);

      // Box Female
      const isFemale = formData.sexo === "F";
      doc.rect(startX + colNascW + colNatW + colNatUfW + 42, currentY + 3, 3.5, 3.5);
      if (isFemale) {
        doc.setFont("helvetica", "bold");
        doc.text("X", startX + colNascW + colNatW + colNatUfW + 42.8, currentY + 5.8);
      }
      doc.setFont("helvetica", "normal");
      doc.text("F", startX + colNascW + colNatW + colNatUfW + 47, currentY + 6.2);
      
      currentY += 10;

      // 5. Grau de Instrução Row
      doc.setFillColor(255, 255, 255);
      doc.rect(startX, currentY, width, 14, "DF");
      // Gray header label for Grau de Instrução
      doc.setFillColor(labelBg[0], labelBg[1], labelBg[2]);
      doc.rect(startX, currentY, width, 5, "F");
      doc.line(startX, currentY + 5, startX + width, currentY + 5);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(50, 55, 65);
      doc.text("Grau de Instrução", startX + 4, currentY + 3.5);

      // Parenthesis options
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(20, 25, 30);
      
      const degrees = [
        { label: "1º Grau", val: "1º Grau" },
        { label: "2º Grau (cursando)", val: "2º Grau (cursando)" },
        { label: "2º Grau (completo)", val: "2º Grau (completo)" },
        { label: "Superior (cursando)", val: "Superior (cursando)" },
        { label: "Superior (completo)", val: "Superior (completo)" }
      ];

      let degX = startX + 5;
      degrees.forEach((deg) => {
        const isChecked = formData.grauInstrucao === deg.val;
        doc.text(isChecked ? "( X )" : "(   )", degX, currentY + 10);
        doc.text(deg.label, degX + 7, currentY + 10);
        degX += 52;
      });
      currentY += 14;

      // 6. Estado Civil, Data Casamento, Nome Cônjuge
      const colEstW = 77;
      const colCasW = 60;
      const colConjW = 130;

      drawCell(startX, currentY, colEstW, 10, "Estado Civil:", formData.estadoCivil, 22);
      drawCell(startX + colEstW, currentY, colCasW, 10, "Data Casamento:", formData.dataCasamento, 25);
      drawCell(startX + colEstW + colCasW, currentY, colConjW, 10, "Nome Cônjuge:", formData.nomeConjuge, 25);
      currentY += 10;

      // 7. Raça/Cor Row
      doc.setFillColor(255, 255, 255);
      doc.rect(startX, currentY, width, 14, "DF");
      // Gray header label for Raça/Cor
      doc.setFillColor(labelBg[0], labelBg[1], labelBg[2]);
      doc.rect(startX, currentY, width, 5, "F");
      doc.line(startX, currentY + 5, startX + width, currentY + 5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(50, 55, 65);
      doc.text("Raça / Cor", startX + 4, currentY + 3.5);

      const races = ["Branca", "Preta", "Amarela", "Parda"];
      let raceX = startX + 5;
      races.forEach((race) => {
        const isChecked = formData.racaCor === race;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(isChecked ? "( X )" : "(   )", raceX, currentY + 10);
        doc.text(race, raceX + 8, currentY + 10);
        raceX += 65;
      });
      currentY += 14;

      // 8. Função e/ou Atividade exercida
      drawCell(startX, currentY, width, 10, "Função e/ou Atividade exercida:", formData.funcaoAtividade, 45);
      currentY += 10;

      // Spacer line
      doc.setDrawColor(220, 225, 230);
      doc.line(startX, currentY, startX + width, currentY);

      // 9. Documentos & Dados Bancários Headings (Side by side with aligned partition)
      const colHalfW = 133.5;
      doc.setFillColor(255, 255, 255);
      doc.rect(startX, currentY, width, 7, "DF");

      doc.setFillColor(labelBg[0], labelBg[1], labelBg[2]);
      doc.rect(startX, currentY, colHalfW, 7, "F");
      doc.rect(startX + colHalfW, currentY, colHalfW, 7, "F");
      doc.line(startX + colHalfW, currentY, startX + colHalfW, currentY + 7);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 20, 30);
      doc.text("Documentos", startX + 4, currentY + 4.8);
      doc.text("Dados Bancários", startX + colHalfW + 4, currentY + 4.8);
      currentY += 7;

      // 10. CPF, PIS, CNPJ, Banco, Agência, Conta, PIX Side by Side
      const colSubHalfW = 66.75;

      // Row 1: CPF | PIS | Banco
      drawCell(startX, currentY, colSubHalfW, 10, "CPF:", formData.cpf, 12);
      drawCell(startX + colSubHalfW, currentY, colSubHalfW, 10, "PIS:", formData.pis, 12);
      drawCell(startX + colHalfW, currentY, colHalfW, 10, "Banco:", formData.banco, 16);
      currentY += 10;

      // Row 2: CNPJ (MEI) | Agência | Conta
      drawCell(startX, currentY, colHalfW, 10, "CNPJ (MEI):", formData.cnpj, 24);
      drawCell(startX + colHalfW, currentY, colSubHalfW, 10, "Agência:", formData.agencia, 18);
      drawCell(startX + colHalfW + colSubHalfW, currentY, colSubHalfW, 10, "Conta:", formData.conta, 15);
      currentY += 10;

      // Row 3: Info integrated box | PIX
      doc.setFillColor(245, 247, 250);
      doc.rect(startX, currentY, colHalfW, 10, "F");
      doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
      doc.rect(startX, currentY, colHalfW, 10, "D");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 110, 120);

      drawCell(startX + colHalfW, currentY, colHalfW, 10, "PIX:", formData.pix, 16);
      currentY += 10;

      // Bottom footer signature lines
      currentY += 16;
      doc.setDrawColor(180, 185, 190);
      doc.setLineWidth(0.3);
      
      doc.line(startX + 20, currentY, startX + 100, currentY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(80, 85, 95);
      doc.text("Assinatura do Profissional", startX + 34, currentY + 4.5);

      doc.line(startX + 147, currentY, startX + 247, currentY);
      doc.text("Visto Facilities / Compras", startX + 172, currentY + 4.5);

      // System Stamp Footer
      doc.setFontSize(7.5);
      doc.setTextColor(170, 175, 180);
      doc.text(`Ficha de Contratação BP-COMPRAS — Emitida eletronicamente em ${new Date().toLocaleDateString("pt-BR")}`, startX, 198);

      // Save/download PDF
      const safeName = formData.nomeCompleto.trim().replace(/\s+/g, "_") || "Autonomo";
      doc.save(`Ficha_Contratacao_${safeName}.pdf`);
      
      setStatusMessage("PDF exportado com sucesso!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      console.error(e);
      alert("Erro ao exportar PDF.");
    }
  };

  const handleExportTXT = () => {
    try {
      const textContent = `FICHA DE CONTRATAÇÃO DE AUTÔNOMO / MEI
--------------------------------------------------------------------------------
IDENTIFICAÇÃO
Nome Completo: ${formData.nomeCompleto || ""}

ENDEREÇO RESIDENCIAL
Endereço (Rua / Av.): ${formData.endereco || ""}
Número: ${formData.numero || ""}
Complemento: ${formData.complemento || ""}
Bairro: ${formData.bairro || ""}
CEP: ${formData.cep || ""}
Cidade: ${formData.cidade || ""}
UF: ${formData.uf || ""}

NASCIMENTO & SEXO
Data de Nascimento: ${formData.dataNascimento || ""}
Naturalidade: ${formData.naturalidade || ""}
UF Nascimento: ${formData.naturalidadeUf || ""}
Sexo: ${formData.sexo || ""}

GRAU DE INSTRUÇÃO
Grau de Instrução: ${formData.grauInstrucao || ""}

ESTADO CIVIL
Estado Civil: ${formData.estadoCivil || ""}
Data de Casamento: ${formData.dataCasamento || ""}
Nome do Cônjuge: ${formData.nomeConjuge || ""}

RAÇA / COR
Raça / Cor: ${formData.racaCor || ""}

FUNÇÃO E/OU ATIVIDADE EXERCIDA
Função / Atividade: ${formData.funcaoAtividade || ""}

DOCUMENTOS
CPF: ${formData.cpf || ""}
PIS / NIT: ${formData.pis || ""}
CNPJ: ${formData.cnpj || ""}

DADOS BANCÁRIOS
Banco: ${formData.banco || ""}
Agência: ${formData.agencia || ""}
Conta Corrente: ${formData.conta || ""}
PIX: ${formData.pix || ""}
--------------------------------------------------------------------------------
Ficha de Contratação BP-COMPRAS — Emitida eletronicamente em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}
`;

      const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = formData.nomeCompleto.trim().replace(/\s+/g, "_") || "Autonomo";
      link.href = url;
      link.download = `Ficha_Contratacao_${safeName}.txt`;
      link.click();
      window.URL.revokeObjectURL(url);

      setStatusMessage("Ficha salva em TXT com sucesso!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      console.error(e);
      alert("Erro ao exportar TXT.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="relative bg-white dark:bg-[#1E222B] w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[92vh]">
        
        {/* Top Header Bar with Emoji Close Button */}
        <div className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-[#15171d] border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span className="text-xs font-black tracking-wider uppercase text-[#0B4F6C] dark:text-[#5fa8c9]">
              Ficha de Contratação de Autônomo & MEI
            </span>
          </div>
          
          <EmojiButton
            iconKey="fechar"
            onClick={onClose}
            size="sm"
            variant="danger"
          />
        </div>

        {/* Inner Content Area */}
        <div className="flex flex-col md:flex-row overflow-hidden flex-1">
          {/* Left Side: Paste and AI trigger Panel */}
          <div className="w-full md:w-2/5 p-5 bg-slate-50 dark:bg-[#171a21] border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col gap-4 overflow-y-auto">
          
          {/* Section 1: Fornecedores Cadastrados */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-white dark:bg-[#1a1d24] shadow-2xs">
            <h3 className="text-xs font-black tracking-wider uppercase text-[#0B4F6C] dark:text-[#5fa8c9] flex items-center gap-1.5 mb-2.5">
              <Clipboard className="h-4 w-4 text-[#08D9D6]" />
              Fornecedores Cadastrados
            </h3>

            {/* Search Input */}
            <div className="relative mb-2.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar fornecedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-[11px] bg-slate-50 dark:bg-[#252a34] border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#08D9D6] text-slate-700 dark:text-slate-200 font-semibold"
              />
            </div>

            {/* Table of Saved Suppliers */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-[#13151b] max-h-[140px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-[#171a21] text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                    <th className="px-2 py-1">Fornecedor / CPF</th>
                    <th className="px-2 py-1 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                  {filteredSuppliers.map((sup) => (
                    <tr 
                      key={sup.nomeCompleto} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                        formData.nomeCompleto.trim().toLowerCase() === sup.nomeCompleto.trim().toLowerCase()
                          ? "bg-slate-100/70 dark:bg-slate-800"
                          : ""
                      }`}
                      onClick={() => handleSelectSupplier(sup)}
                    >
                      <td className="px-2 py-1.5 font-semibold text-slate-700 dark:text-slate-300">
                        <div className="truncate font-black text-[10px] text-[#0b4f6c] dark:text-[#5fa8c9] max-w-[170px]" title={sup.nomeCompleto}>
                          {sup.nomeCompleto}
                        </div>
                        <div className="text-[8.5px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                          {sup.cpf || "Sem CPF"}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <EmojiButton
                            iconKey="finalizarOcorrencia"
                            onClick={() => handleSelectSupplier(sup)}
                            size="sm"
                            variant="success"
                          />
                          <EmojiButton
                            iconKey="excluir"
                            onClick={(e) => handleDeleteSupplier(e, sup.nomeCompleto)}
                            size="sm"
                            variant="danger"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSuppliers.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-2 py-4 text-center text-slate-400 dark:text-slate-500 text-[10px]">
                        Nenhum fornecedor encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Save Current as Supplier Button */}
            <div className="mt-2.5">
              <EmojiButton
                iconKey="salvar"
                onClick={handleSaveSupplier}
                size="md"
                variant="success"
                className="w-full"
              />
            </div>
          </div>

          {/* Section 2: Preenchimento Inteligente */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-white dark:bg-[#1a1d24] shadow-2xs flex flex-col min-h-[220px]">
            <h3 className="text-xs font-black tracking-wider uppercase text-[#0B4F6C] dark:text-[#5fa8c9] flex items-center gap-1.5 mb-2">
              <Sparkles className="h-4 w-4 text-[#08D9D6]" />
              Preenchimento Inteligente
            </h3>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
              Cole e-mail, WhatsApp ou currículo do prestador e clique para extrair e preencher todos os campos da ficha de contratação.
            </p>

            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Cole aqui as informações do profissional..."
              className="w-full min-h-[90px] p-2 text-[11px] bg-slate-50 dark:bg-[#252a34] border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#08D9D6] resize-none text-slate-700 dark:text-slate-200 font-medium"
            />

            <div className="mt-3 flex gap-2">
              {isExtracting ? (
                <div className="flex-1 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#08D9D6]" />
                </div>
              ) : (
                <EmojiButton
                  iconKey="normativa"
                  onClick={handleAIExtract}
                  size="md"
                  variant="primary"
                  className="flex-1"
                />
              )}
              <EmojiButton
                iconKey="limpar"
                onClick={handleClear}
                size="md"
                variant="danger"
              />
            </div>
          </div>

          {statusMessage && (
            <div className="p-2 bg-emerald-50 dark:bg-[#0c3c26] border border-emerald-100 dark:border-emerald-900/60 rounded-lg text-[9.5px] font-bold text-emerald-800 dark:text-emerald-400 text-center animate-pulse">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Right Side: Spreadsheet-like Form Preview */}
        <div className="flex-1 p-5 flex flex-col overflow-y-auto max-h-[70vh] md:max-h-none">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#FF2E63]" />
              Ficha do Autônomo / MEI (Visualização em Tempo Real)
            </h2>
            
            <div className="flex items-center gap-3 flex-wrap">
              <EmojiButton
                iconKey="imprimir"
                onClick={handleExportPDF}
                size="md"
                variant="primary"
              />

              <EmojiButton
                iconKey="gerarRelatorio"
                onClick={handleExportExcel}
                size="md"
                variant="success"
              />

              <EmojiButton
                iconKey="docs"
                onClick={handleExportTXT}
                size="md"
                variant="neutral"
              />
            </div>
          </div>

          {/* Interactive digital spreadsheet styled closely to physical form layout */}
          <div className="flex-1 space-y-4">
            <div 
              style={{ borderColor: colors.navy, borderWidth: "2px", backgroundColor: colors.bgForm }}
              className="rounded-lg overflow-hidden text-slate-800 dark:text-slate-200 shadow-md transition-all duration-300"
            >
              
              {/* Cabeçalho */}
              <div 
                style={{ backgroundColor: colors.navy }}
                className="text-white text-center font-black text-sm md:text-base py-3.5 px-3 tracking-widest uppercase"
              >
                FICHA DE CONTRATAÇÃO DE AUTÔNOMO / MEI
              </div>
              <div 
                style={{ backgroundColor: colors.orange, height: "4px" }} 
              />

              {/* Seção: Identificação */}
              <div 
                style={{ backgroundColor: colors.lightBlue, color: colors.textNavy, borderBottomColor: colors.navy, borderBottomWidth: "2px" }}
                className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wider"
              >
                IDENTIFICAÇÃO
              </div>

              {/* Nome Completo Box */}
              <div 
                style={{ borderBottomColor: colors.rowBorder }}
                className="flex border-b min-h-[40px]"
              >
                <div 
                  style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                  className="w-28 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                >
                  Nome Completo:
                </div>
                <input
                  type="text"
                  value={formData.nomeCompleto}
                  onChange={(e) => handleInputChange("nomeCompleto", e.target.value)}
                  className={getFieldClass(formData.nomeCompleto)}
                  placeholder="NOME COMPLETO DO PRESTADOR"
                />
              </div>

              {/* Seção: Endereço */}
              <div 
                style={{ backgroundColor: colors.lightBlue, color: colors.textNavy, borderBottomColor: colors.navy, borderBottomWidth: "2px" }}
                className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wider"
              >
                ENDEREÇO RESIDENCIAL
              </div>

              {/* Endereço, Número, Complemento */}
              <div 
                style={{ borderBottomColor: colors.rowBorder }}
                className="grid grid-cols-1 md:grid-cols-12 border-b min-h-[40px]"
              >
                <div 
                  className="md:col-span-6 flex border-b md:border-b-0 border-slate-200 dark:border-slate-800"
                >
                  <div 
                    style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                    className="w-20 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                  >
                    Endereço:
                  </div>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => handleInputChange("endereco", e.target.value)}
                    className={getFieldClass(formData.endereco)}
                    placeholder="RUA, AVENIDA, LOGRADOURO..."
                  />
                </div>
                <div 
                  className="md:col-span-3 flex border-b md:border-b-0 border-slate-200 dark:border-slate-800 md:border-r"
                >
                  <div 
                    style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                    className="w-16 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                  >
                    Número:
                  </div>
                  <input
                    type="text"
                    value={formData.numero}
                    onChange={(e) => handleInputChange("numero", e.target.value)}
                    className={getFieldClass(formData.numero)}
                    placeholder="Nº"
                  />
                </div>
                <div className="md:col-span-3 flex">
                  <div 
                    style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                    className="w-16 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                  >
                    Compl.:
                  </div>
                  <input
                    type="text"
                    value={formData.complemento}
                    onChange={(e) => handleInputChange("complemento", e.target.value)}
                    className={getFieldClass(formData.complemento)}
                    placeholder="APTO, SALA, BLOCO..."
                  />
                </div>
              </div>

              {/* Bairro, CEP, Cidade, UF */}
              <div 
                style={{ borderBottomColor: colors.rowBorder }}
                className="grid grid-cols-1 md:grid-cols-12 border-b min-h-[40px]"
              >
                <div 
                  className="md:col-span-4 flex border-b md:border-b-0 border-slate-200 dark:border-slate-800 md:border-r"
                >
                  <div 
                    style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                    className="w-16 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                  >
                    Bairro:
                  </div>
                  <input
                    type="text"
                    value={formData.bairro}
                    onChange={(e) => handleInputChange("bairro", e.target.value)}
                    className={getFieldClass(formData.bairro)}
                    placeholder="BAIRRO"
                  />
                </div>
                <div 
                  className="md:col-span-3 flex border-b md:border-b-0 border-slate-200 dark:border-slate-800 md:border-r relative"
                >
                  <div 
                    style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                    className="w-12 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                  >
                    CEP:
                  </div>
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => handleInputChange("cep", e.target.value)}
                    className={getFieldClass(formData.cep)}
                    placeholder="00000-000"
                  />
                  {isSearchingCep && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <RefreshCw className="h-3 w-3 text-[#08D9D6] animate-spin" />
                    </div>
                  )}
                </div>
                <div 
                  className="md:col-span-3 flex border-b md:border-b-0 border-slate-200 dark:border-slate-800 md:border-r"
                >
                  <div 
                    style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                    className="w-14 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                  >
                    Cidade:
                  </div>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => handleInputChange("cidade", e.target.value)}
                    className={getFieldClass(formData.cidade)}
                    placeholder="CIDADE"
                  />
                </div>
                <div className="md:col-span-2 flex">
                  <div 
                    style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                    className="w-10 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                  >
                    UF:
                  </div>
                  <input
                    type="text"
                    value={formData.uf}
                    onChange={(e) => handleInputChange("uf", e.target.value.toUpperCase())}
                    maxLength={2}
                    className={getFieldClass(formData.uf)}
                    placeholder="UF"
                  />
                </div>
              </div>

              {/* Seção: Nascimento e Sexo */}
              <div 
                style={{ backgroundColor: colors.lightBlue, color: colors.textNavy, borderBottomColor: colors.navy, borderBottomWidth: "2px" }}
                className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wider"
              >
                NASCIMENTO & SEXO
              </div>

              {/* Data Nascimento, Naturalidade, UF, Sexo */}
              <div 
                style={{ borderBottomColor: colors.rowBorder }}
                className="grid grid-cols-1 md:grid-cols-12 border-b min-h-[40px]"
              >
                <div 
                  className="md:col-span-4 flex border-b md:border-b-0 border-slate-200 dark:border-slate-800 md:border-r"
                >
                  <div 
                    style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                    className="w-20 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                  >
                    Nascimento:
                  </div>
                  <input
                    type="text"
                    value={formData.dataNascimento}
                    onChange={(e) => handleInputChange("dataNascimento", e.target.value)}
                    className={getFieldClass(formData.dataNascimento)}
                    placeholder="DD/MM/AAAA"
                  />
                </div>
                <div 
                  className="md:col-span-3 flex border-b md:border-b-0 border-slate-200 dark:border-slate-800 md:border-r"
                >
                  <div 
                    style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                    className="w-20 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                  >
                    Naturalidade:
                  </div>
                  <input
                    type="text"
                    value={formData.naturalidade}
                    onChange={(e) => handleInputChange("naturalidade", e.target.value)}
                    className={getFieldClass(formData.naturalidade)}
                    placeholder="CIDADE NATAL"
                  />
                </div>
                <div 
                  className="md:col-span-2 flex border-b md:border-b-0 border-slate-200 dark:border-slate-800 md:border-r"
                >
                  <div 
                    style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                    className="w-10 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                  >
                    UF:
                  </div>
                  <input
                    type="text"
                    value={formData.naturalidadeUf}
                    onChange={(e) => handleInputChange("naturalidadeUf", e.target.value.toUpperCase())}
                    maxLength={2}
                    className={getFieldClass(formData.naturalidadeUf)}
                    placeholder="UF"
                  />
                </div>
                <div 
                  style={{ backgroundColor: !formData.sexo ? colors.empty : "transparent" }}
                  className="md:col-span-3 flex items-center justify-between px-3 py-2 transition-colors duration-250 h-full min-h-[40px]"
                >
                  <div 
                    style={{ color: colors.textMuted }}
                    className="font-bold text-[9px] uppercase mr-2"
                  >
                    Sexo:
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="sexo"
                        checked={formData.sexo === "M"}
                        onChange={() => handleInputChange("sexo", "M")}
                        className="text-[#f39c12] focus:ring-[#f39c12] cursor-pointer h-3.5 w-3.5"
                      />
                      <span style={{ color: colors.textMain }}>M</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="sexo"
                        checked={formData.sexo === "F"}
                        onChange={() => handleInputChange("sexo", "F")}
                        className="text-[#f39c12] focus:ring-[#f39c12] cursor-pointer h-3.5 w-3.5"
                      />
                      <span style={{ color: colors.textMain }}>F</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Seção: Grau de Instrução */}
              <div 
                style={{ backgroundColor: colors.lightBlue, color: colors.textNavy, borderBottomColor: colors.navy, borderBottomWidth: "2px" }}
                className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wider"
              >
                GRAU DE INSTRUÇÃO
              </div>

              {/* Grau de Instrução Selection Row */}
              <div 
                style={{ borderBottomColor: colors.rowBorder, backgroundColor: !formData.grauInstrucao ? colors.empty : "transparent" }}
                className="border-b transition-colors duration-250 p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs font-semibold"
              >
                {[
                  "1º Grau",
                  "2º Grau (cursando)",
                  "2º Grau (completo)",
                  "Superior (cursando)",
                  "Superior (completo)"
                ].map((deg) => (
                  <label key={deg} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="grauInstrucao"
                      checked={formData.grauInstrucao === deg}
                      onChange={() => handleInputChange("grauInstrucao", deg as any)}
                      className="text-[#f39c12] focus:ring-[#f39c12] cursor-pointer h-3.5 w-3.5"
                    />
                    <span style={{ color: colors.textMain }} className="text-[10px]">{deg}</span>
                  </label>
                ))}
              </div>

              {/* Seção: Estado Civil */}
              <div 
                style={{ backgroundColor: colors.lightBlue, color: colors.textNavy, borderBottomColor: colors.navy, borderBottomWidth: "2px" }}
                className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wider"
              >
                ESTADO CIVIL
              </div>

              {/* Estado Civil, Data Casamento, Nome Cônjuge */}
              <div 
                style={{ borderBottomColor: colors.rowBorder }}
                className="grid grid-cols-1 md:grid-cols-12 border-b min-h-[40px]"
              >
                <div 
                  className="md:col-span-3 flex border-b md:border-b-0 border-slate-200 dark:border-slate-800 md:border-r"
                >
                  <div 
                    style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                    className="w-16 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                  >
                    Est. Civil:
                  </div>
                  <input
                    type="text"
                    value={formData.estadoCivil}
                    onChange={(e) => handleInputChange("estadoCivil", e.target.value)}
                    className={getFieldClass(formData.estadoCivil)}
                    placeholder="SOLTEIRO, CASADO..."
                  />
                </div>
                <div 
                  className="md:col-span-3 flex border-b md:border-b-0 border-slate-200 dark:border-slate-800 md:border-r"
                >
                  <div 
                    style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                    className="w-20 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                  >
                    Casamento:
                  </div>
                  <input
                    type="text"
                    value={formData.dataCasamento}
                    onChange={(e) => handleInputChange("dataCasamento", e.target.value)}
                    className={getFieldClass(formData.dataCasamento)}
                    placeholder="DD/MM/AAAA"
                  />
                </div>
                <div className="md:col-span-6 flex">
                  <div 
                    style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                    className="w-20 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                  >
                    Cônjuge:
                  </div>
                  <input
                    type="text"
                    value={formData.nomeConjuge}
                    onChange={(e) => handleInputChange("nomeConjuge", e.target.value)}
                    className={getFieldClass(formData.nomeConjuge)}
                    placeholder="NOME DO CÔNJUGE"
                  />
                </div>
              </div>

              {/* Seção: Raça/Cor */}
              <div 
                style={{ backgroundColor: colors.lightBlue, color: colors.textNavy, borderBottomColor: colors.navy, borderBottomWidth: "2px" }}
                className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wider"
              >
                RAÇA / COR
              </div>

              {/* Raça/Cor selection row */}
              <div 
                style={{ borderBottomColor: colors.rowBorder, backgroundColor: !formData.racaCor ? colors.empty : "transparent" }}
                className="border-b transition-colors duration-250 p-3 flex flex-wrap gap-6 text-xs font-semibold"
              >
                {["Branca", "Preta", "Amarela", "Parda", "Indígena"].map((race) => (
                  <label key={race} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="racaCor"
                      checked={formData.racaCor === race}
                      onChange={() => handleInputChange("racaCor", race as any)}
                      className="text-[#f39c12] focus:ring-[#f39c12] cursor-pointer h-3.5 w-3.5"
                    />
                    <span style={{ color: colors.textMain }}>{race}</span>
                  </label>
                ))}
              </div>

              {/* Seção: Função / Atividade */}
              <div 
                style={{ backgroundColor: colors.lightBlue, color: colors.textNavy, borderBottomColor: colors.navy, borderBottomWidth: "2px" }}
                className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wider"
              >
                FUNÇÃO E/OU ATIVIDADE EXERCIDA
              </div>

              {/* Função / Atividade */}
              <div 
                style={{ borderBottomColor: colors.rowBorder }}
                className="flex border-b min-h-[40px]"
              >
                <div 
                  style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                  className="w-32 bg-slate-100/50 dark:bg-[#13151b] px-3 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0"
                >
                  Função / Atividade:
                </div>
                <input
                  type="text"
                  value={formData.funcaoAtividade}
                  onChange={(e) => handleInputChange("funcaoAtividade", e.target.value)}
                  className={getFieldClass(formData.funcaoAtividade)}
                  placeholder="FUNÇÃO OU ATIVIDADE EXERCIDA PELO PRESTADOR"
                />
              </div>

              {/* Double Header: Documentos (left) and Dados Bancários (right) */}
              <div 
                style={{ borderBottomColor: colors.navy, borderBottomWidth: "2px" }}
                className="grid grid-cols-2 bg-slate-100/80 dark:bg-[#13151b] min-h-[28px]"
              >
                <div 
                  style={{ borderRightColor: colors.rowBorder, color: colors.textNavy }}
                  className="px-3 py-1.5 font-bold text-[10.5px] uppercase border-r flex items-center tracking-wider"
                >
                  Documentos
                </div>
                <div 
                  style={{ color: colors.textNavy }}
                  className="px-3 py-1.5 font-bold text-[10.5px] uppercase flex items-center tracking-wider"
                >
                  Dados Bancários
                </div>
              </div>

              {/* Documentos & Dados Bancários fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 min-h-[120px] divide-y md:divide-y-0 md:divide-x divide-slate-300 dark:divide-slate-700">
                {/* Left Side: Documentos */}
                <div className="flex flex-col divide-y divide-slate-300 dark:divide-slate-700">
                  {/* CPF & PIS Side-by-side */}
                  <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-slate-700 h-[40px]">
                    <div className="flex items-center h-full">
                      <div 
                        style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                        className="w-12 bg-slate-100/50 dark:bg-[#13151b] px-2.5 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0 h-full"
                      >
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
                    <div className="flex items-center h-full">
                      <div 
                        style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                        className="w-12 bg-slate-100/50 dark:bg-[#13151b] px-2.5 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0 h-full"
                      >
                        PIS:
                      </div>
                      <input
                        type="text"
                        value={formData.pis}
                        onChange={(e) => handleInputChange("pis", e.target.value)}
                        className={getFieldClass(formData.pis)}
                        placeholder="PIS / NIT"
                      />
                    </div>
                  </div>
                  {/* CNPJ Row */}
                  <div className="flex items-center h-[40px]">
                    <div 
                      style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                      className="w-24 bg-slate-100/50 dark:bg-[#13151b] px-2.5 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0 h-full"
                    >
                      CNPJ (MEI):
                    </div>
                    <input
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => handleInputChange("cnpj", e.target.value)}
                      className={getFieldClass(formData.cnpj)}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  {/* Remaining empty space to align heights */}
                  <div className="flex-1 bg-slate-50/20 dark:bg-transparent min-h-[40px] hidden md:block"></div>
                </div>

                {/* Right Side: Dados Bancários */}
                <div className="flex flex-col divide-y divide-slate-300 dark:divide-slate-700">
                  {/* Banco Row */}
                  <div className="flex items-center h-[40px]">
                    <div 
                      style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                      className="w-16 bg-slate-100/50 dark:bg-[#13151b] px-2.5 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0 h-full"
                    >
                      Banco:
                    </div>
                    <input
                      type="text"
                      value={formData.banco}
                      onChange={(e) => handleInputChange("banco", e.target.value)}
                      className={getFieldClass(formData.banco)}
                      placeholder="BANCO"
                    />
                  </div>
                  {/* Agência & Conta Side-by-side */}
                  <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-slate-700 h-[40px]">
                    <div className="flex items-center h-full">
                      <div 
                        style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                        className="w-16 bg-slate-100/50 dark:bg-[#13151b] px-2.5 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0 h-full"
                      >
                        Agência:
                      </div>
                      <input
                        type="text"
                        value={formData.agencia}
                        onChange={(e) => handleInputChange("agencia", e.target.value)}
                        className={getFieldClass(formData.agencia)}
                        placeholder="AGÊNCIA"
                      />
                    </div>
                    <div className="flex items-center h-full">
                      <div 
                        style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                        className="w-14 bg-slate-100/50 dark:bg-[#13151b] px-2.5 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0 h-full"
                      >
                        Conta:
                      </div>
                      <input
                        type="text"
                        value={formData.conta}
                        onChange={(e) => handleInputChange("conta", e.target.value)}
                        className={getFieldClass(formData.conta)}
                        placeholder="CONTA"
                      />
                    </div>
                  </div>
                  {/* Chave PIX Row */}
                  <div className="flex items-center h-[40px]">
                    <div 
                      style={{ borderRightColor: colors.rowBorder, color: colors.textMuted }}
                      className="w-16 bg-slate-100/50 dark:bg-[#13151b] px-2.5 py-2 flex items-center font-bold text-[9px] uppercase border-r shrink-0 h-full"
                    >
                      Pix:
                    </div>
                    <input
                      type="text"
                      value={formData.pix}
                      onChange={(e) => handleInputChange("pix", e.target.value)}
                      className={getFieldClass(formData.pix)}
                      placeholder="CHAVE PIX"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-150 dark:border-slate-800 flex justify-end gap-3 text-slate-400 text-[10px] font-black uppercase tracking-wider">
            <span>Ficha de Contratação BP-COMPRAS — Totalmente editável e auditável</span>
          </div>
        </div>

        </div>

      </div>
    </div>
  );
}
