import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import ExcelJS from "exceljs";
import { 
  Sparkles, X, Printer, RefreshCw, Trash2, Edit2, Plus, 
  Search, Save, FileText, FileSpreadsheet, LayoutDashboard, UserCheck, Check, Calendar, Award, GraduationCap, Building2, User, UserX
} from "lucide-react";
import { AprendizContractData } from "../types";
import { EmojiButton } from "./EmojiButton";

interface AprendizContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  visualTheme?: "light" | "comfort" | "ultradark";
}

const emptyForm: AprendizContractData = {
  nomeCompleto: "",
  dataNascimento: "",
  idade: "",
  cpf: "",
  rg: "",
  nomeMae: "",
  nomePai: "",
  telefone: "",
  email: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cep: "",
  cidade: "",
  uf: "",
  nomeResponsavel: "",
  cpfResponsavel: "",
  rgResponsavel: "",
  parentescoResponsavel: "",
  telefoneResponsavel: "",
  instituicaoEnsino: "",
  cursoGrau: "",
  turnoEscolar: "",
  serieAno: "",
  dataAdmissao: "",
  dataTermino: "",
  entidadeQualificadora: "",
  cursoAprendizagem: "",
  tutorSupervisor: "",
  setorAlocacao: "",
  horarioTrabalho: "",
  banco: "",
  agencia: "",
  conta: "",
  pix: "",
  diaTeorica: "",
  tipoAprendiz: "",
  status: "Ativo",
};

// Initial 5 apprentices exactly from the requested HTML
const defaultApprentices: AprendizContractData[] = [
  {
    nomeCompleto: "Calebe Torres da Silva",
    dataNascimento: "10/05/2006",
    idade: "19",
    cpf: "349.502.193-40",
    rg: "20.493.102-5",
    nomeMae: "Márcia Torres da Silva",
    nomePai: "Francisco da Silva",
    telefone: "(85) 98765-4321",
    email: "calebe.torres@gmail.com",
    endereco: "Rua Major Facundo",
    numero: "1200",
    complemento: "Apto 101",
    bairro: "Centro",
    cep: "60025-100",
    cidade: "Fortaleza",
    uf: "CE",
    nomeResponsavel: "Márcia Torres da Silva",
    cpfResponsavel: "103.492.301-52",
    rgResponsavel: "18.394.012-3",
    parentescoResponsavel: "Mãe",
    telefoneResponsavel: "(85) 98765-4321",
    instituicaoEnsino: "EEMTI Liceu do Ceará",
    cursoGrau: "Ensino Médio",
    turnoEscolar: "Noite",
    serieAno: "3º Ano",
    dataAdmissao: "02/12/2024",
    dataTermino: "06/10/2026",
    entidadeQualificadora: "CIEE Ceará",
    cursoAprendizagem: "JAC Arco Administrativo",
    tutorSupervisor: "Marcos Pereira de Lima",
    setorAlocacao: "Arco Administrativo",
    horarioTrabalho: "13h – 17h",
    banco: "Bradesco",
    agencia: "0123",
    conta: "45678-9",
    pix: "349.502.193-40",
    diaTeorica: "Segunda-feira",
    tipoAprendiz: "Administrativo"
  },
  {
    nomeCompleto: "Danlei Kauan Meneses dos Santos",
    dataNascimento: "18/07/2007",
    idade: "18",
    cpf: "204.859.321-04",
    rg: "39.482.019-3",
    nomeMae: "Luciana Meneses dos Santos",
    nomePai: "Valdemar dos Santos",
    telefone: "(85) 99876-5432",
    email: "danlei.kauan@gmail.com",
    endereco: "Av. Bezerra de Menezes",
    numero: "340",
    complemento: "Bloco A",
    bairro: "Farias Brito",
    cep: "60035-110",
    cidade: "Fortaleza",
    uf: "CE",
    nomeResponsavel: "Luciana Meneses dos Santos",
    cpfResponsavel: "205.932.104-51",
    rgResponsavel: "19.401.293-8",
    parentescoResponsavel: "Mãe",
    telefoneResponsavel: "(85) 99876-5432",
    instituicaoEnsino: "EEMTI Justiniano de Serpa",
    cursoGrau: "Ensino Médio",
    turnoEscolar: "Noite",
    serieAno: "3º Ano",
    dataAdmissao: "18/11/2024",
    dataTermino: "22/09/2026",
    entidadeQualificadora: "CIEE Ceará",
    cursoAprendizagem: "JAC Arco Administrativo",
    tutorSupervisor: "Marcos Pereira de Lima",
    setorAlocacao: "Arco Administrativo",
    horarioTrabalho: "08h – 12h",
    banco: "Itaú",
    agencia: "4567",
    conta: "12345-6",
    pix: "204.859.321-04",
    diaTeorica: "Quinta-feira",
    tipoAprendiz: "Administrativo"
  },
  {
    nomeCompleto: "Lian Gabriel Moreira de Souza",
    dataNascimento: "12/03/2008",
    idade: "18",
    cpf: "482.930.192-54",
    rg: "30.293.401-2",
    nomeMae: "Marta Moreira de Souza",
    nomePai: "Geraldo de Souza",
    telefone: "(85) 98123-4567",
    email: "lian.gabriel@gmail.com",
    endereco: "Rua Barão do Rio Branco",
    numero: "890",
    complemento: "Casa",
    bairro: "Centro",
    cep: "60025-000",
    cidade: "Fortaleza",
    uf: "CE",
    nomeResponsavel: "Marta Moreira de Souza",
    cpfResponsavel: "405.293.012-34",
    rgResponsavel: "28.394.012-5",
    parentescoResponsavel: "Mãe",
    telefoneResponsavel: "(85) 98123-4567",
    instituicaoEnsino: "EEMTI Pres. Humberto Castelo Branco",
    cursoGrau: "Ensino Médio",
    turnoEscolar: "Noite",
    serieAno: "2º Ano",
    dataAdmissao: "03/11/2025",
    dataTermino: "09/09/2027",
    entidadeQualificadora: "CIEE Ceará",
    cursoAprendizagem: "JAC Arco Administrativo",
    tutorSupervisor: "Marcos Pereira de Lima",
    setorAlocacao: "Arco Administrativo",
    horarioTrabalho: "13h – 17h",
    banco: "Santander",
    agencia: "1234",
    conta: "78910-1",
    pix: "482.930.192-54",
    diaTeorica: "Quarta-feira",
    tipoAprendiz: "Administrativo"
  },
  {
    nomeCompleto: "Thiago Florencio Nogueira",
    dataNascimento: "21/11/2007",
    idade: "18",
    cpf: "394.102.392-51",
    rg: "28.304.192-3",
    nomeMae: "Sônia Florencio Nogueira",
    nomePai: "Augusto Nogueira",
    telefone: "(85) 98234-5678",
    email: "thiago.florencio@gmail.com",
    endereco: "Av. Pontes Vieira",
    numero: "2100",
    complemento: "Bloco D",
    bairro: "Dionísio Torres",
    cep: "60135-237",
    cidade: "Fortaleza",
    uf: "CE",
    nomeResponsavel: "Sônia Florencio Nogueira",
    cpfResponsavel: "305.193.012-42",
    rgResponsavel: "22.493.102-1",
    parentescoResponsavel: "Mãe",
    telefoneResponsavel: "(85) 98234-5678",
    instituicaoEnsino: "EEFM Álvares de Azevedo",
    cursoGrau: "Ensino Médio",
    turnoEscolar: "Noite",
    serieAno: "3º Ano",
    dataAdmissao: "07/07/2025",
    dataTermino: "11/05/2027",
    entidadeQualificadora: "CIEE Ceará",
    cursoAprendizagem: "JAC Múltiplas Ocupações em Qualificação de Serviço",
    tutorSupervisor: "Marcos Pereira de Lima",
    setorAlocacao: "Almoxarifado & Facilities",
    horarioTrabalho: "08h – 12h",
    banco: "Caixa Econômica Federal",
    agencia: "0918",
    conta: "00092834-5",
    pix: "394.102.392-51",
    diaTeorica: "Segunda-feira",
    tipoAprendiz: "Serviço"
  },
  {
    nomeCompleto: "Alisson Matias Fernandes",
    dataNascimento: "04/04/2008",
    idade: "18",
    cpf: "401.394.021-39",
    rg: "20.301.932-8",
    nomeMae: "Rita Matias Fernandes",
    nomePai: "Eduardo Fernandes",
    telefone: " (85) 98345-6789",
    email: "alisson.matias@gmail.com",
    endereco: "Rua Eduardo Salgado",
    numero: "45",
    complemento: "Apto 12",
    bairro: "Aldeota",
    cep: "60150-145",
    cidade: "Fortaleza",
    uf: "CE",
    nomeResponsavel: "Rita Matias Fernandes",
    cpfResponsavel: "203.491.032-41",
    rgResponsavel: "18.293.012-4",
    parentescoResponsavel: "Mãe",
    telefoneResponsavel: "(85) 98345-6789",
    instituicaoEnsino: "Liceu de Messejana",
    cursoGrau: "Ensino Médio",
    turnoEscolar: "Noite",
    serieAno: "2º Ano",
    dataAdmissao: "16/03/2026",
    dataTermino: "21/01/2028",
    entidadeQualificadora: "CIEE Ceará",
    cursoAprendizagem: "JAC Múltiplas Ocupações em Qualificação de Serviço",
    tutorSupervisor: "Marcos Pereira de Lima",
    setorAlocacao: "Serviços Gerais",
    horarioTrabalho: "08h – 12h",
    banco: "Banco do Brasil",
    agencia: "1234",
    conta: "56789-0",
    pix: "alisson.matias@gmail.com",
    diaTeorica: "Sexta-feira",
    tipoAprendiz: "Serviço"
  }
];

export default function AprendizContractModal({ isOpen, onClose, visualTheme = "light" }: AprendizContractModalProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "form">("dashboard");
  const [formData, setFormData] = useState<AprendizContractData>(emptyForm);
  const [pasteText, setPasteText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [savedRecords, setSavedRecords] = useState<AprendizContractData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentStatusFilter, setCurrentStatusFilter] = useState<"Ativo" | "Inativo">("Ativo");

  // Custom confirmation modal states
  const [confirmTerminateId, setConfirmTerminateId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const calculateAgeFromBirthdate = (birthdateStr: string): string => {
    if (!birthdateStr) return "";
    const parts = birthdateStr.split("/");
    if (parts.length !== 3) return "";
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return "";
    
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    
    if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
      return "";
    }
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age.toString() : "";
  };

  const handleTerminateAprendiz = (idOrCpf: string) => {
    if (!idOrCpf) return;
    setConfirmTerminateId(idOrCpf);
  };

  const executeTerminateAprendiz = (idOrCpf: string) => {
    try {
      const todayStr = new Date().toLocaleDateString("pt-BR");
      const idOrCpfStr = String(idOrCpf).trim();
      const digitsOnly = idOrCpfStr.replace(/\D/g, "");
      
      const updated = savedRecords.map(r => {
        const rId = r.id ? String(r.id).trim() : "";
        const rCpfDigits = r.cpf ? String(r.cpf).replace(/\D/g, "") : "";
        
        const matchId = rId && rId === idOrCpfStr;
        const matchCpf = rCpfDigits && digitsOnly && rCpfDigits === digitsOnly;
        
        if (matchId || matchCpf) {
          return {
            ...r,
            status: "Inativo" as const,
            dataDesligamento: todayStr
          };
        }
        return r;
      });
      
      localStorage.setItem("bp_aprendizes_v1", JSON.stringify(updated));
      setSavedRecords(updated);
      showStatus("Aprendiz desligado com sucesso!", "info");

      // If currently editing this same apprentice in the form, reset and go back to dashboard
      const isEditingThis = formData.id === idOrCpfStr || (formData.cpf && formData.cpf.replace(/\D/g, "") === digitsOnly);
      if (isEditingThis) {
        setFormData(emptyForm);
        setActiveTab("dashboard");
      }
    } catch (e) {
      console.error(e);
      showStatus("Erro ao desligar o aprendiz.", "error");
    } finally {
      setConfirmTerminateId(null);
    }
  };

  // Automatically calculate age when birthdate changes
  useEffect(() => {
    if (formData.dataNascimento && formData.dataNascimento.length === 10) {
      const computedAge = calculateAgeFromBirthdate(formData.dataNascimento);
      if (computedAge && computedAge !== formData.idade) {
        setFormData(prev => ({ ...prev, idade: computedAge }));
      }
    }
  }, [formData.dataNascimento]);

  const activeRecords = savedRecords.filter(r => !r.status || r.status === "Ativo");
  const inactiveRecords = savedRecords.filter(r => r.status === "Inativo");

  const currentStatusRecords = currentStatusFilter === "Ativo" ? activeRecords : inactiveRecords;

  const displayedRecords = currentStatusRecords.filter(r => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.nomeCompleto.toLowerCase().includes(query) ||
      r.cpf.replace(/\D/g, "").includes(query) ||
      (r.id && r.id.toLowerCase().includes(query)) ||
      (r.setorAlocacao && r.setorAlocacao.toLowerCase().includes(query))
    );
  });

  // Load records on opening
  useEffect(() => {
    if (isOpen) {
      loadSavedRecords();
    }
  }, [isOpen]);

  const loadSavedRecords = () => {
    try {
      const stored = localStorage.getItem("bp_aprendizes_v1");
      let parsed: AprendizContractData[] = [];
      if (stored) {
        parsed = JSON.parse(stored);
      } else {
        parsed = [...defaultApprentices];
      }
      
      // Ensure all records have an automatically generated ID and status
      const withIdsAndStatus = parsed.map((item, idx) => {
        const cpfDigits = item.cpf.replace(/\D/g, "");
        const shortHash = cpfDigits.slice(-3) || Math.floor(100 + Math.random() * 900).toString();
        return {
          ...item,
          id: item.id || `AP-${String(idx + 1).padStart(3, "0")}-${shortHash}`,
          status: item.status || "Ativo"
        };
      });

      localStorage.setItem("bp_aprendizes_v1", JSON.stringify(withIdsAndStatus));
      setSavedRecords(withIdsAndStatus);
    } catch (e) {
      console.error("Error loading apprentices:", e);
      setSavedRecords(defaultApprentices.map((item, idx) => ({
        ...item,
        id: `AP-${String(idx + 1).padStart(3, "0")}-000`,
        status: "Ativo"
      })));
    }
  };

  // Safe status helper
  const showStatus = (text: string, type: "success" | "error" | "info" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Helper to retrieve initials for custom avatars
  const getInitials = (name: string) => {
    if (!name) return "JA";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  // Heuristic calculation of dynamic contract progress
  const getContractProgress = (admissaoStr: string, terminoStr: string): number => {
    try {
      if (!admissaoStr || !terminoStr) return 0;
      
      const parseDate = (dStr: string) => {
        const p = dStr.split("/");
        if (p.length === 3) {
          return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])).getTime();
        }
        return null;
      };

      const start = parseDate(admissaoStr);
      const end = parseDate(terminoStr);
      const now = new Date().getTime();

      if (!start || !end || end <= start) return 0;

      const pct = ((now - start) / (end - start)) * 100;
      return Math.max(0, Math.min(100, Math.round(pct)));
    } catch {
      return 0;
    }
  };

  // Extract date to format e.g. "Set/2026"
  const formatMonthYear = (dateStr: string): string => {
    try {
      if (!dateStr) return "";
      const p = dateStr.split("/");
      if (p.length === 3) {
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const monthIdx = parseInt(p[1]) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${months[monthIdx]}/${p[2]}`;
        }
      }
      return "";
    } catch {
      return "";
    }
  };

  // Find nearest expiration record
  const getNearestExpiration = () => {
    if (!savedRecords || savedRecords.length === 0) return null;
    
    const parseDate = (dStr: string) => {
      const p = dStr.split("/");
      if (p.length === 3) {
        return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
      }
      return new Date(9999, 11, 31);
    };

    const sorted = [...savedRecords].sort((a, b) => {
      return parseDate(a.dataTermino).getTime() - parseDate(b.dataTermino).getTime();
    });

    return sorted[0];
  };

  // CRUD Actions
  const handleSaveRecord = () => {
    if (!formData.nomeCompleto.trim()) {
      showStatus("Por favor, preencha o Nome Completo do Aprendiz.", "error");
      return;
    }
    if (!formData.cpf.trim()) {
      showStatus("Por favor, informe o CPF do Aprendiz.", "error");
      return;
    }

    try {
      const records = [...savedRecords];
      // Match either by matching ID or matching CPF (as fallback)
      const index = records.findIndex(r => 
        (formData.id && r.id === formData.id) || 
        (r.cpf.replace(/\D/g, "") === formData.cpf.replace(/\D/g, ""))
      );
      
      const nextIdNumber = records.length + 1;
      const cpfDigits = formData.cpf.replace(/\D/g, "");
      const shortHash = cpfDigits.slice(-3) || Math.floor(100 + Math.random() * 900).toString();
      const generatedId = `AP-${String(nextIdNumber).padStart(3, "0")}-${shortHash}`;

      const updatedData = {
        ...formData,
        id: formData.id || generatedId,
        status: formData.status || "Ativo",
        tipoAprendiz: formData.tipoAprendiz || (formData.cursoAprendizagem.toLowerCase().includes("serviço") || formData.setorAlocacao.toLowerCase().includes("gerais") ? "Serviço" : "Administrativo")
      };

      if (index !== -1) {
        records[index] = updatedData;
        showStatus("Ficha atualizada com sucesso!");
      } else {
        records.push(updatedData);
        showStatus("Novo aprendiz cadastrado!");
      }

      localStorage.setItem("bp_aprendizes_v1", JSON.stringify(records));
      setSavedRecords(records);
      setActiveTab("dashboard");
      setFormData(emptyForm);
    } catch (e) {
      console.error(e);
      showStatus("Erro ao salvar.", "error");
    }
  };

  const handleDeleteRecord = (idOrCpf: string) => {
    if (!idOrCpf) return;
    setConfirmDeleteId(idOrCpf);
  };

  const executeDeleteRecord = (idOrCpf: string) => {
    try {
      const idOrCpfStr = String(idOrCpf).trim();
      const digitsOnly = idOrCpfStr.replace(/\D/g, "");
      
      const updated = savedRecords.filter(r => {
        const rId = r.id ? String(r.id).trim() : "";
        const rCpfDigits = r.cpf ? String(r.cpf).replace(/\D/g, "") : "";
        
        const matchId = rId && rId === idOrCpfStr;
        const matchCpf = rCpfDigits && digitsOnly && rCpfDigits === digitsOnly;
        
        return !(matchId || matchCpf);
      });
      
      localStorage.setItem("bp_aprendizes_v1", JSON.stringify(updated));
      setSavedRecords(updated);
      showStatus("Ficha excluída com sucesso!", "info");
      setFormData(emptyForm);
    } catch (e) {
      console.error(e);
      showStatus("Erro ao excluir o cadastro.", "error");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleEditRecordClick = (record: AprendizContractData) => {
    setFormData({ ...record });
    setActiveTab("form");
  };

  const handleAddNewClick = () => {
    setFormData(emptyForm);
    setActiveTab("form");
  };

  // ViaCEP Integration
  const handleCepSearch = async () => {
    const rawCep = formData.cep.replace(/\D/g, "");
    if (rawCep.length !== 8) return;
    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          uf: data.uf || ""
        }));
        showStatus("CEP encontrado!");
      } else {
        showStatus("CEP não localizado.", "error");
      }
    } catch (e) {
      console.error("CEP search failed:", e);
      showStatus("Falha ao consultar CEP.", "error");
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Formatting Masks
  const handleInputChange = (field: keyof AprendizContractData, val: string) => {
    let formatted = val;
    if (field === "cpf" || field === "cpfResponsavel") {
      const clean = val.replace(/\D/g, "");
      if (clean.length <= 11) {
        formatted = clean
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      }
    } else if (field === "cep") {
      const clean = val.replace(/\D/g, "");
      if (clean.length <= 8) {
        formatted = clean.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
      }
    } else if (field === "dataNascimento" || field === "dataAdmissao" || field === "dataTermino") {
      const clean = val.replace(/\D/g, "");
      if (clean.length <= 8) {
        formatted = clean
          .replace(/(\d{2})(\d)/, "$1/$2")
          .replace(/(\d{2})(\d)/, "$1/$2");
      }
    }
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  // Gemini AI Extraction
  const handleAiExtract = async () => {
    if (!pasteText.trim()) {
      showStatus("Cole o texto do Jovem Aprendiz para extração.", "info");
      return;
    }
    setIsExtracting(true);
    showStatus("Analisando texto com Gemini AI...", "info");
    try {
      const response = await fetch("/api/gemini/extract-aprendiz-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: pasteText }),
      });
      if (response.ok) {
        const data = await response.json();
        setFormData(data);
        showStatus("Dados extraídos e preenchidos!");
        setPasteText("");
      } else {
        throw new Error("API return error");
      }
    } catch (err) {
      console.error(err);
      showStatus("Erro de extração. Executando extrator alternativo...", "error");
      
      // Fallback simple heuristic
      const lines = pasteText.split("\n").map(l => l.trim());
      const res: any = { ...emptyForm };
      lines.forEach(l => {
        const parts = l.split(":");
        if (parts.length >= 2) {
          const k = parts[0].toLowerCase();
          const v = parts.slice(1).join(":").trim();
          if (k.includes("nome")) res.nomeCompleto = v;
          if (k.includes("cpf")) res.cpf = v;
          if (k.includes("nasc")) res.dataNascimento = v;
          if (k.includes("tel") || k.includes("cel")) res.telefone = v;
          if (k.includes("escola") || k.includes("ensino")) res.instituicaoEnsino = v;
        }
      });
      setFormData(prev => ({ ...prev, ...res }));
    } finally {
      setIsExtracting(false);
    }
  };

  // High fidelity jsPDF Generator
  const handleExportPDF = (record: AprendizContractData) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Margins & outer design frame
      doc.setDrawColor(37, 42, 52); // Petroleum Blue
      doc.setLineWidth(1.2);
      doc.rect(5, 5, 200, 287);

      // Main Header Box
      doc.setFillColor(37, 42, 52);
      doc.rect(5, 5, 200, 20, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("ADV BELLINATI PEREZ — FILIAL FORTALEZA", 105, 12, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("PROGRAMA DE APRENDIZAGEM PROFISSIONAL INTEGRADA · CNPJ: 03.404.018/0051-06", 105, 17, { align: "center" });

      // Secondary Ribbon (Magenta)
      doc.setFillColor(255, 46, 99);
      doc.rect(5, 25, 200, 1.5, "F");

      // Title
      doc.setTextColor(37, 42, 52);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("FICHA DE CADASTRO GERAL DO APRENDIZ", 105, 33, { align: "center" });

      let currentY = 38;

      const drawHeaderBlock = (title: string) => {
        doc.setFillColor(234, 234, 234);
        doc.rect(7, currentY, 196, 6, "F");
        doc.setDrawColor(37, 42, 52);
        doc.setLineWidth(0.25);
        doc.rect(7, currentY, 196, 6);
        doc.setTextColor(37, 42, 52);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text(title, 9, currentY + 4.5);
        currentY += 6.5;
      };

      const drawDataRow = (fields: Array<{ label: string; value: string; width: number }>) => {
        let currentX = 7;
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.15);
        
        fields.forEach(f => {
          // If value is empty, fill with subtle gray
          if (!f.value || f.value.trim() === "") {
            doc.setFillColor(245, 245, 245);
            doc.rect(currentX, currentY, f.width, 8.5, "F");
          }
          doc.rect(currentX, currentY, f.width, 8.5);
          
          doc.setTextColor(90, 96, 112);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5.5);
          doc.text(f.label.toUpperCase(), currentX + 1.5, currentY + 2.5);
          
          doc.setTextColor(26, 30, 40);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text(f.value || "—", currentX + 1.5, currentY + 6.5);
          
          currentX += f.width;
        });
        currentY += 8.5;
      };

      // Section 1
      drawHeaderBlock("1. IDENTIFICAÇÃO PESSOAL DO APRENDIZ");
      drawDataRow([
        { label: "Nome Completo", value: record.nomeCompleto, width: 110 },
        { label: "Data de Nascimento", value: record.dataNascimento, width: 45 },
        { label: "Idade", value: record.idade, width: 41 }
      ]);
      drawDataRow([
        { label: "CPF", value: record.cpf, width: 66 },
        { label: "RG", value: record.rg, width: 65 },
        { label: "E-mail de Contato", value: record.email, width: 65 }
      ]);
      drawDataRow([
        { label: "Telefone / Celular", value: record.telefone, width: 66 },
        { label: "Nome da Mãe", value: record.nomeMae, width: 65 },
        { label: "Nome do Pai", value: record.nomePai, width: 65 }
      ]);
      drawDataRow([
        { label: "Endereço Residencial", value: record.endereco, width: 110 },
        { label: "Número", value: record.numero, width: 25 },
        { label: "Complemento", value: record.complemento, width: 61 }
      ]);
      drawDataRow([
        { label: "Bairro", value: record.bairro, width: 66 },
        { label: "CEP", value: record.cep, width: 45 },
        { label: "Cidade", value: record.cidade, width: 65 },
        { label: "Estado (UF)", value: record.uf, width: 20 }
      ]);

      currentY += 3;

      // Section 2
      drawHeaderBlock("2. RESPONSÁVEL LEGAL (MENORES DE 18 ANOS)");
      drawDataRow([
        { label: "Nome do Responsável Legal", value: record.nomeResponsavel, width: 110 },
        { label: "Grau de Parentesco", value: record.parentescoResponsavel, width: 45 },
        { label: "Telefone do Responsável", value: record.telefoneResponsavel, width: 41 }
      ]);
      drawDataRow([
        { label: "CPF do Responsável", value: record.cpfResponsavel, width: 98 },
        { label: "RG do Responsável", value: record.rgResponsavel, width: 98 }
      ]);

      currentY += 3;

      // Section 3
      drawHeaderBlock("3. INFORMAÇÕES EDUCACIONAIS E ESCOLARES");
      drawDataRow([
        { label: "Instituição de Ensino", value: record.instituicaoEnsino, width: 110 },
        { label: "Curso / Nivelamento", value: record.cursoGrau, width: 86 }
      ]);
      drawDataRow([
        { label: "Turno Escolar", value: record.turnoEscolar, width: 98 },
        { label: "Série / Ano Letivo", value: record.serieAno, width: 98 }
      ]);

      currentY += 3;

      // Section 4
      drawHeaderBlock("4. CONTRATO DE APRENDIZAGEM & ALOCAÇÃO");
      drawDataRow([
        { label: "Data de Admissão", value: record.dataAdmissao, width: 66 },
        { label: "Fim do Contrato", value: record.dataTermino, width: 65 },
        { label: "Entidade Qualificadora", value: record.entidadeQualificadora, width: 65 }
      ]);
      drawDataRow([
        { label: "Curso Profissionalizante", value: record.cursoAprendizagem, width: 98 },
        { label: "Dia de Estudo Teórico", value: record.diaTeorica, width: 98 }
      ]);
      drawDataRow([
        { label: "Tutor / Supervisor Direto", value: record.tutorSupervisor, width: 66 },
        { label: "Setor de Alocação", value: record.setorAlocacao, width: 65 },
        { label: "Horário de Trabalho", value: record.horarioTrabalho, width: 65 }
      ]);

      currentY += 3;

      // Section 5
      drawHeaderBlock("5. DADOS FINANCEIROS E BANCÁRIOS (REVERSÃO DE SALÁRIO)");
      drawDataRow([
        { label: "Nome do Banco", value: record.banco, width: 66 },
        { label: "Agência", value: record.agencia, width: 40 },
        { label: "Conta Corrente", value: record.conta, width: 50 },
        { label: "Chave PIX", value: record.pix, width: 40 }
      ]);

      currentY += 16;

      // Signatures
      doc.setDrawColor(37, 42, 52);
      doc.setLineWidth(0.4);
      doc.line(15, currentY, 90, currentY);
      doc.line(120, currentY, 195, currentY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("ASSINATURA DO JOVEM APRENDIZ (OU RESPONSÁVEL)", 52.5, currentY + 4, { align: "center" });
      doc.text("SETOR DEfacilities / GESTÃO DE PESSOAS", 157.5, currentY + 4, { align: "center" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text("DECLARO PARA OS DEVIDOS FINS QUE AS INFORMAÇÕES ACIMA SÃO VERÍDICAS", 52.5, currentY + 7, { align: "center" });
      doc.text("ADV BELLINATI PEREZ — HOMOLOGAÇÃO DE ADMISSÃO", 157.5, currentY + 7, { align: "center" });

      doc.save(`Ficha_Aprendiz_${record.nomeCompleto.replace(/\s+/g, "_")}.pdf`);
      showStatus("PDF Gerado com sucesso!");
    } catch (e) {
      console.error(e);
      showStatus("Erro ao gerar PDF", "error");
    }
  };

  // High fidelity ExcelJS Sheet Generator
  const handleExportExcelAll = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Aprendizes BP Fortaleza", {
        views: [{ showGridLines: true }]
      });

      worksheet.columns = [
        { header: "Nome Completo", key: "nomeCompleto", width: 30 },
        { header: "Tipo", key: "tipo", width: 15 },
        { header: "CPF", key: "cpf", width: 18 },
        { header: "Início Contrato", key: "admissao", width: 15 },
        { header: "Fim Contrato", key: "termino", width: 15 },
        { header: "Dia Teórica", key: "diaTeorica", width: 15 },
        { header: "Horário", key: "horario", width: 15 },
        { header: "Supervisor", key: "supervisor", width: 25 },
        { header: "Setor", key: "setor", width: 25 },
        { header: "Banco", key: "banco", width: 15 },
        { header: "Agência", key: "agencia", width: 12 },
        { header: "Conta", key: "conta", width: 15 },
        { header: "Chave PIX", key: "pix", width: 20 },
      ];

      // Format header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF252A34" }
      };

      savedRecords.forEach(r => {
        worksheet.addRow({
          nomeCompleto: r.nomeCompleto,
          tipo: r.tipoAprendiz || "—",
          cpf: r.cpf,
          admissao: r.dataAdmissao,
          termino: r.dataTermino,
          diaTeorica: r.diaTeorica || "—",
          horario: r.horarioTrabalho,
          supervisor: r.tutorSupervisor,
          setor: r.setorAlocacao,
          banco: r.banco,
          agencia: r.agencia,
          conta: r.conta,
          pix: r.pix,
        });
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.font = { name: "Arial", size: 9 };
          // Zebra striping
          if (rowNumber % 2 === 0) {
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF9FAFB" }
            };
          }
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Relatorio_Aprendizes_Fortaleza.xlsx`;
      link.click();
      showStatus("Planilha gerada com sucesso!");
    } catch (e) {
      console.error(e);
      showStatus("Erro ao gerar Excel", "error");
    }
  };

  if (!isOpen) return null;

  // Statistics calculation for Top Dashboard Row (using Active records)
  const totalCount = activeRecords.length;
  const adminCount = activeRecords.filter(r => r.tipoAprendiz === "Administrativo").length;
  const servCount = activeRecords.filter(r => r.tipoAprendiz === "Serviço").length;
  const nearestRecord = getNearestExpiration();

  // Schedule filtering for weekly calendar (using Active records)
  const getPillsByDay = (dayName: string) => {
    return activeRecords.filter(r => r.diaTeorica === dayName);
  };

  const getDayHasClass = (dayName: string) => {
    const pills = getPillsByDay(dayName);
    if (pills.length === 0) return "";
    const hasAdm = pills.some(r => r.tipoAprendiz === "Administrativo");
    const hasServ = pills.some(r => r.tipoAprendiz === "Serviço");
    if (hasAdm && hasServ) return "has-event-both";
    if (hasAdm) return "has-event-ciano";
    if (hasServ) return "has-event-rosa";
    return "";
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#F4F6FA] dark:bg-slate-950 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* TOPBAR (石油蓝 exact Petroleum Blue) */}
        <header className="bg-[#252A34] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 border-b border-slate-800">
          <div className="text-center sm:text-left">
            <div className="font-bold text-2xl tracking-tight text-white">
              Bellinati<span className="text-[#FF2E63]">Perez</span>
            </div>
            <div className="text-xs tracking-widest text-slate-500 uppercase font-semibold">
              Seriedade · Competência · Inovação
            </div>
          </div>

          {/* Quick Stats badges and Controls */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-2 bg-[#FF2E63]/10 border border-[#FF2E63]/30 px-3.5 py-1.5 rounded-full text-xs text-[#FF2E63] tracking-wider uppercase font-black">
              <span className="h-1.5 w-1.5 bg-[#FF2E63] rounded-full animate-ping"></span>
              <span>Filial Fortaleza</span>
            </div>

            <EmojiButton
              iconKey="exportarExcel"
              onClick={handleExportExcelAll}
              size="sm"
              variant="success"
            />

            <EmojiButton
              iconKey="adicionar"
              onClick={handleAddNewClick}
              size="sm"
              variant="primary"
              className="bg-[#FF2E63] hover:bg-[#FF2E63]/90 border-[#FF2E63]"
            />

            <EmojiButton
              iconKey="fecharModal"
              onClick={onClose}
              size="sm"
              variant="custom"
              className="p-1.5 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white ml-1 min-h-0 min-w-0 h-auto w-auto"
            />
          </div>
        </header>

        {/* STICKY TAB CONTROLS */}
        <div className="bg-[#252A34] px-6 pb-2 flex gap-4 shrink-0 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`pb-2.5 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === "dashboard" 
                ? "text-[#FF2E63] border-b-2 border-[#FF2E63]" 
                : "text-slate-500 hover:text-white"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Painel Geral</span>
          </button>
          <button
            onClick={() => setActiveTab("form")}
            className={`pb-2.5 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === "form" 
                ? "text-[#FF2E63] border-b-2 border-[#FF2E63]" 
                : "text-slate-500 hover:text-white"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Ficha de Cadastro & IA</span>
          </button>
        </div>

        {/* STATUS MESSAGE BOX */}
        {statusMessage && (
          <div className={`p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-2 border-b uppercase shrink-0 tracking-wider ${
            statusMessage.type === "error" 
              ? "bg-red-50 text-red-600 border-red-200" 
              : statusMessage.type === "info" 
                ? "bg-blue-50 text-blue-600 border-blue-200" 
                : "bg-green-50 text-green-700 border-green-200"
          }`}>
            <span className="animate-bounce">🧠</span>
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* BODY AREA */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "dashboard" ? (
            /* ================= DASHBOARD VIEW ================= */
            <div className="space-y-6">
              
              {/* HERO BANNER SECTION (Petroleum Blue dark banner) */}
              <section className="bg-[#252A34] px-6 py-8 border-b border-slate-700 text-white relative overflow-hidden">
                <div className="text-xs tracking-widest text-slate-500 uppercase font-black mb-1.5">
                  Gestão de Pessoas · Filial Fortaleza · 2024–2028
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  Nossos <span className="text-[#FF2E63] underline decoration-pink-500 decoration-4">Aprendizes</span>
                </h1>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  Acompanhe e administre os jovens que fazem parte da nossa jornada em Fortaleza.
                </p>
              </section>

              {/* STATS ROW (4 Cards Grid) */}
              <div className="px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Stat 1 */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 relative overflow-hidden shadow-xs hover:-translate-y-0.5 transition-all">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#FF2E63]"></div>
                  <div className="text-xs font-black uppercase text-slate-500 tracking-widest">Total de Aprendizes</div>
                  <div className="text-3xl font-extrabold text-[#252A34] dark:text-white mt-1.5">{totalCount.toString().padStart(2, "0")}</div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">Filial Fortaleza</div>
                </div>

                {/* Stat 2 */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 relative overflow-hidden shadow-xs hover:-translate-y-0.5 transition-all">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#FF2E63]"></div>
                  <div className="text-xs font-black uppercase text-slate-500 tracking-widest">Área Administrativa</div>
                  <div className="text-3xl font-extrabold text-[#FF2E63] mt-1.5">{adminCount.toString().padStart(2, "0")}</div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">JAC Arco Adm</div>
                </div>

                {/* Stat 3 */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 relative overflow-hidden shadow-xs hover:-translate-y-0.5 transition-all">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#A82047]"></div>
                  <div className="text-3xl font-extrabold text-[#A82047] mt-1.5" style={{ color: "var(--magenta)" }}>{servCount.toString().padStart(2, "0")}</div>
                  <div className="text-xs font-black uppercase text-slate-500 tracking-widest">Múltiplas Ocupações</div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">JAC Qualificação de Serviço</div>
                </div>

                {/* Stat 4 */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 relative overflow-hidden shadow-xs hover:-translate-y-0.5 transition-all">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#252A34]"></div>
                  <div className="text-xs font-black uppercase text-slate-500 tracking-widest">Próximo Término</div>
                  <div className="text-lg font-black text-[#252A34] dark:text-white mt-1.5 truncate">
                    {nearestRecord ? formatMonthYear(nearestRecord.dataTermino) : "—"}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-1 truncate">
                    {nearestRecord ? `${nearestRecord.nomeCompleto.split(" ")[0]} · ${nearestRecord.dataTermino}` : "Sem data"}
                  </div>
                </div>
              </div>

              {/* MAIN CONTENT GRID */}
              <div className="px-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* CARDS DOS APRENDIZES COLUMN */}
                <div className="lg:col-span-2 space-y-4">
                  
                  {/* Search and Filter Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    
                    {/* Status Tabs Selector */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setCurrentStatusFilter("Ativo")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          currentStatusFilter === "Ativo"
                            ? "bg-[#252A34] text-[#FF2E63] dark:bg-[#FF2E63] dark:text-slate-950 shadow-xs"
                            : "bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        Ativos ({activeRecords.length})
                      </button>
                      <button
                        onClick={() => setCurrentStatusFilter("Inativo")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          currentStatusFilter === "Inativo"
                            ? "bg-[#252A34] text-pink-500 dark:bg-[#FF2E63] dark:text-white shadow-xs"
                            : "bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        Desligados ({inactiveRecords.length})
                      </button>
                    </div>

                    {/* Search Input field */}
                    <div className="relative flex-1 max-w-xs sm:ml-auto">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Buscar por nome, CPF, ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-white focus:outline-hidden focus:border-[#FF2E63] font-bold"
                      />
                    </div>
                  </div>

                  <div className="text-xs font-black uppercase text-slate-500 tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
                    <span>Equipe de Aprendizes ({currentStatusFilter === "Ativo" ? "Ativos" : "Desligados"})</span>
                    <span className="text-xs font-semibold text-[#FF2E63]">Resultados ({displayedRecords.length})</span>
                  </div>

                  {displayedRecords.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                      <p className="text-xs font-bold uppercase tracking-wider">Nenhum jovem aprendiz encontrado.</p>
                      <p className="text-xs text-slate-500 mt-1 uppercase">Tente usar outros termos na busca ou confira o filtro de status.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {displayedRecords.map((r, index) => {
                        const isAdm = r.tipoAprendiz === "Administrativo";
                        const isLoner = index === displayedRecords.length - 1 && displayedRecords.length % 2 !== 0;
                        const isInactive = r.status === "Inativo";

                        return (
                          <div 
                            key={index} 
                            className={`bg-white dark:bg-slate-900 border ${
                              isInactive 
                                ? "border-red-300 dark:border-red-900 bg-red-50/10 dark:bg-red-950/5" 
                                : "border-slate-200/80 dark:border-slate-800"
                            } rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group flex flex-col justify-between ${
                              isLoner ? "sm:col-span-2 sm:grid sm:grid-cols-3" : ""
                            }`}
                          >
                            {/* Card Top Strip banner background */}
                            <div className={`relative h-20 overflow-hidden shrink-0 ${
                              isLoner ? "sm:h-auto sm:col-span-1" : ""
                            } ${
                              isInactive
                                ? "bg-gradient-to-br from-red-100 to-red-300 dark:from-red-950 dark:to-red-900"
                                : isAdm 
                                  ? "bg-gradient-to-br from-[#e0fafa] to-[#b2f5f4] dark:from-slate-800 dark:to-teal-950" 
                                  : "bg-gradient-to-br from-[#ffe0e8] to-[#ffb3c6] dark:from-slate-850 dark:to-pink-950"
                            }`}>
                              <span className={`absolute top-2.5 right-2.5 text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                isInactive
                                  ? "bg-red-500 text-white border-red-650"
                                  : isAdm 
                                    ? "bg-[#FF2E63]/15 text-[#A82047] border-[#FF2E63]/40" 
                                    : "bg-[#FF2E63]/10 text-[#A82047] dark:text-pink-400 border-[#FF2E63]/30"
                              }`}>
                                {isInactive ? "Desligado" : r.tipoAprendiz || "Aprendiz"}
                              </span>

                              {/* ID Tag */}
                              {r.id && (
                                <span className="absolute bottom-2.5 right-2.5 text-xs font-mono font-black text-slate-500 bg-white/60 dark:bg-slate-900/60 px-1.5 py-0.5 rounded-sm">
                                  {r.id}
                                </span>
                              )}

                              {/* Initials Avatar wrapper */}
                              <div className="absolute -bottom-6 left-4 h-12 w-12 rounded-full border-2 border-white dark:border-slate-900 overflow-hidden shadow-md">
                                <div className={`h-full w-full flex items-center justify-center text-xs font-black text-white ${
                                  isInactive
                                    ? "bg-gradient-to-tr from-red-750 to-red-500"
                                    : isAdm 
                                      ? "bg-gradient-to-tr from-[#A82047] to-[#FF2E63]" 
                                      : "bg-gradient-to-tr from-[#A82047] to-[#FF2E63]"
                                }`}>
                                  {getInitials(r.nomeCompleto)}
                                </div>
                              </div>
                            </div>

                            {/* Card Body content */}
                            <div className={`p-4 pt-8 flex-1 flex flex-col justify-between ${isLoner ? "sm:col-span-2 sm:pt-4" : ""}`}>
                              <div>
                                <div className={`font-extrabold text-sm ${
                                  isInactive 
                                    ? "text-red-750 dark:text-red-400 group-hover:text-red-600" 
                                    : "text-[#252A34] dark:text-slate-100 group-hover:text-[#FF2E63]"
                                } transition-colors line-clamp-1`}>
                                  {r.nomeCompleto}
                                </div>
                                <div className="text-xs text-slate-500 font-bold uppercase tracking-wide mt-0.5 line-clamp-1">
                                  {r.cursoAprendizagem}
                                </div>

                                <div className="mt-3.5 space-y-1">
                                  <div className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                                    <span>📅 Início:</span>
                                    <strong className="text-slate-700 dark:text-slate-350">{r.dataAdmissao || "—"}</strong>
                                  </div>
                                  <div className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                                    <span>🎓 Término:</span>
                                    <strong className="text-slate-700 dark:text-slate-350">{r.dataTermino || "—"}</strong>
                                  </div>

                                  {isInactive && r.dataDesligamento && (
                                    <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-extrabold flex items-center gap-1.5 uppercase bg-red-50 dark:bg-red-950/40 p-1.5 rounded-lg border border-red-200/50 dark:border-red-900/40">
                                      <span>❌ Desligado em:</span>
                                      <strong>{r.dataDesligamento}</strong>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Card Footer actions & scheduling badges */}
                              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                <div className="flex flex-col">
                                  <span className={`text-xs font-extrabold ${isInactive ? "text-red-650" : isAdm ? "text-[#A82047]" : "text-[#FF2E63]"}`}>
                                    {r.horarioTrabalho || "08:00 às 12:00"}
                                  </span>
                                  <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-1.5 py-0.5 rounded-md mt-0.5 max-w-max">
                                    {r.diaTeorica || "Sem teórica"}
                                  </span>
                                </div>

                                {/* CRUD quick actions */}
                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <EmojiButton
                                    iconKey="imprimir"
                                    onClick={() => handleExportPDF(r)}
                                    size="sm"
                                    variant="custom"
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 rounded-md min-h-0 min-w-0 h-8 w-8 text-sm"
                                  />
                                  <EmojiButton
                                    iconKey="editar"
                                    onClick={() => handleEditRecordClick(r)}
                                    size="sm"
                                    variant="custom"
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-500 hover:text-blue-700 rounded-md min-h-0 min-w-0 h-8 w-8 text-sm"
                                  />
                                  {!isInactive && (
                                    <EmojiButton
                                      iconKey="desligarAprendiz"
                                      onClick={() => handleTerminateAprendiz(r.id || r.cpf)}
                                      size="sm"
                                      variant="custom"
                                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950 text-red-500 hover:text-red-700 rounded-md min-h-0 min-w-0 h-8 w-8 text-sm"
                                    />
                                  )}
                                  <EmojiButton
                                    iconKey="excluir"
                                    onClick={() => handleDeleteRecord(r.id || r.cpf)}
                                    size="sm"
                                    variant="custom"
                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950 text-red-500 hover:text-red-700 rounded-md min-h-0 min-w-0 h-8 w-8 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* SIDEBAR CONTRACT PROGRESS COLUMN */}
                <div className="space-y-4">
                  <div className="text-xs font-black uppercase text-slate-500 tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2">
                    Progresso de Contratos (Ativos)
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                    {activeRecords.map((r, i) => {
                      const pct = getContractProgress(r.dataAdmissao, r.dataTermino);
                      const isAdm = r.tipoAprendiz === "Administrativo";

                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-extrabold text-[#252A34] dark:text-white block leading-tight">
                                {r.nomeCompleto.split(" ")[0]} {r.nomeCompleto.split(" ").slice(-1)[0]}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                {r.dataAdmissao} <span className="text-slate-300">→</span> {r.dataTermino}
                              </span>
                            </div>
                            <span className={`text-xs font-black ${isAdm ? "text-[#A82047]" : "text-[#A82047]"}`}>
                              ~{pct}%
                            </span>
                          </div>

                          {/* Progress Line */}
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isAdm 
                                  ? "bg-gradient-to-r from-[#FF2E63] to-[#A82047]" 
                                  : "bg-gradient-to-r from-[#FF2E63] to-[#A82047]"
                              }`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* WEEKLY CLASS SCHEDULE (Agenda Semanal) */}
              <section className="px-6 pb-8 space-y-3">
                <div className="text-xs font-black uppercase text-slate-500 tracking-widest border-b border-slate-200 pb-2">
                  Agenda Semanal de Aprendizagem Teórica
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"].map((dayName, index) => {
                    const hasClassClass = getDayHasClass(dayName);
                    const pills = getPillsByDay(dayName);

                    return (
                      <div 
                        key={index}
                        className={`bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 rounded-xl p-4 min-h-48 flex flex-col justify-between transition-all hover:shadow-md ${
                          hasClassClass === "has-event-both" 
                            ? "border-t-4 border-l-2 border-[#FF2E63]" 
                            : hasClassClass === "has-event-ciano" 
                              ? "border-t-4 border-[#FF2E63]" 
                              : hasClassClass === "has-event-rosa" 
                                ? "border-t-4 border-[#FF2E63]" 
                                : ""
                        }`}
                      >
                        <div>
                          <div className="font-extrabold text-xs tracking-wider uppercase text-slate-700 dark:text-slate-300">
                            {dayName}
                          </div>
                          
                          <div className="mt-3.5 space-y-2">
                            {pills.map((p, pIdx) => {
                              const isAdm = p.tipoAprendiz === "Administrativo";
                              return (
                                <div 
                                  key={pIdx} 
                                  className={`p-2 rounded-lg border text-left text-xs font-semibold flex items-start gap-1.5 ${
                                    isAdm 
                                      ? "bg-[#FF2E63]/5 border-[#FF2E63]/20" 
                                      : "bg-[#FF2E63]/5 border-[#FF2E63]/15"
                                  }`}
                                >
                                  <span className="text-xs mt-0.5 shrink-0">{isAdm ? "📚" : "🔧"}</span>
                                  <div className="leading-tight">
                                    <div className="text-[#252A34] dark:text-slate-100 font-extrabold">{p.nomeCompleto.split(" ")[0]}</div>
                                    <div className={`text-xs font-bold mt-0.5 ${isAdm ? "text-[#A82047]" : "text-[#A82047]"}`}>
                                      {p.horarioTrabalho || "13h - 17h"}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {pills.length === 0 && (
                              <div className="text-xs text-slate-500 font-medium italic mt-4">
                                Sem aprendizagem teórica
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-slate-450 uppercase font-black tracking-widest mt-4">
                          BP FORTALEZA
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* FOOTER */}
              <footer className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 uppercase font-bold shrink-0">
                <span>BELLINATI PEREZ © 2024 · Gestão de Pessoas · Jovem Aprendiz</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1 w-5 bg-gradient-to-r from-[#FF2E63] to-[#FF2E63] rounded-sm"></span>
                  Filial Fortaleza · v2.0
                </span>
              </footer>

            </div>
          ) : (
            /* ================= FULL CADASTRO & EDIT FORM ================= */
            <div className="p-6 max-w-4xl mx-auto space-y-6">
              
              {/* CONTROL HERO */}
              <div className="bg-[#252A34] p-5 rounded-xl border border-slate-700 text-white flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <span className="text-xs bg-pink-150 text-pink-700 font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider">
                    Ficha Cadastral do Colaborador
                  </span>
                  <h3 className="text-lg font-black uppercase tracking-wider mt-1.5 text-white">
                    {formData.nomeCompleto ? `Ficha: ${formData.nomeCompleto}` : "Nova Ficha de Admissão"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-semibold">
                    Preenchimento automático via CEP ou Inteligência Artificial Gemini
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <EmojiButton
                    iconKey="exemploModelo"
                    onClick={() => setFormData({ ...defaultApprentices[0] })}
                    size="sm"
                    variant="custom"
                    className="border border-slate-600 hover:bg-slate-800 text-white h-9 w-9 min-h-0 min-w-0"
                  />
                  <EmojiButton
                    iconKey="limpar"
                    onClick={() => setFormData(emptyForm)}
                    size="sm"
                    variant="custom"
                    className="border border-slate-600 hover:bg-slate-800 text-white h-9 w-9 min-h-0 min-w-0"
                  />
                </div>
              </div>

              {/* INTEGRATED GEMINI CHAT TEXT AREA BOX */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">
                    <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                    <span>Lançador de Contrato via Gemini AI (Leitura Inteligente)</span>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-sm uppercase tracking-widest">
                    Gemini 2.5 Flash
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed uppercase">
                  Cole abaixo dados brutos do e-mail de admissão, currículo do candidato ou ficha informal e clique para lançar nos campos:
                </p>
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={4}
                    placeholder="Cole dados aqui..."
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    className="w-full p-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-slate-100 focus:outline-hidden focus:border-pink-500 leading-relaxed resize-none"
                  />
                  <EmojiButton
                    iconKey="geradorIA"
                    onClick={handleAiExtract}
                    disabled={isExtracting || !pasteText.trim()}
                    size="md"
                    variant="custom"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 h-11"
                  />
                </div>
              </div>

              {/* MAIN FORM FIELDSETS */}
              <div className="space-y-6">
                
                {/* 1. IDENTIFICAÇÃO DO COLABORADOR */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 dark:bg-slate-850 px-4 py-2 text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-[#FF2E63]" />
                    <span>1. Identificação do Jovem Aprendiz</span>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Nome Completo do Aprendiz *</label>
                      <input
                        type="text"
                        value={formData.nomeCompleto}
                        onChange={(e) => handleInputChange("nomeCompleto", e.target.value)}
                        placeholder="EX: CALEBE TORRES DA SILVA"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Data de Nascimento *</label>
                      <input
                        type="text"
                        value={formData.dataNascimento}
                        onChange={(e) => handleInputChange("dataNascimento", e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white text-center"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Idade (Cálculo Automático) *</label>
                      <input
                        type="text"
                        value={formData.idade}
                        readOnly
                        placeholder="Automático"
                        className="p-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-500 dark:text-slate-400 text-center cursor-not-allowed"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">CPF do Aprendiz *</label>
                      <input
                        type="text"
                        value={formData.cpf}
                        onChange={(e) => handleInputChange("cpf", e.target.value)}
                        placeholder="000.000.000-00"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white text-center"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">RG do Aprendiz</label>
                      <input
                        type="text"
                        value={formData.rg}
                        onChange={(e) => handleInputChange("rg", e.target.value)}
                        placeholder="00.000.000-0"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white text-center"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Telefone do Aprendiz</label>
                      <input
                        type="text"
                        value={formData.telefone}
                        onChange={(e) => handleInputChange("telefone", e.target.value)}
                        placeholder="(85) 90000-0000"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">E-mail de Contato</label>
                      <input
                        type="text"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="calebe.torres@gmail.com"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Nome da Mãe</label>
                      <input
                        type="text"
                        value={formData.nomeMae}
                        onChange={(e) => handleInputChange("nomeMae", e.target.value)}
                        placeholder="MÃE COMPLETO"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Nome do Pai</label>
                      <input
                        type="text"
                        value={formData.nomePai}
                        onChange={(e) => handleInputChange("nomePai", e.target.value)}
                        placeholder="PAI COMPLETO"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">CEP *</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={formData.cep}
                          onChange={(e) => handleInputChange("cep", e.target.value)}
                          placeholder="00000-000"
                          className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white text-center flex-1"
                        />
                        <EmojiButton
                          iconKey="consultarCep"
                          onClick={handleCepSearch}
                          disabled={isSearchingCep}
                          size="sm"
                          variant="primary"
                          className="bg-[#FF2E63] hover:bg-[#FF2E63]/90 border-[#FF2E63] min-h-0 min-w-0 h-9 w-9 p-0 flex items-center justify-center shrink-0"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Endereço Residencial</label>
                      <input
                        type="text"
                        value={formData.endereco}
                        onChange={(e) => handleInputChange("endereco", e.target.value)}
                        placeholder="RUA, AVENIDA..."
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Número</label>
                      <input
                        type="text"
                        value={formData.numero}
                        onChange={(e) => handleInputChange("numero", e.target.value)}
                        placeholder="Nº"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white text-center"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Complemento</label>
                      <input
                        type="text"
                        value={formData.complemento}
                        onChange={(e) => handleInputChange("complemento", e.target.value)}
                        placeholder="APTO, BLOCO..."
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Bairro</label>
                      <input
                        type="text"
                        value={formData.bairro}
                        onChange={(e) => handleInputChange("bairro", e.target.value)}
                        placeholder="BAIRRO"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Cidade</label>
                      <input
                        type="text"
                        value={formData.cidade}
                        onChange={(e) => handleInputChange("cidade", e.target.value)}
                        placeholder="FORTALEZA"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Estado (UF)</label>
                      <input
                        type="text"
                        value={formData.uf}
                        onChange={(e) => handleInputChange("uf", e.target.value)}
                        placeholder="CE"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white text-center"
                        maxLength={2}
                      />
                    </div>

                  </div>
                </div>

                {/* 2. RESPONSÁVEL LEGAL */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 dark:bg-slate-850 px-4 py-2 text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-[#FF2E63]" />
                    <span>2. Responsável Legal (Se Menor de 18 Anos)</span>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Nome do Responsável Legal</label>
                      <input
                        type="text"
                        value={formData.nomeResponsavel}
                        onChange={(e) => handleInputChange("nomeResponsavel", e.target.value)}
                        placeholder="RESPONSÁVEL COMPLETO"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Parentesco</label>
                      <input
                        type="text"
                        value={formData.parentescoResponsavel}
                        onChange={(e) => handleInputChange("parentescoResponsavel", e.target.value)}
                        placeholder="MÃE / PAI / TUTOR"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">CPF do Responsável</label>
                      <input
                        type="text"
                        value={formData.cpfResponsavel}
                        onChange={(e) => handleInputChange("cpfResponsavel", e.target.value)}
                        placeholder="000.000.000-00"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white text-center"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">RG do Responsável</label>
                      <input
                        type="text"
                        value={formData.rgResponsavel}
                        onChange={(e) => handleInputChange("rgResponsavel", e.target.value)}
                        placeholder="00.000.000-0"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white text-center"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Telefone do Responsável</label>
                      <input
                        type="text"
                        value={formData.telefoneResponsavel}
                        onChange={(e) => handleInputChange("telefoneResponsavel", e.target.value)}
                        placeholder="(85) 90000-0000"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. DADOS ESCOLARES */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 dark:bg-slate-850 px-4 py-2 text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-[#FF2E63]" />
                    <span>3. Informações de Nivelamento Escolar</span>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Instituição de Ensino / Escola</label>
                      <input
                        type="text"
                        value={formData.instituicaoEnsino}
                        onChange={(e) => handleInputChange("instituicaoEnsino", e.target.value)}
                        placeholder="EX: LICEU DO CEARÁ"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Curso / Grau</label>
                      <input
                        type="text"
                        value={formData.cursoGrau}
                        onChange={(e) => handleInputChange("cursoGrau", e.target.value)}
                        placeholder="EX: ENSINO MÉDIO"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Turno Escolar</label>
                      <select
                        value={formData.turnoEscolar}
                        onChange={(e) => setFormData(prev => ({ ...prev, turnoEscolar: e.target.value as any }))}
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white focus:outline-hidden"
                      >
                        <option value="">Selecione...</option>
                        <option value="Manhã">Manhã</option>
                        <option value="Tarde">Tarde</option>
                        <option value="Noite">Noite</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Série / Ano</label>
                      <input
                        type="text"
                        value={formData.serieAno}
                        onChange={(e) => handleInputChange("serieAno", e.target.value)}
                        placeholder="EX: 3º ANO"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. CONTRATO DE APRENDIZAGEM */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 dark:bg-slate-850 px-4 py-2 text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-[#FF2E63]" />
                    <span>4. Informações do Contrato de Trabalho</span>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Data de Admissão *</label>
                      <input
                        type="text"
                        value={formData.dataAdmissao}
                        onChange={(e) => handleInputChange("dataAdmissao", e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white text-center"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Data de Término *</label>
                      <input
                        type="text"
                        value={formData.dataTermino}
                        onChange={(e) => handleInputChange("dataTermino", e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white text-center"
                      />
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Entidade Qualificadora (e.g. CIEE, SENAC)</label>
                      <input
                        type="text"
                        value={formData.entidadeQualificadora}
                        onChange={(e) => handleInputChange("entidadeQualificadora", e.target.value)}
                        placeholder="EX: CIEE CEARÁ"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Curso de Aprendizagem</label>
                      <input
                        type="text"
                        value={formData.cursoAprendizagem}
                        onChange={(e) => handleInputChange("cursoAprendizagem", e.target.value)}
                        placeholder="EX: ASSISTENTE ADMINISTRATIVO"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Status do Aprendiz *</label>
                      <select
                        value={formData.status || "Ativo"}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white focus:outline-hidden"
                      >
                        <option value="Ativo">Ativo (Em Atividade)</option>
                        <option value="Inativo">Inativo (Desligado)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Tipo de Ocupação *</label>
                      <select
                        value={formData.tipoAprendiz}
                        onChange={(e) => setFormData(prev => ({ ...prev, tipoAprendiz: e.target.value as any }))}
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white focus:outline-hidden"
                      >
                        <option value="">Selecione...</option>
                        <option value="Administrativo">Administrativo</option>
                        <option value="Serviço">Serviço (Múlt. Ocupações)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Dia Teórica *</label>
                      <select
                        value={formData.diaTeorica}
                        onChange={(e) => setFormData(prev => ({ ...prev, diaTeorica: e.target.value as any }))}
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white focus:outline-hidden"
                      >
                        <option value="">Selecione...</option>
                        <option value="Segunda-feira">Segunda-feira</option>
                        <option value="Terça-feira">Terça-feira</option>
                        <option value="Quarta-feira">Quarta-feira</option>
                        <option value="Quinta-feira">Quinta-feira</option>
                        <option value="Sexta-feira">Sexta-feira</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Tutor / Supervisor</label>
                      <input
                        type="text"
                        value={formData.tutorSupervisor}
                        onChange={(e) => handleInputChange("tutorSupervisor", e.target.value)}
                        placeholder="EX: MARCOS PEREIRA"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Setor de Alocação</label>
                      <input
                        type="text"
                        value={formData.setorAlocacao}
                        onChange={(e) => handleInputChange("setorAlocacao", e.target.value)}
                        placeholder="EX: FACILITIES / GERAIS"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Horário de Trabalho (Máx 6h)</label>
                      <input
                        type="text"
                        value={formData.horarioTrabalho}
                        onChange={(e) => handleInputChange("horarioTrabalho", e.target.value)}
                        placeholder="EX: 13:00 às 17:00"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                  </div>
                </div>

                {/* 5. DADOS BANCÁRIOS */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 dark:bg-slate-850 px-4 py-2 text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-[#FF2E63]" />
                    <span>5. Informações de Pagamento (Bancário)</span>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Banco</label>
                      <input
                        type="text"
                        value={formData.banco}
                        onChange={(e) => handleInputChange("banco", e.target.value)}
                        placeholder="NOME DO BANCO"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Agência</label>
                      <input
                        type="text"
                        value={formData.agencia}
                        onChange={(e) => handleInputChange("agencia", e.target.value)}
                        placeholder="AGENCIA"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white text-center"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Conta Corrente</label>
                      <input
                        type="text"
                        value={formData.conta}
                        onChange={(e) => handleInputChange("conta", e.target.value)}
                        placeholder="CONTA COM DIGITO"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white text-center"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-black uppercase text-slate-450 tracking-wider">Chave PIX</label>
                      <input
                        type="text"
                        value={formData.pix}
                        onChange={(e) => handleInputChange("pix", e.target.value)}
                        placeholder="EX: CPF OU E-MAIL"
                        className="p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* SAVE / EXPORT BUTTONS ROW */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
                <EmojiButton
                  iconKey="cancelar"
                  onClick={() => {
                    setFormData(emptyForm);
                    setActiveTab("dashboard");
                  }}
                  size="md"
                  variant="secondary"
                  className="w-full sm:w-auto px-5 py-2.5"
                />
                {formData.id && formData.status !== "Inativo" && (
                  <EmojiButton
                    iconKey="desligarAprendiz"
                    onClick={() => handleTerminateAprendiz(formData.id!)}
                    size="md"
                    variant="danger"
                    className="w-full sm:w-auto px-5 py-2.5"
                  />
                )}
                <EmojiButton
                  iconKey="salvar"
                  onClick={handleSaveRecord}
                  size="md"
                  variant="success"
                  className="w-full sm:w-auto px-6 py-2.5"
                />
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Helper & Custom Overlays for Confirmations */}
      {(() => {
        const getApprenticeName = (idOrCpf: string | null) => {
          if (!idOrCpf) return "";
          const clean = idOrCpf.trim();
          const cleanDigits = clean.replace(/\D/g, "");
          const found = savedRecords.find(r => 
            (r.id && r.id === clean) || 
            (r.cpf && r.cpf.replace(/\D/g, "") === cleanDigits)
          );
          return found ? found.nomeCompleto : "este aprendiz";
        };

        return (
          <>
            {/* Custom Confirmation Modal: Desligar/Terminate */}
            {confirmTerminateId && (
              <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-md border border-slate-150 dark:border-slate-800 flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 border border-red-100 dark:border-red-900/30 shrink-0">
                      <UserX className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Confirmar Desligamento
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                        Você está prestes a desligar o jovem aprendiz:
                      </p>
                      <p className="text-xs font-black text-red-650 dark:text-red-400 uppercase">
                        {getApprenticeName(confirmTerminateId)}
                      </p>
                      <p className="text-xs text-slate-450 dark:text-slate-500 font-medium leading-relaxed mt-2">
                        O contrato será marcado como <span className="font-bold">Inativo</span> e a data de desligamento será registrada como hoje. Esta ação pode ser revertida editando a ficha do aprendiz.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 mt-1">
                    <EmojiButton
                      iconKey="cancelar"
                      onClick={() => setConfirmTerminateId(null)}
                      size="md"
                      variant="secondary"
                      className="flex-1"
                    />
                    <EmojiButton
                      iconKey="confirmar"
                      onClick={() => executeTerminateAprendiz(confirmTerminateId)}
                      size="md"
                      variant="danger"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Custom Confirmation Modal: Deletar/Delete */}
            {confirmDeleteId && (
              <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-md border border-slate-150 dark:border-slate-800 flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-650 border border-red-100 dark:border-red-900/30 shrink-0">
                      <Trash2 className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Excluir Cadastro Permanentemente
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                        Você está prestes a deletar a ficha do jovem aprendiz:
                      </p>
                      <p className="text-xs font-black text-red-650 dark:text-red-400 uppercase">
                        {getApprenticeName(confirmDeleteId)}
                      </p>
                      <p className="text-xs text-red-600 font-bold bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-100 dark:border-red-900/20 leading-tight mt-2 uppercase">
                        ⚠️ ATENÇÃO: Esta ação é irreversível e apagará permanentemente todos os dados deste aprendiz!
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 mt-1">
                    <EmojiButton
                      iconKey="cancelar"
                      onClick={() => setConfirmDeleteId(null)}
                      size="md"
                      variant="secondary"
                      className="flex-1"
                    />
                    <EmojiButton
                      iconKey="excluir"
                      onClick={() => executeDeleteRecord(confirmDeleteId)}
                      size="md"
                      variant="danger"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
